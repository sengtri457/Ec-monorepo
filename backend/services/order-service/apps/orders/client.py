import os
import requests
from django.conf import settings
from rest_framework.exceptions import ValidationError

PRODUCT_SERVICE_URL = os.environ.get('PRODUCT_SERVICE_URL', 'http://product-service:8000')
PAYMENT_SERVICE_URL = os.environ.get('PAYMENT_SERVICE_URL', 'http://payment-service:8000')
NOTIFICATION_SERVICE_URL = os.environ.get('NOTIFICATION_SERVICE_URL', 'http://notification-service:8000')

def get_internal_headers() -> dict:
    key = os.environ.get('INTERNAL_SERVICE_KEY', getattr(settings, 'INTERNAL_SERVICE_KEY', 'ec-internal-shared-secret-key-2026'))
    return {
        'Content-Type': 'application/json',
        'X-Internal-Service-Key': key,
    }

class ProductServiceClient:
    @classmethod
    def reserve_stock(cls, items: list, order_id: str = '', timeout: int = 5) -> dict:
        """
        Requests an atomic stock reservation from Product Service.
        """
        url = f"{PRODUCT_SERVICE_URL.rstrip('/')}/internal/inventory/reservations/"
        payload = {
            "order_id": order_id,
            "items": items,
            "ttl_minutes": 15
        }
        try:
            response = requests.post(url, json=payload, headers=get_internal_headers(), timeout=timeout)
            if response.status_code == 201:
                return response.json()
            error_data = response.json()
            message = error_data.get('error', {}).get('message', 'Stock reservation failed.')
            raise ValidationError(message)
        except requests.RequestException as e:
            raise ValidationError(f"Product Service unavailable: {str(e)}")

    @classmethod
    def release_stock(cls, reservation_id: str, allow_restock_confirmed: bool = True, timeout: int = 5) -> bool:
        """
        Compensating transaction: releases previously reserved stock.
        """
        url = f"{PRODUCT_SERVICE_URL.rstrip('/')}/internal/inventory/reservations/{reservation_id}/release/"
        try:
            response = requests.post(
                url,
                json={"allow_restock_confirmed": allow_restock_confirmed},
                headers=get_internal_headers(),
                timeout=timeout
            )
            return response.status_code == 200
        except requests.RequestException:
            return False

    @classmethod
    def confirm_stock(cls, reservation_id: str, timeout: int = 5) -> bool:
        """
        Confirms deduction of reserved stock.
        """
        url = f"{PRODUCT_SERVICE_URL.rstrip('/')}/internal/inventory/reservations/{reservation_id}/confirm/"
        try:
            response = requests.post(url, headers=get_internal_headers(), timeout=timeout)
            return response.status_code == 200
        except requests.RequestException:
            return False

class NotificationServiceClient:
    @classmethod
    def send_order_confirmation(cls, order, recipient=None, channel='EMAIL', timeout: int = 5) -> bool:
        """
        Dispatches order confirmation notification via Notification Service.
        """
        recipient_target = recipient or order.customer_email or order.customer_phone
        if not recipient_target:
            return False

        url = f"{NOTIFICATION_SERVICE_URL.rstrip('/')}/internal/notifications/"
        payload = {
            "user_id": order.user_id,
            "order_id": str(order.id),
            "channel": channel,
            "recipient": recipient_target,
            "subject": f"Order Confirmation - {order.order_number}",
            "message": f"Hi {order.customer_name}, your order #{order.order_number} for ${order.total_usd} has been confirmed."
        }
        try:
            response = requests.post(url, json=payload, headers=get_internal_headers(), timeout=timeout)
            return response.status_code == 201
        except requests.RequestException:
            return False
