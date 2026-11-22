import uuid
import datetime
import secrets
from decimal import Decimal
from django.db import transaction
from django.conf import settings
from rest_framework.exceptions import ValidationError
from apps.orders.models import Order, OrderItem, ShippingMethod, OrderStatusHistory
from apps.orders.client import ProductServiceClient

class CheckoutService:
    @classmethod
    def process_checkout(cls, customer_data: dict, items_data: list, user_id=None, cart=None, skip_reservation=False) -> Order:
        if not items_data:
            raise ValidationError("Cannot checkout with an empty list of items.")

        # 1. Fetch Shipping Method
        shipping_code = customer_data.get('shipping_method', 'phnom_penh_express')
        try:
            shipping_method = ShippingMethod.objects.get(code=shipping_code, is_active=True)
        except ShippingMethod.DoesNotExist:
            shipping_method = ShippingMethod.objects.first()
            if not shipping_method:
                shipping_method = ShippingMethod.objects.create(
                    code='phnom_penh_express',
                    name='Phnom Penh Express (Same Day)',
                    rate_usd=Decimal('2.50'),
                    estimated_delivery_days='Same day'
                )

        # 2. Reserve stock in Product Service (if not explicitly skipped in mock tests)
        reservation_id = None
        if not skip_reservation:
            reserve_items = [
                {"variant_id": item['variant_id'], "quantity": item['quantity']}
                for item in items_data
            ]
            reservation_result = ProductServiceClient.reserve_stock(
                items=reserve_items,
                order_id=customer_data.get('order_number_hint', '')
            )
            reservation_id = reservation_result.get('id')

        try:
            with transaction.atomic():
                # 3. Calculate financial totals
                subtotal = Decimal('0.00')
                for item in items_data:
                    unit_price = Decimal(str(item.get('unit_price', '19.99')))
                    qty = item['quantity']
                    subtotal += (unit_price * qty)

                if shipping_method.code == 'phnom_penh_standard' or subtotal >= Decimal('100.00'):
                    shipping_cost = Decimal('0.00')
                else:
                    shipping_cost = shipping_method.rate_usd

                tax_rate = getattr(settings, 'DEFAULT_TAX_RATE', Decimal('0.10'))
                tax = (subtotal * tax_rate).quantize(Decimal('0.01'))
                total_usd = subtotal + shipping_cost + tax

                today_str = datetime.date.today().strftime('%Y%m%d')
                random_suffix = uuid.uuid4().hex[:6].upper()
                order_number = f"CLO-{today_str}-{random_suffix}"

                # 4. Create Order in order_db
                order = Order.objects.create(
                    order_number=order_number,
                    user_id=user_id,
                    guest_access_token=secrets.token_urlsafe(32),
                    stock_reservation_id=reservation_id,
                    customer_name=customer_data['name'],
                    customer_email=customer_data['email'],
                    customer_phone=customer_data['phone'],
                    customer_telegram=customer_data.get('telegram', ''),
                    city_province=customer_data.get('city_province', 'Phnom Penh'),
                    khan_district=customer_data.get('khan_district', ''),
                    sangkat_commune=customer_data.get('sangkat_commune', ''),
                    street_address=customer_data.get('street_address', ''),
                    landmark=customer_data.get('landmark', ''),
                    shipping_method=shipping_method,
                    shipping_cost=shipping_cost,
                    subtotal=subtotal,
                    tax=tax,
                    total_usd=total_usd,
                    status='PENDING',
                    payment_status='UNPAID',
                    order_notes=customer_data.get('order_notes', '')
                )

                # 5. Create OrderItem point-in-time snapshots
                for item in items_data:
                    unit_price = Decimal(str(item.get('unit_price', '19.99')))
                    qty = item['quantity']
                    line_total = unit_price * qty

                    OrderItem.objects.create(
                        order=order,
                        variant_id=item['variant_id'],
                        product_title=item.get('product_title', 'Product'),
                        sku=item.get('sku', f"SKU-{item['variant_id']}"),
                        size=item.get('size', ''),
                        color=item.get('color', ''),
                        unit_price=unit_price,
                        quantity=qty,
                        line_total=line_total
                    )

                # 6. Record status history
                OrderStatusHistory.objects.create(
                    order=order,
                    from_status='',
                    to_status='PENDING',
                    changed_by_user_id=user_id,
                    notes='Order placed via checkout'
                )

                # 7. Clear cart items if cart provided
                if cart:
                    variant_ids = [item['variant_id'] for item in items_data]
                    cart.items.filter(variant_id__in=variant_ids).delete()

                return order

        except Exception as e:
            # Compensating transaction: if order creation failed, release the reserved stock
            if reservation_id:
                ProductServiceClient.release_stock(reservation_id)
            raise e
