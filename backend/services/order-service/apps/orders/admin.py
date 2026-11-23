from django.contrib import admin
from .models import Order, OrderItem, DeliveryShipment, DeliveryTimelineEvent


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product_title', 'sku', 'size', 'color', 'unit_price', 'quantity', 'line_total')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'user_id', 'status', 'payment_status', 'total_usd', 'total_khr', 'created_at')
    list_filter = ('status', 'payment_status', 'created_at')
    search_fields = ('order_number', 'user_id', 'customer_email', 'customer_phone')
    inlines = [OrderItemInline]


class DeliveryTimelineEventInline(admin.TabularInline):
    model = DeliveryTimelineEvent
    extra = 0
    readonly_fields = ('occurred_at',)


@admin.register(DeliveryShipment)
class DeliveryShipmentAdmin(admin.ModelAdmin):
    list_display = ('tracking_number', 'order', 'status', 'courier_name', 'driver_name', 'driver_phone', 'destination_city', 'created_at')
    list_filter = ('status', 'courier_name', 'destination_city', 'created_at')
    search_fields = ('tracking_number', 'order__order_number', 'recipient_name', 'recipient_phone', 'driver_name', 'driver_phone')
    inlines = [DeliveryTimelineEventInline]


@admin.register(DeliveryTimelineEvent)
class DeliveryTimelineEventAdmin(admin.ModelAdmin):
    list_display = ('shipment', 'status', 'title', 'location', 'occurred_at')
    list_filter = ('status', 'occurred_at')
    search_fields = ('shipment__tracking_number', 'title', 'location')
