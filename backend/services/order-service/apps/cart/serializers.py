from rest_framework import serializers
from apps.cart.models import Cart, CartItem

class CartItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id',
            'variant_id',
            'product_title',
            'sku',
            'size',
            'color',
            'unit_price',
            'quantity',
            'is_selected',
            'line_total',
        ]

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_items = serializers.IntegerField(read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'user_id', 'session_key', 'total_items', 'subtotal', 'items']

class CartItemAddSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(default=1, min_value=1)
    product_title = serializers.CharField(required=False, allow_blank=True, default='')
    sku = serializers.CharField(required=False, allow_blank=True, default='')
    size = serializers.CharField(required=False, allow_blank=True, default='')
    color = serializers.CharField(required=False, allow_blank=True, default='')
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0.00)
    is_selected = serializers.BooleanField(required=False, default=True)

class CartItemUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = ['quantity', 'is_selected']
