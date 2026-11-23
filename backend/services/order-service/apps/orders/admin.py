from django.contrib import admin
from .models import Order, OrderItem, DeliveryShipment, DeliveryTimelineEvent


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product_id', 'variant_id', 'product_name', 'variant_name', 'sku', 'unit_price', 'quantity', 'total_price')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'user_id', 'status', 'total_amount', 'currency', 'created_at')
    list_filter = ('status', 'currency', 'created_at')
    search_fields = ('order_number', 'user_id', 'customer_email', 'customer_phone')
    inlines = [OrderItemInline]


class DeliveryTimelineEventInline(admin.TabularInline):
    model = DeliveryTimelineEvent
    extra = 0
    readonly_fields = ('timestamp',)


@admin.register(DeliveryShipment)
class DeliveryShipmentAdmin(admin.ModelAdmin):
    list_display = ('tracking_number', 'order', 'status', 'courier_name', 'driver_name', 'driver_phone', 'destination_city', 'created_at')
    list_filter = ('status', 'courier_name', 'destination_city', 'created_at')
    search_fields = ('tracking_number', 'order__order_number', 'recipient_name', 'recipient_phone', 'driver_name', 'driver_phone')
    inlines = [DeliveryTimelineEventInline]


@admin.register(DeliveryTimelineEvent)
class DeliveryTimelineEventAdmin(admin.ModelAdmin):
    list_display = ('shipment', 'status', 'title', 'location_name', 'timestamp')
    list_filter = ('status', 'timestamp')
    search_fields = ('shipment__tracking_number', 'title', 'location_name')
