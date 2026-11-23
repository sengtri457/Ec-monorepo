import secrets
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from apps.orders.models import Order, DeliveryShipment, DeliveryTimelineEvent

# Cambodia Geographic Lookup Dictionary (adapted from Bus-express_admin)
CAMBODIA_COORDINATES = {
    # Phnom Penh Khans & Major Districts
    "toul kork": (11.5761, 104.8988),
    "chamkarmon": (11.5422, 104.9282),
    "daun penh": (11.5723, 104.9254),
    "boeung keng kang": (11.5516, 104.9254),
    "sen sok": (11.5833, 104.8667),
    "mean chey": (11.5200, 104.9100),
    "chbar ampov": (11.5167, 104.9500),
    "russei keo": (11.6167, 104.9000),
    "phnom penh": (11.5564, 104.9282),

    # 24 Cambodian Provinces
    "siem reap": (13.3633, 103.8564),
    "battambang": (13.0957, 103.2022),
    "sihanoukville": (10.6096, 103.5292),
    "kampot": (10.5942, 104.1814),
    "takeo": (10.9904, 104.7845),
    "poipet": (13.6561, 102.5630),
    "kampong cham": (11.9934, 105.4645),
    "kampong chhnang": (12.2500, 104.6667),
    "kampong speu": (11.4533, 104.5208),
    "kampong thom": (12.7111, 104.8883),
    "kandal": (11.4833, 104.9500),
    "kep": (10.4833, 104.3167),
    "koh kong": (11.6153, 102.9838),
    "kratie": (12.4833, 106.0167),
    "mondulkiri": (12.4500, 107.2000),
    "oddar meanchey": (14.1750, 103.5167),
    "pailin": (12.8489, 102.6092),
    "preah vihear": (13.8000, 104.9667),
    "prey veng": (11.4833, 105.3333),
    "pursat": (12.5333, 103.9167),
    "ratanakiri": (13.7333, 107.0000),
    "stung treng": (13.5250, 105.9667),
    "svay rieng": (11.0833, 105.8000),
    "tboung khmum": (11.9167, 105.6667),
}

class FulfillmentService:
    @classmethod
    def resolve_destination_coordinates(cls, order: Order) -> tuple[float, float]:
        # 1. Match specific Khan in Phnom Penh if present
        if order.khan_district:
            k = order.khan_district.strip().lower()
            if k in CAMBODIA_COORDINATES:
                return CAMBODIA_COORDINATES[k]
            # Partial match inside district name
            for key, coords in CAMBODIA_COORDINATES.items():
                if key in k:
                    return coords

        # 2. Match City/Province
        c = order.city_province.strip().lower()
        if c in CAMBODIA_COORDINATES:
            return CAMBODIA_COORDINATES[c]
        for key, coords in CAMBODIA_COORDINATES.items():
            if key in c:
                return coords

        # Default to Central Phnom Penh coordinates
        return (11.5564, 104.9282)

    @classmethod
    def generate_tracking_number(cls, order: Order) -> str:
        date_str = timezone.now().strftime("%Y%m%d")
        random_suffix = secrets.token_hex(2).upper()
        return f"KH-{date_str}-{random_suffix}"

    @classmethod
    def create_shipment_for_order(cls, order: Order) -> DeliveryShipment:
        try:
            return order.shipment
        except DeliveryShipment.DoesNotExist:
            pass

        tracking_num = cls.generate_tracking_number(order)
        method_code = order.shipping_method.code if order.shipping_method else "phnom_penh_express"

        now = timezone.now()
        origin_lat, origin_lng = (11.5761, 104.8988) # Clothes Toul Kork Boutique & Central Hub
        dest_lat, dest_lng = cls.resolve_destination_coordinates(order)

        if method_code == "phnom_penh_express":
            courier = "Clothes Express Phnom Penh (Rider)"
            phone = "+855 12 889 900"
            driver = "Sokha V."
            driver_phone = "+855 98 765 432"
            vehicle = "Honda Dream 125 (Motorbike Courier)"
            estimate = now + timedelta(hours=3)
        elif method_code == "phnom_penh_standard":
            courier = "Clothes Standard Doorstep"
            phone = "+855 12 889 900"
            driver = "Piseth M."
            driver_phone = "+855 99 223 344"
            vehicle = "Delivery Van"
            estimate = now + timedelta(days=1)
        else:
            courier = f"Virak Buntham Logistics (VET Express) - {order.city_province}"
            phone = "+855 23 999 888"
            driver = "VET Provincial Dispatch"
            driver_phone = "+855 23 999 888"
            vehicle = "Provincial Cargo Truck"
            estimate = now + timedelta(days=2)

        address_parts = [
            order.street_address,
            f"Sangkat {order.sangkat_commune}" if order.sangkat_commune else "",
            f"Khan {order.khan_district}" if order.khan_district else "",
            order.city_province
        ]
        full_address = ", ".join([p for p in address_parts if p])

        shipment = DeliveryShipment.objects.create(
            order=order,
            tracking_number=tracking_num,
            courier_name=courier,
            courier_phone=phone,
            driver_name=driver,
            driver_phone=driver_phone,
            vehicle_info=vehicle,
            status="PACKED",
            shipping_method_code=method_code,
            destination_city=order.city_province,
            destination_address=full_address,
            recipient_name=order.customer_name,
            recipient_phone=order.customer_phone,
            origin_lat=Decimal(str(origin_lat)),
            origin_lng=Decimal(str(origin_lng)),
            dest_lat=Decimal(str(dest_lat)),
            dest_lng=Decimal(str(dest_lng)),
            current_lat=Decimal(str(origin_lat)),
            current_lng=Decimal(str(origin_lng)),
            estimated_delivery_at=estimate,
            dispatched_at=now
        )

        order.tracking_number = tracking_num
        order.save(update_fields=['tracking_number'])

        DeliveryTimelineEvent.objects.create(
            shipment=shipment,
            status="ORDER_CONFIRMED",
            title="Order Payment Confirmed",
            description=f"Payment verified via KHQR. Order {order.order_number} queued for immediate packing.",
            location="Phnom Penh Digital Clearing",
            occurred_at=now - timedelta(minutes=5)
        )

        DeliveryTimelineEvent.objects.create(
            shipment=shipment,
            status="PACKED",
            title="Garments Inspected & Packaged",
            description=f"Apparel items carefully sealed in eco-friendly garment bag with tracking code {tracking_num}.",
            location="Toul Kork Central Fulfillment Hub, Phnom Penh",
            occurred_at=now
        )

        return shipment
