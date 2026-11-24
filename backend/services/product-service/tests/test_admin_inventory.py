import pytest
from decimal import Decimal
import datetime
from django.utils import timezone
from django.core.management import call_command
from rest_framework import status
from rest_framework.test import APIClient
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import StockMovement, StockReservation, StockReservationItem

@pytest.fixture
def api_client():
    client = APIClient()
    # Provide internal key so admin permission passes
    client.credentials(HTTP_X_INTERNAL_SERVICE_KEY="ec-internal-shared-secret-key-2026")
    return client

@pytest.mark.django_db
class TestAdminInventory:
    def test_admin_inventory_list_and_filters(self, api_client):
        cat = Category.objects.create(name="Tops", slug="tops")
        p = Product.objects.create(title="Tee", slug="tee", description="Tee", category=cat, base_price=Decimal("20.00"))
        v1 = ProductVariant.objects.create(product=p, sku="TEE-WHT-S", size="S", stock=5)
        v2 = ProductVariant.objects.create(product=p, sku="TEE-BLK-M", size="M", stock=25)

        # 1. List all
        res = api_client.get('/api/v1/inventory/admin/')
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data["count"] == 2

        # 2. Filter by status=low
        res_low = api_client.get('/api/v1/inventory/admin/?status=low')
        assert res_low.status_code == status.HTTP_200_OK
        low_data = res_low.json()
        assert low_data["count"] == 1
        assert low_data["results"][0]["sku"] == "TEE-WHT-S"

    def test_stock_adjustment_restock(self, api_client):
        cat = Category.objects.create(name="Tops", slug="tops")
        p = Product.objects.create(title="Tee", slug="tee", description="Tee", category=cat, base_price=Decimal("20.00"))
        variant = ProductVariant.objects.create(product=p, sku="TEE-WHT-L", size="L", stock=10)

        # Restock +20
        res = api_client.post(f'/api/v1/inventory/admin/{variant.id}/adjust/', {
            "quantity_change": 20,
            "movement_type": "RESTOCK",
            "notes": "Warehouse incoming batch"
        }, format='json')
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["stock"] == 30

        variant.refresh_from_db()
        assert variant.stock == 30

        # Check movement ledger
        movement = StockMovement.objects.filter(variant=variant).latest('created_at')
        assert movement.quantity_change == 20
        assert movement.movement_type == "RESTOCK"
        assert movement.balance_after == 30

    def test_stock_adjustment_prevent_negative_balance(self, api_client):
        cat = Category.objects.create(name="Tops", slug="tops")
        p = Product.objects.create(title="Tee", slug="tee", description="Tee", category=cat, base_price=Decimal("20.00"))
        variant = ProductVariant.objects.create(product=p, sku="TEE-WHT-XL", size="XL", stock=5)

        res = api_client.post(f'/api/v1/inventory/admin/{variant.id}/adjust/', {
            "quantity_change": -10,
            "movement_type": "ADJUSTMENT",
            "notes": "Damaged goods"
        }, format='json')
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in res.json()

    def test_release_expired_reservations_endpoint_and_management_command(self, api_client):
        cat = Category.objects.create(name="Tops", slug="tops-exp")
        p = Product.objects.create(title="Tee", slug="tee-exp", description="Tee", category=cat, base_price=Decimal("20.00"))
        variant = ProductVariant.objects.create(product=p, sku="TEE-EXP-1", size="M", stock=7)

        # Create an expired reservation that had deducted 3 items from stock (initial stock was 10)
        past_time = timezone.now() - datetime.timedelta(minutes=30)
        reservation = StockReservation.objects.create(
            order_id="ORD-EXPIRED-TEST",
            status="PENDING",
            expires_at=past_time
        )
        StockReservationItem.objects.create(
            reservation=reservation,
            variant=variant,
            quantity=3
        )

        # 1. Trigger via internal endpoint
        res = api_client.post('/internal/inventory/reservations/reap-expired/', {}, format='json')
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data["reaped_count"] >= 1
        assert str(reservation.id) in data["reservation_ids"]

        reservation.refresh_from_db()
        assert reservation.status == "EXPIRED"

        variant.refresh_from_db()
        assert variant.stock == 10

        # Verify movement ledger
        movement = StockMovement.objects.filter(variant=variant, movement_type="RELEASE").latest('created_at')
        assert movement.quantity_change == 3
        assert movement.balance_after == 10

    def test_release_confirmed_reservation_with_restock(self, api_client):
        cat = Category.objects.create(name="Tops", slug="tops-cnf")
        p = Product.objects.create(title="Tee", slug="tee-cnf", description="Tee", category=cat, base_price=Decimal("20.00"))
        variant = ProductVariant.objects.create(product=p, sku="TEE-CNF-1", size="L", stock=5)

        reservation = StockReservation.objects.create(
            order_id="ORD-CONFIRMED-RESTOCK",
            status="CONFIRMED",
            expires_at=timezone.now() + datetime.timedelta(hours=1)
        )
        StockReservationItem.objects.create(
            reservation=reservation,
            variant=variant,
            quantity=5
        )

        # Releasing a confirmed reservation without flag should fail
        res_fail = api_client.post(f'/internal/inventory/reservations/{reservation.id}/release/', {}, format='json')
        assert res_fail.status_code == status.HTTP_400_BAD_REQUEST

        # Releasing with allow_restock_confirmed=True succeeds and logs RETURN
        res_ok = api_client.post(f'/internal/inventory/reservations/{reservation.id}/release/', {
            "allow_restock_confirmed": True
        }, format='json')
        assert res_ok.status_code == status.HTTP_200_OK

        variant.refresh_from_db()
        assert variant.stock == 10

        movement = StockMovement.objects.filter(variant=variant, movement_type="RETURN").latest('created_at')
        assert movement.quantity_change == 5
        assert movement.balance_after == 10
