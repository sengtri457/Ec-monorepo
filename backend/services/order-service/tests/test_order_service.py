from decimal import Decimal
from unittest.mock import patch
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.orders.models import ShippingMethod, Order, OrderItem
from apps.cart.models import Cart, CartItem

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def shipping_method(db):
    return ShippingMethod.objects.create(
        code="phnom_penh_express",
        name="Phnom Penh Express (Same Day)",
        rate_usd=Decimal("2.50"),
        estimated_delivery_days="Same day"
    )

@pytest.mark.django_db
class TestOrderService:

    def test_health_check(self, api_client):
        response = api_client.get('/health/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['service'] == 'order-service'
        assert data['status'] == 'healthy'
        assert data['database'] == 'healthy'

    def test_shipping_methods_list(self, api_client, shipping_method):
        response = api_client.get('/api/v1/orders/shipping-methods/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1
        assert data[0]['code'] == "phnom_penh_express"

    def test_cart_workflow(self, api_client):
        # Set a session key header for guest cart persistence
        api_client.credentials(HTTP_X_SESSION_KEY="guest-session-uuid-12345")

        # 1. Add item to cart
        add_payload = {
            "variant_id": 41,
            "product_title": "Cotton Polo Shirt",
            "sku": "POLO-WHT-L",
            "size": "L",
            "color": "White",
            "unit_price": "25.00",
            "quantity": 2
        }
        res = api_client.post('/api/v1/cart/items/', add_payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        cart_data = res.json()
        assert cart_data['total_items'] == 2
        assert Decimal(cart_data['subtotal']) == Decimal('50.00')
        item_id = cart_data['items'][0]['id']

        # 2. Update item quantity
        upd_res = api_client.patch(f'/api/v1/cart/items/{item_id}/', {'quantity': 3}, format='json')
        assert upd_res.status_code == status.HTTP_200_OK
        assert upd_res.json()['total_items'] == 3

        # 3. Get cart
        get_res = api_client.get('/api/v1/cart/')
        assert get_res.status_code == status.HTTP_200_OK
        assert get_res.json()['total_items'] == 3

        # 4. Delete item
        del_res = api_client.delete(f'/api/v1/cart/items/{item_id}/')
        assert del_res.status_code == status.HTTP_200_OK
        assert del_res.json()['total_items'] == 0

    @patch('apps.orders.client.ProductServiceClient.reserve_stock')
    def test_checkout_success(self, mock_reserve, api_client, shipping_method):
        mock_reserve.return_value = {"id": "11111111-2222-3333-4444-555555555555", "status": "PENDING"}

        payload = {
            "name": "Dara Chan",
            "email": "dara@example.com",
            "phone": "+85512345678",
            "city_province": "Phnom Penh",
            "khan_district": "Tuol Kouk",
            "street_address": "Street 289",
            "shipping_method": "phnom_penh_express",
            "payment_method": "KHQR",
            "items": [
                {
                    "variant_id": 10,
                    "quantity": 2,
                    "product_title": "Denim Jeans",
                    "sku": "JEANS-BLU-32",
                    "size": "32",
                    "color": "Blue",
                    "unit_price": "40.00"
                }
            ]
        }

        res = api_client.post('/api/v1/orders/checkout/', payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        order_data = res.json()['order']
        assert order_data['customer_name'] == "Dara Chan"
        assert Decimal(order_data['subtotal']) == Decimal('80.00')
        # subtotal $80 + shipping $2.50 + 10% tax ($8.00) = $90.50
        assert Decimal(order_data['total_usd']) == Decimal('90.50')
        assert order_data['status'] == 'PENDING'
        assert order_data['payment_status'] == 'UNPAID'
        assert len(order_data['items']) == 1

        mock_reserve.assert_called_once()

    @patch('apps.orders.client.ProductServiceClient.release_stock')
    @patch('apps.orders.client.ProductServiceClient.reserve_stock')
    def test_checkout_failure_triggers_reservation_release(self, mock_reserve, mock_release, api_client, shipping_method):
        mock_reserve.return_value = {"id": "99999999-8888-7777-6666-555555555555", "status": "PENDING"}
        mock_release.return_value = True

        # Intentionally force order creation to fail by patching Order.objects.create
        with patch('apps.orders.models.Order.objects.create', side_effect=Exception("Database write error")):
            payload = {
                "name": "Fail Test",
                "email": "fail@example.com",
                "phone": "+85512345678",
                "city_province": "Phnom Penh",
                "street_address": "Street 1",
                "items": [{"variant_id": 10, "quantity": 1}]
            }
            with pytest.raises(Exception):
                api_client.post('/api/v1/orders/checkout/', payload, format='json')

            # Verify compensating transaction called to release reservation!
            mock_release.assert_called_once_with("99999999-8888-7777-6666-555555555555")

    @patch('apps.orders.client.NotificationServiceClient.send_order_confirmation')
    def test_internal_order_status_update(self, mock_notify, api_client, shipping_method):
        mock_notify.return_value = True
        order = Order.objects.create(
            order_number="CLO-20261121-STATUS",
            customer_name="Test Customer",
            customer_email="test@example.com",
            customer_phone="012345678",
            city_province="Phnom Penh",
            street_address="Street 100",
            shipping_method=shipping_method,
            subtotal=Decimal('50.00'),
            tax=Decimal('5.00'),
            total_usd=Decimal('55.00'),
            status='PENDING',
            payment_status='UNPAID'
        )

        update_payload = {
            "status": "PROCESSING",
            "payment_status": "PAID",
            "notes": "Bakong KHQR payment verified"
        }
        # Unauthenticated request without X-Internal-Service-Key is rejected
        unauth_res = api_client.patch(f'/internal/orders/{order.id}/status/', update_payload, format='json')
        assert unauth_res.status_code == status.HTTP_403_FORBIDDEN

        # Authenticated internal request with valid key succeeds
        res = api_client.patch(
            f'/internal/orders/{order.id}/status/',
            update_payload,
            format='json',
            HTTP_X_INTERNAL_SERVICE_KEY='ec-internal-shared-secret-key-2026'
        )
        assert res.status_code == status.HTTP_200_OK
        order.refresh_from_db()
        assert order.status == 'PROCESSING'
        assert order.payment_status == 'PAID'
        assert order.status_history.count() == 1
