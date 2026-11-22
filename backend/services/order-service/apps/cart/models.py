from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import TimeStampedModel, UUIDModel

class Cart(TimeStampedModel, UUIDModel):
    user_id = models.IntegerField(null=True, blank=True, db_index=True)
    session_key = models.CharField(max_length=120, blank=True, db_index=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Cart'
        verbose_name_plural = 'Carts'
        indexes = [
            models.Index(fields=['session_key', 'is_active']),
            models.Index(fields=['user_id', 'is_active']),
        ]

    def __str__(self):
        owner = f"User {self.user_id}" if self.user_id else f"Guest ({self.session_key[:8]})"
        return f"Cart {self.id} for {owner}"

    @property
    def total_items(self) -> int:
        return sum(item.quantity for item in self.items.all())

    @property
    def selected_items(self):
        return self.items.filter(is_selected=True)

    @property
    def subtotal(self) -> Decimal:
        return sum(item.line_total for item in self.selected_items)

class CartItem(TimeStampedModel):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items'
    )
    variant_id = models.IntegerField(db_index=True)
    product_title = models.CharField(max_length=255, blank=True)
    sku = models.CharField(max_length=64, blank=True)
    size = models.CharField(max_length=30, blank=True)
    color = models.CharField(max_length=60, blank=True)
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )
    is_selected = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Cart Item'
        verbose_name_plural = 'Cart Items'
        constraints = [
            models.UniqueConstraint(
                fields=['cart', 'variant_id'],
                name='unique_cart_variant'
            ),
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1),
                name='cart_item_quantity_positive'
            ),
        ]
        indexes = [
            models.Index(fields=['cart', 'is_selected']),
        ]

    def __str__(self):
        return f"{self.quantity}x Variant {self.variant_id} ({self.sku}) in Cart {self.cart.id}"

    @property
    def line_total(self) -> Decimal:
        return self.unit_price * self.quantity
