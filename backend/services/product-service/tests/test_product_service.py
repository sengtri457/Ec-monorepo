from decimal import Decimal
import pytest
from django.db import IntegrityError
from rest_framework import status
from rest_framework.test import APIClient
from apps.catalog.models import Category, Product, ProductVariant, ProductImage
from apps.inventory.models import StockMovement, StockReservation

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def internal_api_client():
    client = APIClient()
    client.credentials(HTTP_X_INTERNAL_SERVICE_KEY='ec-internal-shared-secret-key-2026')
    return client

@pytest.fixture
def setup_catalog(db):
    cat = Category.objects.create(
        name="T-Shirts",
        slug="t-shirts",
        department="clothes",
        audience="unisex",
        description="Premium cotton shirts"
    )
    product = Product.objects.create(
        title="Essential Cotton T-Shirt",
        slug="essential-cotton-t-shirt",
        description="Everyday essential t-shirt",
        category=cat,
        base_price=Decimal("19.99"),
        department="clothes",
        audience="unisex",
        subcategory="tops"
    )
    v1 = ProductVariant.objects.create(
        product=product,
        sku="TSHIRT-BLK-M",
        size="M",
        color="Black",
        color_hex="#000000",
        stock=10,
        is_default=True
    )
    v2 = ProductVariant.objects.create(
        product=product,
        sku="TSHIRT-BLK-L",
        size="L",
        color="Black",
        color_hex="#000000",
        stock=5,
        is_default=False
    )
    ProductImage.objects.create(
        product=product,
        variant=v1,
        image_url="https://images.unsplash.com/sample.jpg",
        is_primary=True
    )
    return cat, product, v1, v2

@pytest.mark.django_db
class TestProductService:

    def test_health_check(self, api_client):
        response = api_client.get('/health/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['service'] == 'product-service'
        assert data['status'] == 'healthy'
        assert data['database'] == 'healthy'

    def test_category_list(self, api_client, setup_catalog):
        response = api_client.get('/api/v1/catalog/categories/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1
        assert data[0]['slug'] == "t-shirts"

    def test_product_list_and_detail(self, api_client, setup_catalog):
        _, product, v1, _ = setup_catalog
        # List products
        response = api_client.get('/api/v1/catalog/products/')
        assert response.status_code == status.HTTP_200_OK
        results = response.json()['results'] if 'results' in response.json() else response.json()
        assert len(results) == 1
        assert results[0]['slug'] == "essential-cotton-t-shirt"
        assert results[0]['total_stock'] == 15

        # Detail by slug
        detail_response = api_client.get(f'/api/v1/catalog/products/{product.slug}/')
        assert detail_response.status_code == status.HTTP_200_OK
        assert detail_response.json()['id'] == product.id
        assert len(detail_response.json()['variants']) == 2

    def test_product_variant_unique_constraint(self, setup_catalog):
        _, product, _, _ = setup_catalog
        with pytest.raises(IntegrityError):
            ProductVariant.objects.create(
                product=product,
                sku="TSHIRT-BLK-M-DUPE",
                size="M",
                color="Black",
                stock=2
            )

    def test_inventory_variant_stock_endpoint(self, api_client, setup_catalog):
        _, _, v1, _ = setup_catalog
        response = api_client.get(f'/api/v1/inventory/{v1.id}/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['variant_id'] == v1.id
        assert data['sku'] == v1.sku
        assert data['available_stock'] == 10

    def test_stock_reservation_success_lifecycle(self, api_client, internal_api_client, setup_catalog):
        _, _, v1, v2 = setup_catalog
        # 1. Unauthenticated request without X-Internal-Service-Key is rejected
        unauth_res = api_client.post('/internal/inventory/reservations/', {}, format='json')
        assert unauth_res.status_code == status.HTTP_403_FORBIDDEN

        # 2. Create reservation with internal client
        reservation_payload = {
            "order_id": "ORD-TEST-001",
            "items": [
                {"variant_id": v1.id, "quantity": 3},
                {"variant_id": v2.id, "quantity": 2}
            ]
        }
        res = internal_api_client.post('/internal/inventory/reservations/', reservation_payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        res_data = res.json()
        reservation_id = res_data['id']
        assert res_data['status'] == 'PENDING'

        # Check that variant stock was decremented
        v1.refresh_from_db()
        v2.refresh_from_db()
        assert v1.stock == 7  # 10 - 3
        assert v2.stock == 3  # 5 - 2

        # 3. Confirm reservation
        confirm_res = internal_api_client.post(f'/internal/inventory/reservations/{reservation_id}/confirm/')
        assert confirm_res.status_code == status.HTTP_200_OK
        assert confirm_res.json()['status'] == 'CONFIRMED'

    def test_stock_reservation_insufficient_stock_fails(self, internal_api_client, setup_catalog):
        _, _, v1, _ = setup_catalog
        reservation_payload = {
            "order_id": "ORD-TEST-FAIL",
            "items": [
                {"variant_id": v1.id, "quantity": 999}
            ]
        }
        res = internal_api_client.post('/internal/inventory/reservations/', reservation_payload, format='json')
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        v1.refresh_from_db()
        assert v1.stock == 10  # Untouched

    def test_stock_reservation_release_lifecycle(self, internal_api_client, setup_catalog):
        _, _, v1, _ = setup_catalog
        # Reserve 4 units
        res = internal_api_client.post('/internal/inventory/reservations/', {
            "order_id": "ORD-TEST-RELEASE",
            "items": [{"variant_id": v1.id, "quantity": 4}]
        }, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        res_id = res.json()['id']
        v1.refresh_from_db()
        assert v1.stock == 6

        # Release reservation
        rel_res = internal_api_client.post(f'/internal/inventory/reservations/{res_id}/release/')
        assert rel_res.status_code == status.HTTP_200_OK
        assert rel_res.json()['status'] == 'RELEASED'

        v1.refresh_from_db()
        assert v1.stock == 10  # Fully restored!

        # Second release call is idempotent
        rel_res2 = internal_api_client.post(f'/internal/inventory/reservations/{res_id}/release/')
        assert rel_res2.status_code == status.HTTP_200_OK
        v1.refresh_from_db()
        assert v1.stock == 10
