from rest_framework import serializers
from apps.inventory.models import StockMovement, StockReservation, StockReservationItem
from apps.catalog.models import ProductVariant

class StockMovementSerializer(serializers.ModelSerializer):
    sku = serializers.CharField(source='variant.sku', read_only=True)

    class Meta:
        model = StockMovement
        fields = ['id', 'sku', 'quantity_change', 'movement_type', 'reference_id', 'balance_after', 'created_at', 'notes']

class ReservationItemInputSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

class CreateReservationSerializer(serializers.Serializer):
    order_id = serializers.CharField(required=False, allow_blank=True, default='')
    ttl_minutes = serializers.IntegerField(required=False, default=15, min_value=1, max_value=120)
    items = ReservationItemInputSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item must be provided for reservation.")
        return value

class StockReservationItemSerializer(serializers.ModelSerializer):
    variant_id = serializers.IntegerField(source='variant.id', read_only=True)
    sku = serializers.CharField(source='variant.sku', read_only=True)

    class Meta:
        model = StockReservationItem
        fields = ['variant_id', 'sku', 'quantity']

class StockReservationDetailSerializer(serializers.ModelSerializer):
    items = StockReservationItemSerializer(many=True, read_only=True)

    class Meta:
        model = StockReservation
        fields = ['id', 'order_id', 'status', 'expires_at', 'created_at', 'items']
