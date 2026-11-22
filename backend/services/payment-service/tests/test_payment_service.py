import uuid
from decimal import Decimal
from unittest.mock import patch
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from apps.payments.models import Payment, PaymentTransaction

@pytest.fixture
def api_client():
    return APIClient()

@pytest.mark.django_db
class TestPaymentService:

    def test_health_check(self, api_client):
        response = api_client.get('/health/')
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['service'] == 'payment-service'
        assert data['status'] == 'healthy'
        assert data['database'] == 'healthy'

    def test_create_khqr_payment(self, api_client):
        order_uuid = str(uuid.uuid4())
        payload = {
            "order_id": order_uuid,
            "order_number": "CLO-20261121-AABBCC",
            "payment_method": "KHQR",
            "amount_usd": "45.00",
            "amount_khr": 184500
        }
        res = api_client.post('/api/v1/payments/', payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        data = res.json()
        assert data['order_id'] == order_uuid
        assert data['status'] == 'PENDING'
        assert data['payment_method'] == 'KHQR'
        assert data['khqr_payload'] != ''
        assert data['khqr_md5'] != ''
        assert data['transaction_reference'] == data['khqr_md5']

    def test_retrieve_payment_status(self, api_client):
        order_uuid = uuid.uuid4()
        payment = Payment.objects.create(
            order_id=order_uuid,
            order_number="CLO-20261121-POLL",
            payment_method="KHQR",
            amount_usd=Decimal("20.00"),
            amount_khr=82000,
            status="PENDING",
            khqr_md5="abc123md5hash"
        )
        res = api_client.get(f'/api/v1/payments/{payment.id}/status/')
        assert res.status_code == status.HTTP_200_OK
        assert res.json()['status'] == 'PENDING'
        assert res.json()['khqr_md5'] == 'abc123md5hash'

    @patch('apps.payments.client.OrderServiceClient.notify_order_paid')
    def test_verify_payment_success_and_notify_order(self, mock_notify, api_client):
        mock_notify.return_value = True
        order_uuid = uuid.uuid4()
        payment = Payment.objects.create(
            order_id=order_uuid,
            order_number="CLO-20261121-VERIFY",
            payment_method="KHQR",
            amount_usd=Decimal("30.00"),
            status="PENDING"
        )

        res = api_client.post(f'/api/v1/payments/{payment.id}/verify/', format='json')
        assert res.status_code == status.HTTP_200_OK
        assert res.json()['status'] == 'SUCCESS'

        payment.refresh_from_db()
        assert payment.status == 'COMPLETED'
        assert payment.paid_at is not None
        mock_notify.assert_called_once_with(order_id=str(order_uuid), payment_id=str(payment.id))

        # Test idempotency: second call does not re-transition
        res2 = api_client.post(f'/api/v1/payments/{payment.id}/verify/', format='json')
        assert res2.status_code == status.HTTP_200_OK
        assert 'already verified' in res2.json()['message'].lower()

    @patch('apps.payments.client.OrderServiceClient.notify_order_paid')
    def test_callback_idempotency(self, mock_notify, api_client):
        mock_notify.return_value = True
        order_uuid = uuid.uuid4()
        md5_test = "cb_test_md5_hash_999"
        payment = Payment.objects.create(
            order_id=order_uuid,
            payment_method="KHQR",
            amount_usd=Decimal("15.00"),
            status="PENDING",
            khqr_md5=md5_test,
            transaction_reference=md5_test
        )

        callback_payload = {"md5": md5_test, "status": "SUCCESS"}
        res = api_client.post('/internal/payments/callback/', callback_payload, format='json')
        assert res.status_code == status.HTTP_200_OK
        payment.refresh_from_db()
        assert payment.status == 'COMPLETED'

        # Duplicate callback test
        res_dupe = api_client.post('/internal/payments/callback/', callback_payload, format='json')
        assert res_dupe.status_code == status.HTTP_200_OK
        assert 'already processed' in res_dupe.json()['message'].lower()

    def test_khqr_generate_utility(self, api_client):
        res = api_client.post('/api/v1/payments/khqr/generate/', {
            "amount": "10.50",
            "currency": "USD",
            "bill_number": "INV-1001"
        }, format='json')
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert "qr_payload" in data
        assert "md5" in data
        assert data["currency"] == "USD"
