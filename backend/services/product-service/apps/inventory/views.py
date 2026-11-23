import datetime
from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from apps.catalog.models import ProductVariant
from apps.inventory.models import StockMovement, StockReservation, StockReservationItem
from apps.inventory.serializers import (
    CreateReservationSerializer,
    StockReservationDetailSerializer,
    StockMovementSerializer,
    AdminStockAdjustmentSerializer,
    AdminInventoryItemSerializer,
)

from apps.core.permissions import IsInternalService
from apps.core.admin_permissions import IsAdminOrStaffUser

class VariantStockDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, variant_id):
        try:
            variant = ProductVariant.objects.get(id=variant_id)
        except ProductVariant.DoesNotExist:
            return Response({
                "error": {"code": "VARIANT_NOT_FOUND", "message": f"Variant with id {variant_id} does not exist."}
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "variant_id": variant.id,
            "sku": variant.sku,
            "available_stock": variant.stock,
            "is_active": variant.is_active,
            "effective_price": str(variant.effective_price),
        }, status=status.HTTP_200_OK)

class CreateStockReservationView(APIView):
    permission_classes = [IsInternalService]

    def post(self, request):
        serializer = CreateReservationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        order_id = data.get('order_id', '')
        ttl_minutes = data.get('ttl_minutes', 15)
        items_data = data['items']

        now = timezone.now()
        expires_at = now + datetime.timedelta(minutes=ttl_minutes)

        with transaction.atomic():
            # Create reservation container
            reservation = StockReservation.objects.create(
                order_id=order_id,
                status='PENDING',
                expires_at=expires_at
            )

            # Sort variant IDs to avoid deadlock
            sorted_items = sorted(items_data, key=lambda x: x['variant_id'])

            for item_spec in sorted_items:
                v_id = item_spec['variant_id']
                qty = item_spec['quantity']

                try:
                    variant = ProductVariant.objects.select_for_update().get(id=v_id)
                except ProductVariant.DoesNotExist:
                    raise ValidationError({
                        "error": {
                            "code": "VARIANT_NOT_FOUND",
                            "message": f"Variant ID {v_id} does not exist."
                        }
                    })

                if variant.stock < qty:
                    raise ValidationError({
                        "error": {
                            "code": "INSUFFICIENT_STOCK",
                            "message": f"Requested quantity {qty} exceeds available stock ({variant.stock}) for SKU '{variant.sku}'."
                        }
                    })

                # Deduct stock for reservation
                variant.stock -= qty
                variant.save(update_fields=['stock', 'updated_at'])

                # Create reservation item
                StockReservationItem.objects.create(
                    reservation=reservation,
                    variant=variant,
                    quantity=qty
                )

                # Log stock movement
                StockMovement.objects.create(
                    variant=variant,
                    quantity_change=-qty,
                    movement_type='RESERVATION',
                    reference_id=str(reservation.id),
                    balance_after=variant.stock,
                    notes=f"Reserved for order '{order_id}'"
                )

        output_serializer = StockReservationDetailSerializer(reservation)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

class ReleaseStockReservationView(APIView):
    permission_classes = [IsInternalService]

    def post(self, request, reservation_id):
        try:
            reservation = StockReservation.objects.get(id=reservation_id)
        except StockReservation.DoesNotExist:
            return Response({
                "error": {"code": "RESERVATION_NOT_FOUND", "message": "Reservation not found."}
            }, status=status.HTTP_404_NOT_FOUND)

        if reservation.status == 'RELEASED':
            # Idempotent response
            return Response(StockReservationDetailSerializer(reservation).data, status=status.HTTP_200_OK)

        if reservation.status == 'CONFIRMED':
            return Response({
                "error": {"code": "RESERVATION_ALREADY_CONFIRMED", "message": "Cannot release an already confirmed reservation."}
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            for item in reservation.items.select_related('variant').all():
                variant = ProductVariant.objects.select_for_update().get(id=item.variant_id)
                variant.stock += item.quantity
                variant.save(update_fields=['stock', 'updated_at'])

                StockMovement.objects.create(
                    variant=variant,
                    quantity_change=item.quantity,
                    movement_type='RELEASE',
                    reference_id=str(reservation.id),
                    balance_after=variant.stock,
                    notes=f"Released reservation {reservation.id}"
                )

            reservation.status = 'RELEASED'
            reservation.save(update_fields=['status', 'updated_at'])

        return Response(StockReservationDetailSerializer(reservation).data, status=status.HTTP_200_OK)

class ConfirmStockReservationView(APIView):
    permission_classes = [IsInternalService]

    def post(self, request, reservation_id):
        try:
            reservation = StockReservation.objects.get(id=reservation_id)
        except StockReservation.DoesNotExist:
            return Response({
                "error": {"code": "RESERVATION_NOT_FOUND", "message": "Reservation not found."}
            }, status=status.HTTP_404_NOT_FOUND)

        if reservation.status == 'CONFIRMED':
            return Response(StockReservationDetailSerializer(reservation).data, status=status.HTTP_200_OK)

        if reservation.status == 'RELEASED':
            return Response({
                "error": {"code": "RESERVATION_ALREADY_RELEASED", "message": "Cannot confirm a released reservation."}
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            reservation.status = 'CONFIRMED'
            reservation.save(update_fields=['status', 'updated_at'])

            for item in reservation.items.select_related('variant').all():
                StockMovement.objects.create(
                    variant=item.variant,
                    quantity_change=0,
                    movement_type='PURCHASE',
                    reference_id=str(reservation.id),
                    balance_after=item.variant.stock,
                    notes=f"Confirmed purchase for reservation {reservation.id}"
                )

        return Response(StockReservationDetailSerializer(reservation).data, status=status.HTTP_200_OK)

class AdminInventoryListView(APIView):
    permission_classes = [IsAdminOrStaffUser]

    def get(self, request):
        qs = ProductVariant.objects.select_related('product', 'product__category').filter(product__is_active=True).order_by('product__title', 'sku')

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(Q(sku__icontains=search) | Q(product__title__icontains=search))

        status_filter = request.query_params.get('status')
        if status_filter == 'low':
            qs = qs.filter(stock__gt=0, stock__lte=10)
        elif status_filter == 'out':
            qs = qs.filter(stock=0)
        elif status_filter == 'healthy':
            qs = qs.filter(stock__gt=10)

        category = request.query_params.get('category')
        if category and category != 'all':
            qs = qs.filter(product__category__slug=category)

        serializer = AdminInventoryItemSerializer(qs, many=True)
        return Response({
            "count": qs.count(),
            "results": serializer.data
        }, status=status.HTTP_200_OK)

class AdminStockAdjustmentView(APIView):
    permission_classes = [IsAdminOrStaffUser]

    def post(self, request, variant_id=None):
        serializer = AdminStockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        target_variant_id = variant_id or request.data.get('variant_id')
        if not target_variant_id:
            return Response({"error": "variant_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        qty_change = data['quantity_change']
        m_type = data['movement_type']
        ref_id = data.get('reference_id', '')
        notes = data.get('notes', '')

        with transaction.atomic():
            try:
                variant = ProductVariant.objects.select_for_update().get(id=target_variant_id)
            except ProductVariant.DoesNotExist:
                return Response({
                    "error": {"code": "VARIANT_NOT_FOUND", "message": f"Variant with id {target_variant_id} does not exist."}
                }, status=status.HTTP_404_NOT_FOUND)

            new_stock = variant.stock + qty_change
            if new_stock < 0:
                return Response({
                    "error": {
                        "code": "INVALID_STOCK_ADJUSTMENT",
                        "message": f"Adjustment of {qty_change} would result in negative stock ({new_stock}). Current stock: {variant.stock}."
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

            variant.stock = new_stock
            variant.save(update_fields=['stock', 'updated_at'])

            movement = StockMovement.objects.create(
                variant=variant,
                quantity_change=qty_change,
                movement_type=m_type,
                reference_id=ref_id,
                balance_after=new_stock,
                notes=notes
            )

        return Response({
            "variant_id": variant.id,
            "sku": variant.sku,
            "stock": variant.stock,
            "balance_after": variant.stock,
            "movement": StockMovementSerializer(movement).data,
            "message": f"Stock successfully updated to {new_stock}."
        }, status=status.HTTP_200_OK)

class AdminStockMovementListView(APIView):
    permission_classes = [IsAdminOrStaffUser]

    def get(self, request):
        qs = StockMovement.objects.select_related('variant', 'variant__product').all().order_by('-created_at')

        variant_id = request.query_params.get('variant_id')
        if variant_id:
            qs = qs.filter(variant_id=variant_id)

        sku = request.query_params.get('sku')
        if sku:
            qs = qs.filter(variant__sku__icontains=sku)

        movement_type = request.query_params.get('movement_type')
        if movement_type:
            qs = qs.filter(movement_type=movement_type)

        limit = min(int(request.query_params.get('limit', 50)), 200)
        serializer = StockMovementSerializer(qs[:limit], many=True)
        return Response({
            "count": qs.count(),
            "results": serializer.data
        }, status=status.HTTP_200_OK)

