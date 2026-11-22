import secrets
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import TimeStampedModel, UUIDModel

def generate_order_token():
    return secrets.token_urlsafe(32)

class ShippingMethod(TimeStampedModel):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=150)
    rate_usd = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    estimated_delivery_days = models.CharField(max_length=60, default='1-2 business days')
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Shipping Method'
        verbose_name_plural = 'Shipping Methods'

    def __str__(self):
        return f"{self.name} (${self.rate_usd} USD)"

class Order(TimeStampedModel, UUIDModel):
    STATUS_CHOICES = (
        ('PENDING', 'Pending Confirmation'),
        ('CONFIRMED', 'Confirmed'),
        ('PROCESSING', 'Processing'),
        ('SHIPPED', 'Out for Delivery'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    )

    PAYMENT_STATUS_CHOICES = (
        ('UNPAID', 'Unpaid'),
        ('PAID', 'Paid'),
        ('REFUNDED', 'Refunded'),
    )

    order_number = models.CharField(max_length=50, unique=True, db_index=True)
    user_id = models.IntegerField(null=True, blank=True, db_index=True)
    guest_access_token = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        default=generate_order_token,
        db_index=True
    )
    stock_reservation_id = models.UUIDField(null=True, blank=True, db_index=True)

    # Customer snapshot
    customer_name = models.CharField(max_length=150)
    customer_email = models.EmailField()
    customer_phone = models.CharField(max_length=32)
    customer_telegram = models.CharField(max_length=64, blank=True)

    # Address snapshot (Cambodia geography)
    city_province = models.CharField(max_length=100)
    khan_district = models.CharField(max_length=100, blank=True)
    sangkat_commune = models.CharField(max_length=100, blank=True)
    street_address = models.CharField(max_length=255)
    landmark = models.CharField(max_length=255, blank=True)

    # Shipping snapshot
    shipping_method = models.ForeignKey(
        ShippingMethod,
        on_delete=models.PROTECT,
        related_name='orders'
    )
    shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    # Financial snapshots
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    tax = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total_usd = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total_khr = models.BigIntegerField(default=0)
    khr_exchange_rate = models.PositiveIntegerField(default=4100)

    # Status tracking
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='PENDING')
    payment_status = models.CharField(max_length=30, choices=PAYMENT_STATUS_CHOICES, default='UNPAID')
    tracking_number = models.CharField(max_length=64, blank=True)
    order_notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Order'
        verbose_name_plural = 'Orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order_number']),
            models.Index(fields=['customer_email']),
            models.Index(fields=['status', 'payment_status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Order {self.order_number} ({self.customer_name}) - ${self.total_usd} USD"

    def calculate_total_khr(self) -> int:
        return int(round(float(self.total_usd) * self.khr_exchange_rate, -2))

    def save(self, *args, **kwargs):
        if not self.total_khr:
            self.total_khr = self.calculate_total_khr()
        if not self.guest_access_token:
            self.guest_access_token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

class OrderItem(TimeStampedModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )
    variant_id = models.IntegerField(db_index=True)

    # Point-in-time Snapshot
    product_title = models.CharField(max_length=255)
    sku = models.CharField(max_length=64)
    size = models.CharField(max_length=30, blank=True)
    color = models.CharField(max_length=60, blank=True)
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )
    line_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )

    class Meta:
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'

    def __str__(self):
        return f"{self.quantity}x {self.sku} (${self.line_total} USD)"

class OrderStatusHistory(TimeStampedModel):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='status_history'
    )
    from_status = models.CharField(max_length=30)
    to_status = models.CharField(max_length=30)
    changed_by_user_id = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Order Status History'
        verbose_name_plural = 'Order Status Histories'
        ordering = ['-created_at']
