import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import User, CustomerAddress
from apps.accounts.authentication import generate_tokens_for_user

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def create_user():
    def _create_user(email="testuser@example.com", username="testuser", password="password123"):
        return User.objects.create_user(
            email=email,
            username=username,
            password=password,
            phone="+85512345678",
            telegram="@testuser"
        )
    return _create_user

@pytest.fixture
def auth_client(api_client, create_user):
    user = create_user()
    tokens = generate_tokens_for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    return api_client, user

@pytest.mark.django_db
class TestUserService:

    def test_health_check(self, api_client):
        response = api_client.get('/health/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['service'] == 'user-service'
        assert data['status'] == 'healthy'
        assert data['database'] == 'healthy'

    def test_user_registration_success(self, api_client):
        payload = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "strongpassword123",
            "phone": "+85598765432",
            "telegram": "@newuser"
        }
        response = api_client.post('/api/v1/auth/register/', payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "tokens" in data
        assert "access" in data["tokens"]
        assert "refresh" in data["tokens"]
        assert data["user"]["email"] == "newuser@example.com"
        assert User.objects.filter(email="newuser@example.com").exists()

    def test_user_registration_duplicate_email_fails(self, api_client, create_user):
        create_user(email="duplicate@example.com", username="user1")
        payload = {
            "email": "duplicate@example.com",
            "username": "user2",
            "password": "strongpassword123"
        }
        response = api_client.post('/api/v1/auth/register/', payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_user_login_success(self, api_client, create_user):
        create_user(email="login@example.com", username="loginuser", password="securepassword")
        payload = {
            "email": "login@example.com",
            "password": "securepassword"
        }
        response = api_client.post('/api/v1/auth/login/', payload, format='json')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "tokens" in data
        assert "access" in data["tokens"]
        assert data["user"]["email"] == "login@example.com"

    def test_user_login_invalid_password_fails(self, api_client, create_user):
        create_user(email="login@example.com", username="loginuser", password="securepassword")
        payload = {
            "email": "login@example.com",
            "password": "wrongpassword"
        }
        response = api_client.post('/api/v1/auth/login/', payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_token_refresh(self, api_client, create_user):
        user = create_user()
        tokens = generate_tokens_for_user(user)
        response = api_client.post('/api/v1/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.json()

    def test_get_current_user_profile(self, auth_client):
        client, user = auth_client
        response = client.get('/api/v1/users/me/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['id'] == user.id
        assert data['email'] == user.email

    def test_unauthenticated_request_rejected(self, api_client):
        response = api_client.get('/api/v1/users/me/')
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_customer_address_creation_and_listing(self, auth_client):
        client, user = auth_client
        address_payload = {
            "full_name": "Sokha Mean",
            "phone": "+85512999888",
            "city_province": "Phnom Penh",
            "khan_district": "Daun Penh",
            "sangkat_commune": "Phsar Thmey 1",
            "street_address": "Street 128, House #14",
            "landmark": "Near Central Market",
            "is_default": True
        }
        response = client.post('/api/v1/addresses/', address_payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()['full_name'] == "Sokha Mean"
        assert response.json()['is_default'] is True

        # Create a second address as default, verifying that the first address's default flag is cleared
        second_address = {
            "full_name": "Sokha Office",
            "phone": "+85512999888",
            "city_province": "Phnom Penh",
            "khan_district": "Chamkarmon",
            "street_address": "Norodom Blvd",
            "is_default": True
        }
        response2 = client.post('/api/v1/addresses/', second_address, format='json')
        assert response2.status_code == status.HTTP_201_CREATED

        # Verify address list
        list_response = client.get('/api/v1/addresses/')
        assert list_response.status_code == status.HTTP_200_OK
        results = list_response.json()['results'] if 'results' in list_response.json() else list_response.json()
        assert len(results) == 2
        # Verify only one is default
        defaults = [addr for addr in results if addr['is_default']]
        assert len(defaults) == 1
        assert defaults[0]['full_name'] == "Sokha Office"
