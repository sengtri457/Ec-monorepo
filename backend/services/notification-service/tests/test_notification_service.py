import uuid
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.notifications.models import Notification

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
class TestNotificationService:

    def test_health_check(self, api_client):
        response = api_client.get('/health/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['service'] == 'notification-service'
        assert data['status'] == 'healthy'
        assert data['database'] == 'healthy'

    def test_create_and_dispatch_notification(self, api_client):
        order_uuid = str(uuid.uuid4())
        payload = {
            "user_id": 5,
            "order_id": order_uuid,
            "channel": "TELEGRAM",
            "recipient": "@customer_telegram",
            "subject": "Order Confirmed",
            "message": "Your order has been paid and confirmed!"
        }
        res = api_client.post('/internal/notifications/', payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        data = res.json()
        assert data['recipient'] == "@customer_telegram"
        assert data['status'] == "SENT"
        assert data['sent_at'] is not None

        # Verify persisted
        assert Notification.objects.filter(id=data['id']).exists()

    def test_notification_list_and_detail(self, api_client):
        n = Notification.objects.create(
            user_id=10,
            channel="EMAIL",
            recipient="client@example.com",
            subject="Invoice Available",
            message="Please find your invoice attached.",
            status="SENT"
        )

        # List
        list_res = api_client.get(f'/api/v1/notifications/?user_id=10')
        assert list_res.status_code == status.HTTP_200_OK
        results = list_res.json()['results'] if 'results' in list_res.json() else list_res.json()
        assert len(results) == 1
        assert results[0]['id'] == str(n.id)

        # Detail
        detail_res = api_client.get(f'/api/v1/notifications/{n.id}/')
        assert detail_res.status_code == status.HTTP_200_OK
        assert detail_res.json()['recipient'] == "client@example.com"
