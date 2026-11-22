from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.db import connection, transaction
from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.payments.models import Payment, PaymentTransaction
from apps.payments.serializers import (
    CreatePaymentSerializer,
    PaymentDetailSerializer,
)
from apps.payments.khqr import generate_khqr_payload, generate_khqr_md5
from apps.payments.client import OrderServiceClient

class HealthCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        db_status = "healthy"
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as e:
            db_status = f"unhealthy: {str(e)}"

        return Response({
            "service": "payment-service",
            "status": "healthy" if db_status == "healthy" else "degraded",
            "database": db_status,
            "timestamp": timezone.now().isoformat()
        }, status=status.HTTP_200_OK if db_status == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE)

class PaymentCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CreatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        order_id = data['order_id']
        order_number = data.get('order_number', '')
        payment_method = data['payment_method']
        amount_usd = data['amount_usd']
        amount_khr = data.get('amount_khr', 0)

        with transaction.atomic():
            # 1. Reject if already paid
            completed_payment = Payment.objects.filter(
                order_id=order_id,
                status='COMPLETED'
            ).first()
            if completed_payment:
                return Response(
                    {"error": {"code": "ALREADY_PAID", "message": "Order is already paid."}},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 2. Reuse existing pending payment intent (idempotency)
            existing_pending = Payment.objects.filter(
                order_id=order_id,
                status='PENDING'
            ).first()
            if existing_pending:
                return Response(PaymentDetailSerializer(existing_pending).data, status=status.HTTP_200_OK)

            payment = Payment.objects.create(
                order_id=order_id,
                order_number=order_number,
                payment_method=payment_method,
                amount_usd=amount_usd,
                amount_khr=amount_khr,
                status='PENDING'
            )

            if payment_method == 'KHQR':
                bakong_account = getattr(settings, 'BAKONG_ACCOUNT_ID', 'clothes@abaa')
                merchant_name = getattr(settings, 'BAKONG_MERCHANT_NAME', 'Clothes Apparel Co')
                merchant_city = getattr(settings, 'BAKONG_MERCHANT_CITY', 'Phnom Penh')
                phone_number = getattr(settings, 'BAKONG_PHONE_NUMBER', '')

                payload = generate_khqr_payload(
                    bakong_account_id=bakong_account,
                    merchant_name=merchant_name,
                    merchant_city=merchant_city,
                    amount=amount_usd,
                    currency='USD',
                    bill_number=order_number or str(order_id)[:8],
                    store_label=merchant_name,
                    phone_number=phone_number
                )
                md5_hash = generate_khqr_md5(payload)
                payment.khqr_payload = payload
                payment.khqr_md5 = md5_hash
                payment.transaction_reference = md5_hash
                payment.save(update_fields=['khqr_payload', 'khqr_md5', 'transaction_reference'])

            PaymentTransaction.objects.create(
                payment=payment,
                action='PAYMENT_CREATED',
                raw_data={'method': payment_method, 'amount_usd': str(amount_usd)}
            )

        return Response(PaymentDetailSerializer(payment).data, status=status.HTTP_201_CREATED)

class PaymentDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = Payment.objects.all()
    serializer_class = PaymentDetailSerializer
    lookup_field = 'id'

class PaymentOrderByUUIDView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, order_id):
        payment = Payment.objects.filter(order_id=order_id).first()
        if not payment:
            return Response({"error": "Payment for specified order not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PaymentDetailSerializer(payment).data, status=status.HTTP_200_OK)

class PaymentVerifyView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, id):
        try:
            payment = Payment.objects.get(id=id)
        except Payment.DoesNotExist:
            return Response({"error": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)

        # Idempotency check: if already completed, return without duplicate transitions
        if payment.status == 'COMPLETED':
            return Response({
                'status': 'SUCCESS',
                'payment': PaymentDetailSerializer(payment).data,
                'message': 'Payment already verified and completed.'
            }, status=status.HTTP_200_OK)

        with transaction.atomic():
            payment.status = 'COMPLETED'
            payment.paid_at = timezone.now()
            payment.save(update_fields=['status', 'paid_at'])

            PaymentTransaction.objects.create(
                payment=payment,
                action='VERIFIED_SUCCESSFUL',
                raw_data=request.data or {'status': 'COMPLETED'}
            )

        # Notify Order Service asynchronously / synchronously through REST
        OrderServiceClient.notify_order_paid(
            order_id=str(payment.order_id),
            payment_id=str(payment.id)
        )

        return Response({
            'status': 'SUCCESS',
            'payment': PaymentDetailSerializer(payment).data,
            'message': 'Payment verified and Order Service notified.'
        }, status=status.HTTP_200_OK)

class PaymentCallbackView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        md5_hash = request.data.get('md5') or request.data.get('khqr_md5') or request.data.get('transaction_reference')
        if not md5_hash:
            return Response({"error": "Missing md5 or transaction_reference in callback."}, status=status.HTTP_400_BAD_REQUEST)

        payment = Payment.objects.filter(transaction_reference=md5_hash).first()
        if not payment:
            payment = Payment.objects.filter(khqr_md5=md5_hash).first()

        if not payment:
            return Response({"error": "No matching payment record found."}, status=status.HTTP_404_NOT_FOUND)

        if payment.status == 'COMPLETED':
            return Response({"status": "SUCCESS", "message": "Callback already processed (idempotent)."}, status=status.HTTP_200_OK)

        payment.status = 'COMPLETED'
        payment.paid_at = timezone.now()
        payment.save(update_fields=['status', 'paid_at'])

        PaymentTransaction.objects.create(
            payment=payment,
            action='CALLBACK_VERIFIED',
            raw_data=request.data
        )

        OrderServiceClient.notify_order_paid(str(payment.order_id), str(payment.id))

        return Response({"status": "SUCCESS", "message": "Callback processed."}, status=status.HTTP_200_OK)

class KHQRGenerateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        amount = request.data.get('amount')
        currency = request.data.get('currency', 'USD').upper()
        bill_number = request.data.get('bill_number', 'TEST-BILL')

        if not amount:
            return Response({'error': 'Amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        bakong_account = getattr(settings, 'BAKONG_ACCOUNT_ID', 'clothes@abaa')
        merchant_name = getattr(settings, 'BAKONG_MERCHANT_NAME', 'Clothes Apparel Co')
        merchant_city = getattr(settings, 'BAKONG_MERCHANT_CITY', 'Phnom Penh')

        payload = generate_khqr_payload(
            bakong_account_id=bakong_account,
            merchant_name=merchant_name,
            merchant_city=merchant_city,
            amount=Decimal(str(amount)),
            currency=currency,
            bill_number=bill_number,
            store_label=merchant_name
        )
        md5_hash = generate_khqr_md5(payload)

        return Response({
            'qr_payload': payload,
            'md5': md5_hash,
            'bakong_account': bakong_account,
            'currency': currency,
            'amount': str(amount),
        }, status=status.HTTP_200_OK)
