from rest_framework import serializers
from apps.orders.models import (
    Order,
    OrderItem,
    ShippingMethod,
    OrderStatusHistory,
    DeliveryShipment,
    DeliveryTimelineEvent,
)

class ShippingMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingMethod
        fields = ['id', 'code', 'name', 'rate_usd', 'estimated_delivery_days']

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            'id',
            'variant_id',
            'product_title',
            'sku',
            'size',
            'color',
            'unit_price',
            'quantity',
            'line_total',
        ]

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    shipping_method = ShippingMethodSerializer(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'order_number',
            'user_id',
            'guest_access_token',
            'stock_reservation_id',
            'customer_name',
            'customer_email',
            'customer_phone',
            'customer_telegram',
            'city_province',
            'khan_district',
            'sangkat_commune',
            'street_address',
            'landmark',
            'shipping_method',
            'shipping_cost',
            'subtotal',
            'tax',
            'total_usd',
            'total_khr',
            'status',
            'payment_status',
            'tracking_number',
            'order_notes',
            'items',
            'created_at',
        ]

class CheckoutItemInputSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    product_title = serializers.CharField(required=False, default='Product')
    sku = serializers.CharField(required=False, default='SKU')
    size = serializers.CharField(required=False, allow_blank=True, default='')
    color = serializers.CharField(required=False, allow_blank=True, default='')
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=19.99)

class CheckoutInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=32)
    telegram = serializers.CharField(max_length=64, required=False, allow_blank=True)
    city_province = serializers.CharField(max_length=100)
    khan_district = serializers.CharField(max_length=100, required=False, allow_blank=True)
    sangkat_commune = serializers.CharField(max_length=100, required=False, allow_blank=True)
    street_address = serializers.CharField(max_length=255)
    landmark = serializers.CharField(max_length=255, required=False, allow_blank=True)
    shipping_method = serializers.CharField(max_length=40, default='phnom_penh_express')
    payment_method = serializers.CharField(max_length=20, default='KHQR')
    order_notes = serializers.CharField(required=False, allow_blank=True)
    items = CheckoutItemInputSerializer(many=True, required=False)

class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES, required=False)
    payment_status = serializers.ChoiceField(choices=Order.PAYMENT_STATUS_CHOICES, required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    changed_by_user_id = serializers.IntegerField(required=False, allow_null=True, default=None)

class DeliveryTimelineEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryTimelineEvent
        fields = ['id', 'status', 'title', 'description', 'location', 'occurred_at']

class DeliveryShipmentSerializer(serializers.ModelSerializer):
    timeline = DeliveryTimelineEventSerializer(many=True, read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = DeliveryShipment
        fields = [
            'id',
            'order_number',
            'tracking_number',
            'courier_name',
            'courier_phone',
            'driver_name',
            'driver_phone',
            'vehicle_info',
            'status',
            'shipping_method_code',
            'destination_city',
            'destination_address',
            'recipient_name',
            'recipient_phone',
            'origin_lat',
            'origin_lng',
            'dest_lat',
            'dest_lng',
            'current_lat',
            'current_lng',
            'heading',
            'speed',
            'estimated_delivery_at',
            'dispatched_at',
            'delivered_at',
            'timeline',
            'created_at',
            'updated_at',
        ]

class AdminOrderListSerializer(serializers.ModelSerializer):
    items_count = serializers.IntegerField(source='items.count', read_only=True)
    shipping_method_name = serializers.CharField(source='shipping_method.name', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'order_number',
            'customer_name',
            'customer_email',
            'customer_phone',
            'city_province',
            'total_usd',
            'total_khr',
            'status',
            'payment_status',
            'shipping_method_name',
            'items_count',
            'created_at',
        ]

class OrderStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = ['id', 'from_status', 'to_status', 'changed_by_user_id', 'notes', 'created_at']

class AdminOrderDetailSerializer(OrderSerializer):
    shipment = DeliveryShipmentSerializer(read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ['shipment', 'status_history', 'updated_at']


