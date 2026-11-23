import pytest
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APIClient
from apps.catalog.models import Category, Product

@pytest.fixture
def api_client():
    client = APIClient()
    client.credentials(HTTP_X_INTERNAL_SERVICE_KEY="ec-internal-shared-secret-key-2026")
    return client

@pytest.mark.django_db
class TestAdminCatalog:
    def test_admin_create_product_with_variants(self, api_client):
        cat = Category.objects.create(name="Shorts", slug="shorts")
        payload = {
            "title": "Chino Shorts",
            "description": "Tailored chino shorts",
            "category_id": cat.id,
            "department": "clothes",
            "audience": "men",
            "base_price": "29.99",
            "variants": [
                {"sku": "CS-BEI-30", "size": "30", "color": "Beige", "stock": 20},
                {"sku": "CS-NAV-32", "size": "32", "color": "Navy", "stock": 15}
            ]
        }
        res = api_client.post('/api/v1/catalog/admin/products/', payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        data = res.json()
        assert data["slug"] == "chino-shorts"
        assert len(data["variants"]) == 2
        assert Product.objects.filter(slug="chino-shorts").exists()
        p = Product.objects.get(slug="chino-shorts")
        assert p.variants.count() == 2

    def test_admin_update_product(self, api_client):
        cat = Category.objects.create(name="Pants", slug="pants")
        p = Product.objects.create(title="Jeans", slug="jeans", description="Blue jeans", category=cat, base_price=Decimal("40.00"))

        res = api_client.patch(f'/api/v1/catalog/admin/products/{p.id}/', {
            "title": "Slim Fit Jeans",
            "base_price": "45.00"
        }, format='json')
        assert res.status_code == status.HTTP_200_OK
        p.refresh_from_db()
        assert p.title == "Slim Fit Jeans"
        assert p.base_price == Decimal("45.00")
