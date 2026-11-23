from django.db.models import Q
from rest_framework import status, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
from django.utils import timezone
from apps.orders.models import (
    Order,
    ShippingMethod,
    OrderStatusHistory,
    DeliveryShipment,
    DeliveryTimelineEvent,
)
from apps.orders.serializers import (
    OrderSerializer,
    ShippingMethodSerializer,
    CheckoutInputSerializer,
    OrderStatusUpdateSerializer,
    DeliveryShipmentSerializer,
)
from apps.orders.services import CheckoutService
from apps.orders.client import ProductServiceClient, NotificationServiceClient
from apps.cart.views import get_or_create_cart, get_current_user_id

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
            "service": "order-service",
            "status": "healthy" if db_status == "healthy" else "degraded",
            "database": db_status,
            "timestamp": timezone.now().isoformat()
        }, status=status.HTTP_200_OK if db_status == "healthy" else status.HTTP_503_SERVICE_UNAVAILABLE)

class ShippingMethodListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = ShippingMethod.objects.filter(is_active=True)
    serializer_class = ShippingMethodSerializer
    pagination_class = None

class CheckoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CheckoutInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer_data = serializer.validated_data

        user_id = get_current_user_id(request)
        cart = None
        items_data = customer_data.get('items')

        if not items_data:
            cart = get_or_create_cart(request)
            selected_items = cart.items.filter(is_selected=True)
            if not selected_items.exists():
                return Response(
                    {"error": {"code": "EMPTY_CART", "message": "No selected items in bag to checkout."}},
                    status=status.HTTP_400_BAD_REQUEST
                )
            items_data = [
                {
                    'variant_id': ci.variant_id,
                    'quantity': ci.quantity,
                    'product_title': ci.product_title,
                    'sku': ci.sku,
                    'size': ci.size,
                    'color': ci.color,
                    'unit_price': ci.unit_price,
                }
                for ci in selected_items
            ]

        # In testing or local environment, skip_reservation can be passed via header
        skip_reservation = request.headers.get('X-Skip-Stock-Reservation', '').lower() == 'true'

        order = CheckoutService.process_checkout(
            customer_data=customer_data,
            items_data=items_data,
            user_id=user_id,
            cart=cart,
            skip_reservation=skip_reservation
        )

        response_data = {
            'order': OrderSerializer(order).data,
            'guest_access_token': order.guest_access_token,
            'message': 'Order created successfully.'
        }
        return Response(response_data, status=status.HTTP_201_CREATED)

class OrderListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = OrderSerializer

    def get_queryset(self):
        user_id = get_current_user_id(self.request)
        if user_id:
            return Order.objects.filter(user_id=user_id).prefetch_related('items')
        return Order.objects.none()

class OrderDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = OrderSerializer
    lookup_field = 'order_number'

    def get_queryset(self):
        user_id = get_current_user_id(self.request)
        token = (
            self.request.headers.get('X-Order-Token') or
            self.request.query_params.get('token') or
            self.request.headers.get('X-Session-Key')
        )

        # Authenticated users can retrieve their own orders (or orders matching token)
        if user_id:
            query = Q(user_id=user_id)
            if token:
                query |= Q(guest_access_token=token)
            return Order.objects.filter(query).prefetch_related('items')

        # Unauthenticated / guest users MUST supply the cryptographic guest_access_token
        if token:
            return Order.objects.filter(guest_access_token=token).prefetch_related('items')

        # Prevent enumeration / IDOR: unauthenticated requests without token get empty queryset -> 404
        return Order.objects.none()

from apps.core.permissions import IsInternalService

class InternalOrderStatusUpdateView(APIView):
    permission_classes = [IsInternalService]

    def patch(self, request, order_id):
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = OrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        old_status = order.status
        old_payment_status = order.payment_status

        if 'status' in data:
            order.status = data['status']
        if 'payment_status' in data:
            order.payment_status = data['payment_status']

        order.save(update_fields=['status', 'payment_status', 'updated_at'])

        if 'status' in data and data['status'] != old_status:
            OrderStatusHistory.objects.create(
                order=order,
                from_status=old_status,
                to_status=data['status'],
                changed_by_user_id=data.get('changed_by_user_id'),
                notes=data.get('notes', 'Internal service status update')
            )

        # On successful payment, confirm stock deduction, provision delivery shipment, and dispatch customer notification
        if order.payment_status == 'PAID' and old_payment_status != 'PAID':
            if order.stock_reservation_id:
                ProductServiceClient.confirm_stock(str(order.stock_reservation_id))
            
            from apps.orders.fulfillment import FulfillmentService
            FulfillmentService.create_shipment_for_order(order)

            NotificationServiceClient.send_order_confirmation(order)

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

class PublicDeliveryTrackingView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, tracking_number):
        try:
            shipment = DeliveryShipment.objects.prefetch_related('timeline').get(
                tracking_number__iexact=tracking_number.strip()
            )
        except DeliveryShipment.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": f"Tracking number '{tracking_number}' not found."}},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = DeliveryShipmentSerializer(shipment)
        return Response(serializer.data, status=status.HTTP_200_OK)

class OrderDetailDeliveryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, order_number):
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Order not found."}},
                status=status.HTTP_404_NOT_FOUND
            )

        user_id = get_current_user_id(request)
        token = request.headers.get('X-Order-Token') or request.query_params.get('token')
        if not (user_id and order.user_id == user_id) and token != order.guest_access_token:
            return Response(
                {"error": {"code": "FORBIDDEN", "message": "Access denied to order delivery information."}},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            shipment = order.shipment
        except DeliveryShipment.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_DISPATCHED", "message": "Fulfillment not yet created for this order."}},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(DeliveryShipmentSerializer(shipment).data, status=status.HTTP_200_OK)

class RiderLocationUpdateView(APIView):
    permission_classes = [permissions.AllowAny]

    def patch(self, request, tracking_number):
        try:
            shipment = DeliveryShipment.objects.get(tracking_number__iexact=tracking_number.strip())
        except DeliveryShipment.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Shipment not found."}},
                status=status.HTTP_404_NOT_FOUND
            )

        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        heading = request.data.get('heading')
        speed = request.data.get('speed')

        if lat is None or lng is None:
            return Response({"error": "Latitude and longitude required."}, status=status.HTTP_400_BAD_REQUEST)

        shipment.current_lat = lat
        shipment.current_lng = lng
        if heading is not None:
            shipment.heading = heading
        if speed is not None:
            shipment.speed = speed

        # Transition status to OUT_FOR_DELIVERY if first live location ping
        if shipment.status in ['PENDING_DISPATCH', 'PACKED', 'PICKED_UP']:
            shipment.status = 'OUT_FOR_DELIVERY'
            shipment.order.status = 'SHIPPED'
            shipment.order.save(update_fields=['status', 'updated_at'])
            DeliveryTimelineEvent.objects.create(
                shipment=shipment,
                status='OUT_FOR_DELIVERY',
                title='Courier En Route with Live GPS',
                description=f'Rider {shipment.driver_name} is navigating with live coordinates.',
                location=shipment.destination_city
            )

        shipment.save(update_fields=['current_lat', 'current_lng', 'heading', 'speed', 'status', 'updated_at'])
        return Response(DeliveryShipmentSerializer(shipment).data, status=status.HTTP_200_OK)

class InternalShipmentStatusUpdateView(APIView):
    permission_classes = [IsInternalService]

    def patch(self, request, tracking_number):
        try:
            shipment = DeliveryShipment.objects.get(tracking_number__iexact=tracking_number.strip())
        except DeliveryShipment.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Shipment not found."}},
                status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get('status')
        if not new_status or new_status not in dict(DeliveryShipment.STATUS_CHOICES):
            return Response(
                {"error": {"code": "INVALID_STATUS", "message": "Invalid shipment status."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        shipment.status = new_status
        now = timezone.now()
        if new_status == 'DELIVERED':
            shipment.delivered_at = now
            shipment.order.status = 'DELIVERED'
            shipment.order.save(update_fields=['status', 'updated_at'])
        elif new_status == 'OUT_FOR_DELIVERY':
            shipment.order.status = 'SHIPPED'
            shipment.order.save(update_fields=['status', 'updated_at'])

        shipment.save(update_fields=['status', 'delivered_at', 'updated_at'])

        title = request.data.get('title') or f"Status updated to {new_status}"
        description = request.data.get('description', '')
        location = request.data.get('location', '')

        DeliveryTimelineEvent.objects.create(
            shipment=shipment,
            status=new_status,
            title=title,
            description=description,
            location=location,
            occurred_at=now
        )

        return Response(DeliveryShipmentSerializer(shipment).data, status=status.HTTP_200_OK)

