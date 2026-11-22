import os
import requests

ORDER_SERVICE_URL = os.environ.get('ORDER_SERVICE_URL', 'http://order-service:8000')

def get_internal_headers() -> dict:
    key = os.environ.get('INTERNAL_SERVICE_KEY', 'ec-internal-shared-secret-key-2026')
    return {
        'Content-Type': 'application/json',
        'X-Internal-Service-Key': key,
    }

class OrderServiceClient:
    @classmethod
    def notify_order_paid(cls, order_id: str, payment_id: str = '', timeout: int = 5) -> bool:
        """
        Notifies Order Service that payment has succeeded.
        """
        url = f"{ORDER_SERVICE_URL.rstrip('/')}/internal/orders/{order_id}/status/"
        payload = {
            "payment_status": "PAID",
            "status": "PROCESSING",
            "notes": f"Payment {payment_id} verified successfully."
        }
        try:
            response = requests.patch(url, json=payload, headers=get_internal_headers(), timeout=timeout)
            return response.status_code == 200
        except requests.RequestException:
            return False
