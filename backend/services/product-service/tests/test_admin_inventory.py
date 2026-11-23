import pytest
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APIClient
from apps.catalog.models import Category, Product, ProductVariant
from apps.inventory.models import StockMovement

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
