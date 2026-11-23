from decimal import Decimal
from django.test import TestCase
from apps.orders.models import Order, ShippingMethod, DeliveryShipment, DeliveryTimelineEvent

class DeliveryModelTestCase(TestCase):
    def setUp(self):
        self.shipping_method = ShippingMethod.objects.create(
            code="phnom_penh_express",
            name="Phnom Penh Express (Same Day)",
            rate_usd=Decimal("2.50"),
            estimated_delivery_days="Same day"
        )
        self.order = Order.objects.create(
            order_number="ORD-TEST-DEL-01",
            customer_name="Sophea Chan",
            customer_email="sophea@example.com",
            customer_phone="012345678",
            city_province="Phnom Penh",
            khan_district="Chamkarmon",
            sangkat_commune="Boeung Keng Kang I",
            street_address="St. 310, House #42",
            shipping_method=self.shipping_method,
            shipping_cost=Decimal("2.50"),
            subtotal=Decimal("50.00"),
            tax=Decimal("5.00"),
            total_usd=Decimal("57.50"),
            status="PROCESSING",
            payment_status="PAID"
        )

    def test_create_delivery_shipment_and_coordinates(self):
        shipment = DeliveryShipment.objects.create(
            order=self.order,
            tracking_number="TRK-20261123-A1B2",
            courier_name="Clothes Express Phnom Penh",
            courier_phone="+855 12 889 900",
            driver_name="Sokha V.",
            driver_phone="+855 98 765 432",
            vehicle_info="Honda Dream 125 (Motorbike)",
            status="OUT_FOR_DELIVERY",
            shipping_method_code="phnom_penh_express",
            destination_city="Phnom Penh",
            destination_address="St. 310, House #42, Boeung Keng Kang I, Chamkarmon",
            recipient_name="Sophea Chan",
            recipient_phone="012345678",
            origin_lat=Decimal("11.5761"),
            origin_lng=Decimal("104.8988"),
            dest_lat=Decimal("11.5516"),
            dest_lng=Decimal("104.9254"),
            current_lat=Decimal("11.5620"),
            current_lng=Decimal("104.9100"),
            heading=95.0,
            speed=28.5
        )
        self.assertEqual(shipment.tracking_number, "TRK-20261123-A1B2")
        self.assertEqual(float(shipment.origin_lat), 11.5761)
        self.assertEqual(float(shipment.current_lat), 11.5620)

        event = DeliveryTimelineEvent.objects.create(
            shipment=shipment,
            status="OUT_FOR_DELIVERY",
            title="Out for Delivery with Rider",
            description="Rider Sokha V. is navigating to your address.",
            location="Chamkarmon, Phnom Penh"
        )
        self.assertEqual(shipment.timeline.count(), 1)
        self.assertEqual(event.status, "OUT_FOR_DELIVERY")
