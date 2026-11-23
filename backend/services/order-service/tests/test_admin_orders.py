import pytest
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APIClient
from apps.orders.models import Order, ShippingMethod

@pytest.fixture
def api_client():
    client = APIClient()
    client.credentials(HTTP_X_INTERNAL_SERVICE_KEY="ec-internal-shared-secret-key-2026")
    return client

@pytest.fixture
def shipping_method():
    return ShippingMethod.objects.create(
        code="phnom_penh_express",
        name="Phnom Penh Express",
        rate_usd=Decimal("2.50")
    )

@pytest.mark.django_db
class TestAdminOrders:
    def test_admin_list_orders_and_filters(self, api_client, shipping_method):
        o1 = Order.objects.create(
            order_number="ORD-TEST-001",
            customer_name="Sophea Chan",
            customer_email="sophea@example.com",
            customer_phone="012889900",
            city_province="Phnom Penh",
            street_address="St 310",
            shipping_method=shipping_method,
            subtotal=Decimal("47.50"),
            shipping_cost=Decimal("2.50"),
            tax=Decimal("0.00"),
            total_usd=Decimal("50.00"),
            status="PENDING",
            payment_status="PAID"
        )
        o2 = Order.objects.create(
            order_number="ORD-TEST-002",
            customer_name="Vireak Roth",
            customer_email="vireak@example.com",
            customer_phone="098554433",
            city_province="Siem Reap",
            street_address="St 07",
            shipping_method=shipping_method,
            subtotal=Decimal("72.50"),
            shipping_cost=Decimal("2.50"),
            tax=Decimal("0.00"),
            total_usd=Decimal("75.00"),
            status="SHIPPED",
            payment_status="PAID"
        )

        # 1. All orders
        res = api_client.get('/api/v1/orders/admin/')
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data["count"] == 2

        # 2. Filter by status
        res_pending = api_client.get('/api/v1/orders/admin/?status=PENDING')
        assert res_pending.status_code == status.HTTP_200_OK
        assert res_pending.json()["count"] == 1
        assert res_pending.json()["results"][0]["order_number"] == "ORD-TEST-001"

        # 3. Search by customer
        res_search = api_client.get('/api/v1/orders/admin/?search=Vireak')
        assert res_search.status_code == status.HTTP_200_OK
        assert res_search.json()["count"] == 1
        assert res_search.json()["results"][0]["order_number"] == "ORD-TEST-002"

    def test_admin_order_detail_and_status_update(self, api_client, shipping_method):
        order = Order.objects.create(
            order_number="ORD-TEST-003",
            customer_name="Dara Sok",
            customer_email="dara@example.com",
            customer_phone="012333444",
            city_province="Phnom Penh",
            street_address="St 271",
            shipping_method=shipping_method,
            subtotal=Decimal("58.00"),
            shipping_cost=Decimal("2.00"),
            tax=Decimal("0.00"),
            total_usd=Decimal("60.00"),
            status="PENDING",
            payment_status="UNPAID"
        )

        # Retrieve detail
        detail_res = api_client.get(f'/api/v1/orders/admin/{order.order_number}/')
        assert detail_res.status_code == status.HTTP_200_OK
        assert detail_res.json()["order_number"] == "ORD-TEST-003"

        # Update status to PROCESSING
        patch_res = api_client.patch(f'/api/v1/orders/admin/{order.order_number}/status/', {
            "status": "PROCESSING",
            "notes": "Verified and packed by warehouse staff"
        }, format='json')
        assert patch_res.status_code == status.HTTP_200_OK
        assert patch_res.json()["status"] == "PROCESSING"

        order.refresh_from_db()
        assert order.status == "PROCESSING"
        assert order.status_history.count() == 1
        assert order.status_history.first().to_status == "PROCESSING"

    def test_admin_dashboard_stats(self, api_client, shipping_method):
        Order.objects.create(
            order_number="ORD-TEST-STATS-1",
            customer_name="Test Customer",
            customer_email="tc@example.com",
            customer_phone="012111222",
            city_province="Phnom Penh",
            street_address="St 1",
            shipping_method=shipping_method,
            subtotal=Decimal("98.00"),
            shipping_cost=Decimal("2.00"),
            tax=Decimal("0.00"),
            total_usd=Decimal("100.00"),
            status="CONFIRMED",
            payment_status="PAID"
        )

        res = api_client.get('/api/v1/orders/admin/stats/')
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert "total_revenue" in data
        assert "total_orders" in data
        assert "pending_fulfillment_count" in data
        assert data["total_revenue"] >= 100.0
