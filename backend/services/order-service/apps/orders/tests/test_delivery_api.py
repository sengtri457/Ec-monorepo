from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.orders.models import Order, ShippingMethod
from apps.orders.fulfillment import FulfillmentService

class DeliveryAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.shipping_method = ShippingMethod.objects.create(
            code="phnom_penh_express",
            name="Phnom Penh Express (Same Day)",
            rate_usd=Decimal("2.50")
        )
        self.order = Order.objects.create(
            order_number="ORD-API-TEST-01",
            customer_name="Kosal Meng",
            customer_email="kosal@example.com",
            customer_phone="011223344",
            city_province="Phnom Penh",
            street_address="St. 51, BKK1",
            shipping_method=self.shipping_method,
            shipping_cost=Decimal("2.50"),
            subtotal=Decimal("30.00"),
            tax=Decimal("3.00"),
            total_usd=Decimal("35.50"),
            status="PROCESSING",
            payment_status="PAID"
        )
        self.shipment = FulfillmentService.create_shipment_for_order(self.order)

    def test_public_tracking_endpoint(self):
        url = f"/api/v1/orders/tracking/{self.shipment.tracking_number}/"
        res = self.client.get(url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertEqual(data['tracking_number'], self.shipment.tracking_number)
        self.assertIsNotNone(data['origin_lat'])
        self.assertIsNotNone(data['dest_lat'])

    def test_rider_location_stream(self):
        url = f"/api/v1/orders/tracking/{self.shipment.tracking_number}/location/"
        payload = {
            'latitude': 11.5620,
            'longitude': 104.9100,
            'heading': 120.0,
            'speed': 35.0
        }
        res = self.client.patch(url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.shipment.refresh_from_db()
        self.assertEqual(float(self.shipment.current_lat), 11.5620)
        self.assertEqual(self.shipment.status, "OUT_FOR_DELIVERY")
