import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.accounts.authentication import generate_tokens_for_user, decode_token

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
class TestAdminAuth:
    def test_jwt_claims_include_staff_status(self):
        admin = User.objects.create_superuser(
            email="admin@clothes.ec",
            username="ec_admin",
            password="AdminPassword123!"
        )
        customer = User.objects.create_user(
            email="customer@clothes.ec",
            username="ec_customer",
            password="CustomerPassword123!"
        )

        admin_tokens = generate_tokens_for_user(admin)
        admin_payload = decode_token(admin_tokens['access'])
        assert admin_payload.get('is_staff') is True
        assert admin_payload.get('is_superuser') is True

        customer_tokens = generate_tokens_for_user(customer)
        customer_payload = decode_token(customer_tokens['access'])
        assert customer_payload.get('is_staff') is False
        assert customer_payload.get('is_superuser') is False

    def test_admin_login_success_for_staff(self, api_client):
        admin = User.objects.create_user(
            email="staff@clothes.ec",
            username="staff_user",
            password="StaffPassword123!",
            is_staff=True
        )
        response = api_client.post('/api/v1/auth/admin/login/', {
            "email": "staff@clothes.ec",
            "password": "StaffPassword123!"
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "tokens" in data
        assert data["user"]["is_staff"] is True

    def test_admin_login_rejects_non_staff(self, api_client):
        User.objects.create_user(
            email="regular@clothes.ec",
            username="reg_user",
            password="RegularPassword123!",
            is_staff=False
        )
        response = api_client.post('/api/v1/auth/admin/login/', {
            "email": "regular@clothes.ec",
            "password": "RegularPassword123!"
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        data = response.json()
        assert "error" in data
