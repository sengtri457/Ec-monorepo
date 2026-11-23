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

class AdminStockAdjustmentSerializer(serializers.Serializer):
    quantity_change = serializers.IntegerField()
    movement_type = serializers.ChoiceField(choices=['RESTOCK', 'ADJUSTMENT', 'RETURN'], default='RESTOCK')
    reference_id = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_quantity_change(self, value):
        if value == 0:
            raise serializers.ValidationError("Quantity change cannot be zero.")
        return value

class AdminInventoryItemSerializer(serializers.ModelSerializer):
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_id = serializers.IntegerField(source='product.id', read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True)
    department = serializers.CharField(source='product.department', read_only=True)
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    thumbnail = serializers.CharField(source='product.primary_image', read_only=True)
    low_stock = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            'id', 'product_id', 'product_title', 'category_name', 'department',
            'sku', 'size', 'color', 'color_hex', 'stock', 'effective_price',
            'thumbnail', 'is_active', 'low_stock'
        ]

    def get_low_stock(self, obj):
        return obj.stock <= 10

