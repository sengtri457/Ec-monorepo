import uuid
from django.db import models
from django.utils import timezone
from apps.core.models import TimeStampedModel, UUIDModel
from apps.catalog.models import ProductVariant

class StockMovement(TimeStampedModel):
    MOVEMENT_TYPES = (
        ('PURCHASE', 'Customer Purchase'),
        ('RESTOCK', 'Inventory Restock'),
        ('RETURN', 'Order Return'),
        ('ADJUSTMENT', 'Manual Adjustment'),
        ('RESERVATION', 'Order Reservation'),
        ('RELEASE', 'Reservation Release'),
    )

    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name='stock_movements'
    )
    quantity_change = models.IntegerField()
    movement_type = models.CharField(max_length=30, choices=MOVEMENT_TYPES)
    reference_id = models.CharField(max_length=100, blank=True)
    balance_after = models.PositiveIntegerField()
    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Stock Movement'
        verbose_name_plural = 'Stock Movements'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['variant', 'created_at']),
            models.Index(fields=['reference_id']),
        ]

    def __str__(self):
        return f"{self.variant.sku} | {self.movement_type} ({self.quantity_change}) -> Balance: {self.balance_after}"

class StockReservation(TimeStampedModel, UUIDModel):
    STATUS_CHOICES = (
        ('PENDING', 'Pending Confirmation'),
        ('CONFIRMED', 'Confirmed Purchase'),
        ('RELEASED', 'Released / Cancelled'),
        ('EXPIRED', 'Expired'),
    )

    order_id = models.CharField(max_length=100, blank=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        verbose_name = 'Stock Reservation'
        verbose_name_plural = 'Stock Reservations'
        ordering = ['-created_at']

    def is_expired(self):
        return self.status == 'PENDING' and timezone.now() > self.expires_at

class StockReservationItem(TimeStampedModel):
    reservation = models.ForeignKey(
        StockReservation,
        on_delete=models.CASCADE,
        related_name='items'
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        related_name='reserved_items'
    )
    quantity = models.PositiveIntegerField()

    class Meta:
        verbose_name = 'Stock Reservation Item'
        verbose_name_plural = 'Stock Reservation Items'
