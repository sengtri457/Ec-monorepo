from decimal import Decimal
from django.test import TestCase
from apps.orders.models import Order, ShippingMethod
from apps.orders.fulfillment import FulfillmentService

class FulfillmentDispatchTestCase(TestCase):
    def setUp(self):
        self.shipping_method = ShippingMethod.objects.create(
            code="phnom_penh_express",
            name="Phnom Penh Express (Same Day)",
            rate_usd=Decimal("2.50")
        )
        self.order = Order.objects.create(
            order_number="ORD-AUTO-FULFILL-01",
            customer_name="Chan Dara",
            customer_email="dara@example.com",
            customer_phone="098765432",
            city_province="Phnom Penh",
            khan_district="Toul Kork",
            sangkat_commune="Boeung Kak 1",
            street_address="St. 289, House #15",
            shipping_method=self.shipping_method,
            shipping_cost=Decimal("2.50"),
            subtotal=Decimal("40.00"),
            tax=Decimal("4.00"),
            total_usd=Decimal("46.50"),
            status="PENDING",
            payment_status="UNPAID"
        )

    def test_auto_dispatch_with_cambodia_coordinates(self):
        shipment = FulfillmentService.create_shipment_for_order(self.order)
        self.assertIsNotNone(shipment)
        self.assertTrue(shipment.tracking_number.startswith("KH-"))
        self.assertEqual(shipment.status, "PACKED")
        self.assertIsNotNone(shipment.dest_lat)
        self.assertIsNotNone(shipment.dest_lng)
        self.assertEqual(shipment.timeline.count(), 2)

        # Idempotency: calling again returns the same shipment
        second_call = FulfillmentService.create_shipment_for_order(self.order)
        self.assertEqual(shipment.id, second_call.id)
