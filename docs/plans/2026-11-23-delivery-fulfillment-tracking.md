# Delivery & Fulfillment Tracking with Live Maps Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Integrate a real-time post-payment Delivery & Fulfillment Tracking system powered by the lightweight `Bus-express_admin` map architecture (Leaflet, Carto Voyager tiles, OSRM road routing, Cambodia coordinates dictionary, and browser-based GPS rider streaming) directly into the Next.js frontend and Order Service backend.

**Architecture:** Event-driven fulfillment where Order Service automatically provisions a `DeliveryShipment` with Cambodia geocoordinates (central warehouse origin, customer destination, tracking number) upon payment confirmation (`PAID`). Next.js App Router renders an interactive Leaflet map tracing the exact road geometry using an OSRM Server Action, while a lightweight web-based mobile rider page allows delivery drivers to stream their live smartphone GPS coordinates to update the customer's map in real time.

**Tech Stack:** Django REST Framework, PostgreSQL, Next.js 16 (App Router), React 19, Leaflet, Carto Voyager OpenStreetMap tiles, Project-OSRM Routing API, TypeScript, Tailwind CSS, Turborepo monorepo packages (`@ec/types`).

---

### Task 1: Delivery & Fulfillment Data Layer with Geolocation in Order Service

**Files:**
- Modify: `backend/services/order-service/apps/orders/models.py`
- Create: `backend/services/order-service/apps/orders/migrations/0003_delivery_shipment_models.py`
- Modify: `backend/services/order-service/apps/orders/serializers.py`
- Create: `backend/services/order-service/apps/orders/tests/test_delivery_models.py`

**Step 1: Write the failing unit test for DeliveryShipment models**

Create `backend/services/order-service/apps/orders/tests/test_delivery_models.py`:
```python
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
            origin_lat=11.5761,
            origin_lng=104.8988,
            dest_lat=11.5516,
            dest_lng=104.9254,
            current_lat=11.5620,
            current_lng=104.9100,
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
```

**Step 2: Run test to verify it fails**

Run: `docker exec ec-order-service python manage.py test apps.orders.tests.test_delivery_models`
Expected: FAIL with `ImportError: cannot import name 'DeliveryShipment' from 'apps.orders.models'`.

**Step 3: Implement DeliveryShipment & DeliveryTimelineEvent in models.py and add serializers**

1. Modify `backend/services/order-service/apps/orders/models.py`:
Add `DeliveryShipment` (with geolocation fields) and `DeliveryTimelineEvent`:
```python
class DeliveryShipment(TimeStampedModel, UUIDModel):
    STATUS_CHOICES = (
        ('PENDING_DISPATCH', 'Pending Dispatch'),
        ('PACKED', 'Packed & Ready'),
        ('PICKED_UP', 'Picked Up by Courier'),
        ('OUT_FOR_DELIVERY', 'Out for Delivery'),
        ('DELIVERED', 'Delivered'),
        ('FAILED_ATTEMPT', 'Failed Delivery Attempt'),
        ('RETURNED', 'Returned to Hub'),
    )

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='shipment'
    )
    tracking_number = models.CharField(max_length=64, unique=True, db_index=True)
    courier_name = models.CharField(max_length=120, default='Clothes Express Phnom Penh')
    courier_phone = models.CharField(max_length=40, blank=True, default='+855 12 889 900')
    driver_name = models.CharField(max_length=120, blank=True)
    driver_phone = models.CharField(max_length=40, blank=True)
    vehicle_info = models.CharField(max_length=120, blank=True, default='Motorbike Courier')

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='PENDING_DISPATCH', db_index=True)
    shipping_method_code = models.CharField(max_length=40, default='phnom_penh_express')
    destination_city = models.CharField(max_length=100)
    destination_address = models.CharField(max_length=255)
    recipient_name = models.CharField(max_length=150)
    recipient_phone = models.CharField(max_length=32)

    # Coordinates for Leaflet map & OSRM road routing
    origin_lat = models.DecimalField(max_digits=9, decimal_places=6, default=11.576100) # Clothes Toul Kork Hub
    origin_lng = models.DecimalField(max_digits=9, decimal_places=6, default=104.898800)
    dest_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    dest_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    heading = models.FloatField(null=True, blank=True)
    speed = models.FloatField(null=True, blank=True)

    estimated_delivery_at = models.DateTimeField(null=True, blank=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Delivery Shipment'
        verbose_name_plural = 'Delivery Shipments'
        ordering = ['-created_at']

    def __str__(self):
        return f"Shipment {self.tracking_number} ({self.status}) for Order {self.order.order_number}"

class DeliveryTimelineEvent(TimeStampedModel):
    shipment = models.ForeignKey(
        DeliveryShipment,
        on_delete=models.CASCADE,
        related_name='timeline'
    )
    status = models.CharField(max_length=30)
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=150, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Delivery Timeline Event'
        verbose_name_plural = 'Delivery Timeline Events'
        ordering = ['occurred_at']

    def __str__(self):
        return f"{self.shipment.tracking_number} - {self.status} at {self.occurred_at}"
```

2. Add serializers in `backend/services/order-service/apps/orders/serializers.py`:
```python
class DeliveryTimelineEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryTimelineEvent
        fields = ['id', 'status', 'title', 'description', 'location', 'occurred_at']

class DeliveryShipmentSerializer(serializers.ModelSerializer):
    timeline = DeliveryTimelineEventSerializer(many=True, read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True)

    class Meta:
        model = DeliveryShipment
        fields = [
            'id',
            'order_number',
            'tracking_number',
            'courier_name',
            'courier_phone',
            'driver_name',
            'driver_phone',
            'vehicle_info',
            'status',
            'shipping_method_code',
            'destination_city',
            'destination_address',
            'recipient_name',
            'recipient_phone',
            'origin_lat',
            'origin_lng',
            'dest_lat',
            'dest_lng',
            'current_lat',
            'current_lng',
            'heading',
            'speed',
            'estimated_delivery_at',
            'dispatched_at',
            'delivered_at',
            'timeline',
            'created_at',
            'updated_at',
        ]
```

3. Generate migration `backend/services/order-service/apps/orders/migrations/0003_delivery_shipment_models.py`.

**Step 4: Run migration and unit test to verify it passes**

Run:
```bash
docker exec ec-order-service python manage.py makemigrations orders
docker exec ec-order-service python manage.py migrate orders
docker exec ec-order-service python manage.py test apps.orders.tests.test_delivery_models
```
Expected: PASS (1 test, 0 failures).

**Step 5: Commit**

```bash
git add backend/services/order-service/apps/orders/models.py backend/services/order-service/apps/orders/serializers.py backend/services/order-service/apps/orders/migrations/ backend/services/order-service/apps/orders/tests/test_delivery_models.py
git commit -m "feat(order-service): add DeliveryShipment with geolocation fields and DeliveryTimelineEvent"
```

---

### Task 2: Automatic Post-Payment Fulfillment Dispatch & Cambodia Geocoding

**Files:**
- Create: `backend/services/order-service/apps/orders/fulfillment.py`
- Modify: `backend/services/order-service/apps/orders/views.py` (`InternalOrderStatusUpdateView`)
- Create: `backend/services/order-service/apps/orders/tests/test_fulfillment_dispatch.py`

**Step 1: Write failing unit test for fulfillment geocoding and dispatch**

Create `backend/services/order-service/apps/orders/tests/test_fulfillment_dispatch.py`:
```python
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
```

**Step 2: Run test to verify it fails**

Run: `docker exec ec-order-service python manage.py test apps.orders.tests.test_fulfillment_dispatch`
Expected: FAIL with `ModuleNotFoundError: No module named 'apps.orders.fulfillment'`.

**Step 3: Implement Cambodia geocoding dictionary & FulfillmentService**

Create `backend/services/order-service/apps/orders/fulfillment.py`:
```python
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
        
        # 2. Match City/Province
        c = order.city_province.strip().lower()
        if c in CAMBODIA_COORDINATES:
            return CAMBODIA_COORDINATES[c]
        
        # Default to Central Phnom Penh coordinates
        return (11.5564, 104.9282)

    @classmethod
    def generate_tracking_number(cls, order: Order) -> str:
        date_str = timezone.now().strftime("%Y%m%d")
        random_suffix = secrets.token_hex(2).upper()
        return f"KH-{date_str}-{random_suffix}"

    @classmethod
    def create_shipment_for_order(cls, order: Order) -> DeliveryShipment:
        if hasattr(order, 'shipment'):
            return order.shipment

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
```

2. In `backend/services/order-service/apps/orders/views.py`:
In `InternalOrderStatusUpdateView`:
```python
        # On successful payment, confirm stock deduction, auto-generate delivery shipment, and dispatch notification
        if order.payment_status == 'PAID' and old_payment_status != 'PAID':
            if order.stock_reservation_id:
                ProductServiceClient.confirm_stock(str(order.stock_reservation_id))
            
            from apps.orders.fulfillment import FulfillmentService
            FulfillmentService.create_shipment_for_order(order)
            
            NotificationServiceClient.send_order_confirmation(order)
```

**Step 4: Run test to verify it passes**

Run: `docker exec ec-order-service python manage.py test apps.orders.tests.test_fulfillment_dispatch`
Expected: PASS (1 test, 0 failures).

**Step 5: Commit**

```bash
git add backend/services/order-service/apps/orders/fulfillment.py backend/services/order-service/apps/orders/views.py backend/services/order-service/apps/orders/tests/test_fulfillment_dispatch.py
git commit -m "feat(order-service): implement automatic fulfillment dispatch with Cambodia coordinates lookup"
```

---

### Task 3: Public, Internal & Rider Location REST APIs in Order Service

**Files:**
- Modify: `backend/services/order-service/apps/orders/views.py`
- Modify: `backend/services/order-service/apps/orders/urls.py`
- Create: `backend/services/order-service/apps/orders/tests/test_delivery_api.py`

**Step 1: Write failing unit test for Delivery & Rider Location endpoints**

Create `backend/services/order-service/apps/orders/tests/test_delivery_api.py`:
```python
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
```

**Step 2: Run test to verify it fails**

Run: `docker exec ec-order-service python manage.py test apps.orders.tests.test_delivery_api`
Expected: FAIL with 404 Not Found.

**Step 3: Implement views in `views.py` and register routes in `urls.py`**

1. Modify `backend/services/order-service/apps/orders/views.py`:
Add:
```python
class PublicDeliveryTrackingView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, tracking_number):
        try:
            shipment = DeliveryShipment.objects.prefetch_related('timeline').get(
                tracking_number__iexact=tracking_number.strip()
            )
        except DeliveryShipment.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": f"Tracking number '{tracking_number}' not found."}},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = DeliveryShipmentSerializer(shipment)
        return Response(serializer.data, status=status.HTTP_200_OK)

class OrderDetailDeliveryView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, order_number):
        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Order not found."}},
                status=status.HTTP_404_NOT_FOUND
            )

        user_id = get_current_user_id(request)
        token = request.headers.get('X-Order-Token') or request.query_params.get('token')
        if not (user_id and order.user_id == user_id) and token != order.guest_access_token:
            return Response(
                {"error": {"code": "FORBIDDEN", "message": "Access denied to order delivery information."}},
                status=status.HTTP_403_FORBIDDEN
            )

        if not hasattr(order, 'shipment'):
            return Response(
                {"error": {"code": "NOT_DISPATCHED", "message": "Fulfillment not yet created for this order."}},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(DeliveryShipmentSerializer(order.shipment).data, status=status.HTTP_200_OK)

class RiderLocationUpdateView(APIView):
    permission_classes = [permissions.AllowAny]

    def patch(self, request, tracking_number):
        try:
            shipment = DeliveryShipment.objects.get(tracking_number__iexact=tracking_number.strip())
        except DeliveryShipment.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Shipment not found."}},
                status=status.HTTP_404_NOT_FOUND
            )

        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        heading = request.data.get('heading')
        speed = request.data.get('speed')

        if lat is None or lng is None:
            return Response({"error": "Latitude and longitude required."}, status=status.HTTP_400_BAD_REQUEST)

        shipment.current_lat = lat
        shipment.current_lng = lng
        if heading is not None:
            shipment.heading = heading
        if speed is not None:
            shipment.speed = speed

        # Transition status to OUT_FOR_DELIVERY if first live location ping
        if shipment.status in ['PENDING_DISPATCH', 'PACKED', 'PICKED_UP']:
            shipment.status = 'OUT_FOR_DELIVERY'
            shipment.order.status = 'SHIPPED'
            shipment.order.save(update_fields=['status', 'updated_at'])
            DeliveryTimelineEvent.objects.create(
                shipment=shipment,
                status='OUT_FOR_DELIVERY',
                title='Courier En Route with Live GPS',
                description=f'Rider {shipment.driver_name} is navigating with live coordinates.',
                location=shipment.destination_city
            )

        shipment.save(update_fields=['current_lat', 'current_lng', 'heading', 'speed', 'status', 'updated_at'])
        return Response(DeliveryShipmentSerializer(shipment).data, status=status.HTTP_200_OK)

class InternalShipmentStatusUpdateView(APIView):
    permission_classes = [IsInternalService]

    def patch(self, request, tracking_number):
        try:
            shipment = DeliveryShipment.objects.get(tracking_number__iexact=tracking_number.strip())
        except DeliveryShipment.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Shipment not found."}},
                status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get('status')
        if not new_status or new_status not in dict(DeliveryShipment.STATUS_CHOICES):
            return Response(
                {"error": {"code": "INVALID_STATUS", "message": "Invalid shipment status."}},
                status=status.HTTP_400_BAD_REQUEST
            )

        shipment.status = new_status
        now = timezone.now()
        if new_status == 'DELIVERED':
            shipment.delivered_at = now
            shipment.order.status = 'DELIVERED'
            shipment.order.save(update_fields=['status', 'updated_at'])
        elif new_status == 'OUT_FOR_DELIVERY':
            shipment.order.status = 'SHIPPED'
            shipment.order.save(update_fields=['status', 'updated_at'])

        shipment.save(update_fields=['status', 'delivered_at', 'updated_at'])

        title = request.data.get('title') or f"Status updated to {new_status}"
        description = request.data.get('description', '')
        location = request.data.get('location', '')

        DeliveryTimelineEvent.objects.create(
            shipment=shipment,
            status=new_status,
            title=title,
            description=description,
            location=location,
            occurred_at=now
        )

        return Response(DeliveryShipmentSerializer(shipment).data, status=status.HTTP_200_OK)
```

2. In `backend/services/order-service/apps/orders/urls.py`:
```python
    path('api/v1/orders/tracking/<str:tracking_number>/', PublicDeliveryTrackingView.as_view(), name='public-delivery-tracking'),
    path('api/v1/orders/tracking/<str:tracking_number>/location/', RiderLocationUpdateView.as_view(), name='rider-location-update'),
    path('api/v1/orders/<str:order_number>/delivery/', OrderDetailDeliveryView.as_view(), name='order-detail-delivery'),
    path('internal/orders/shipments/<str:tracking_number>/status/', InternalShipmentStatusUpdateView.as_view(), name='internal-shipment-status-update'),
```

**Step 4: Run test to verify it passes**

Run: `docker exec ec-order-service python manage.py test apps.orders.tests.test_delivery_api`
Expected: PASS (2 tests, 0 failures).

**Step 5: Commit**

```bash
git add backend/services/order-service/apps/orders/views.py backend/services/order-service/apps/orders/urls.py backend/services/order-service/apps/orders/tests/test_delivery_api.py
git commit -m "feat(order-service): add public, rider location update, and internal tracking endpoints"
```

---

### Task 4: Domain Types, Leaflet Setup & OSRM Road Route Server Action

**Files:**
- Modify: `packages/types/src/index.ts`
- Modify: `apps/web/package.json` (Install `leaflet`, `@types/leaflet`)
- Create: `apps/web/app/actions/fetch-road-route.ts`
- Modify: `apps/web/lib/api.ts`

**Step 1: Update type definitions in `packages/types/src/index.ts`**

Add `DeliveryShipment` and geolocation coordinates:
```typescript
export type DeliveryStatus =
  | "PENDING_DISPATCH"
  | "PACKED"
  | "PICKED_UP"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_ATTEMPT"
  | "RETURNED";

export type DeliveryTimelineEvent = {
  id: number;
  status: string;
  title: string;
  description: string;
  location: string;
  occurred_at: string;
};

export type DeliveryShipment = {
  id: string;
  orderNumber: string;
  trackingNumber: string;
  courierName: string;
  courierPhone: string;
  driverName?: string;
  driverPhone?: string;
  vehicleInfo?: string;
  status: DeliveryStatus;
  shippingMethodCode: string;
  destinationCity: string;
  destinationAddress: string;
  recipientName: string;
  recipientPhone: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  currentLat?: number;
  currentLng?: number;
  heading?: number;
  speed?: number;
  estimatedDeliveryAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  timeline: DeliveryTimelineEvent[];
  createdAt: string;
  updatedAt: string;
};
```

**Step 2: Install Leaflet in `apps/web`**

Run:
```bash
pnpm --filter web add leaflet
pnpm --filter web add -D @types/leaflet
```

**Step 3: Create OSRM Server Action `apps/web/app/actions/fetch-road-route.ts`**

Adapted directly from `Bus-express_admin`:
```typescript
"use server";

export async function fetchRoadRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<[number, number][]> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${originLng},${originLat};${destLng},${destLat}` +
    `?overview=full&geometries=geojson`;

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Clothes-Apparel-Cambodia/1.0" },
      signal: AbortSignal.timeout(15_000),
      next: { revalidate: 600 },
    });

    if (!resp.ok) {
      return [];
    }

    const data = await resp.json();
    if (data?.code !== "Ok") {
      return [];
    }

    const coords: [number, number][] = data?.routes?.[0]?.geometry?.coordinates ?? [];
    if (!coords.length) return [];

    // Convert OSRM [lng, lat] → [lat, lng] for Leaflet
    return coords.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
  } catch (err) {
    console.error("[fetchRoadRoute] error:", err);
    return [];
  }
}
```

**Step 4: Add API Client helpers in `apps/web/lib/api.ts`**

Add `fetchDeliveryTracking` and `updateRiderLocation`:
```typescript
export async function fetchDeliveryTracking(
  trackingNumber: string
): Promise<DeliveryShipment | null> {
  try {
    const res = await fetch(
      `${API_BASE}/orders/tracking/${encodeURIComponent(trackingNumber)}/`,
      { cache: "no-store", headers: { "Content-Type": "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      orderNumber: data.order_number,
      trackingNumber: data.tracking_number,
      courierName: data.courier_name,
      courierPhone: data.courier_phone,
      driverName: data.driver_name,
      driverPhone: data.driver_phone,
      vehicleInfo: data.vehicle_info,
      status: data.status,
      shippingMethodCode: data.shipping_method_code,
      destinationCity: data.destination_city,
      destinationAddress: data.destination_address,
      recipientName: data.recipient_name,
      recipientPhone: data.recipient_phone,
      originLat: parseFloat(data.origin_lat || "11.5761"),
      originLng: parseFloat(data.origin_lng || "104.8988"),
      destLat: parseFloat(data.dest_lat || "11.5564"),
      destLng: parseFloat(data.dest_lng || "104.9282"),
      currentLat: data.current_lat ? parseFloat(data.current_lat) : undefined,
      currentLng: data.current_lng ? parseFloat(data.current_lng) : undefined,
      heading: data.heading,
      speed: data.speed,
      estimatedDeliveryAt: data.estimated_delivery_at,
      dispatchedAt: data.dispatched_at,
      deliveredAt: data.delivered_at,
      timeline: (data.timeline || []).map((ev: any) => ({
        id: ev.id,
        status: ev.status,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        occurred_at: ev.occurred_at,
      })),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.warn("Could not fetch delivery tracking:", err);
    return null;
  }
}

export async function updateRiderLocation(
  trackingNumber: string,
  coords: { latitude: number; longitude: number; heading?: number | null; speed?: number | null }
): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_BASE}/orders/tracking/${encodeURIComponent(trackingNumber)}/location/`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
```

**Step 5: Run typecheck to verify**

Run: `pnpm --prefix apps/web run build`
Expected: Build passes with no TypeScript errors.

**Step 6: Commit**

```bash
git add packages/types/src/index.ts apps/web/package.json apps/web/app/actions/fetch-road-route.ts apps/web/lib/api.ts
git commit -m "feat(web): add leaflet, OSRM road route action, and delivery api fetchers"
```

---

### Task 5: Frontend Interactive Leaflet Map, Tracking Card & Dedicated Pages

**Files:**
- Create: `apps/web/components/delivery/DeliveryMapView.tsx`
- Create: `apps/web/components/delivery/DeliveryTimeline.tsx`
- Create: `apps/web/components/delivery/DeliveryTrackingCard.tsx`
- Modify: `apps/web/components/InvoiceClient.tsx`
- Create: `apps/web/app/tracking/[trackingNumber]/page.tsx`
- Create: `apps/web/app/tracking/page.tsx`
- Create: `apps/web/app/rider/[trackingNumber]/page.tsx`
- Modify: `apps/web/components/Footer.tsx`

**Step 1: Create `DeliveryMapView.tsx` using Leaflet & Carto Voyager tiles**

Create `apps/web/components/delivery/DeliveryMapView.tsx`:
- Carto Voyager map tiles (`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`).
- Pickup Hub Pin: Toul Kork Boutique (Green icon).
- Destination Pin: Customer Doorstep (Red teardrop icon).
- Road Route: Fetches points via `fetchRoadRoute` Server Action and renders smooth blue polyline with direction arrows (`placeArrows`).
- Rider Marker: Custom SVG motorbike/van icon that smoothly animates and updates position when `currentLat`/`currentLng` updates.
- Distance & Duration badge calculated with Haversine formula.

**Step 2: Create `DeliveryTimeline.tsx` and `DeliveryTrackingCard.tsx`**

1. `DeliveryTimeline.tsx`:
   - Clean vertical checkpoint timeline with status badges, timestamps, and location markers.
2. `DeliveryTrackingCard.tsx`:
   - Stepper: `Order Placed` &rarr; `Garments Packed` &rarr; `Out for Delivery` &rarr; `Delivered`.
   - Courier badge (Rider name, direct `tel:` call button, vehicle type).
   - "Toggle Live Map" button that expands the dynamic `DeliveryMapView` with smooth height transition.
   - Live refresh polling button (polls every 10s when active).

**Step 3: Embed DeliveryTrackingCard into `InvoiceClient.tsx`**

In `apps/web/components/InvoiceClient.tsx`:
- If `order.status` is confirmed/processing/shipped/delivered, load live shipment and render `<DeliveryTrackingCard shipment={shipment} />` directly above the printable receipt.
- Marked with `.no-print` so official printed invoices remain clean and uncluttered.

**Step 4: Create Dedicated Tracking & Rider GPS Pages**

1. `apps/web/app/tracking/page.tsx`: Search/lookup page allowing customer to enter any tracking code (`KH-20261123-XXXX`) or order number.
2. `apps/web/app/tracking/[trackingNumber]/page.tsx`: Full-page tracking portal with breadcrumbs, live map, delivery driver contact, and garment package details.
3. `apps/web/app/rider/[trackingNumber]/page.tsx`:
   - Mobile-friendly dispatch portal for delivery drivers.
   - Driver taps **"Start Delivery"** &rarr; starts `navigator.geolocation.watchPosition` with `{ enableHighAccuracy: true }` and pushes location every 5 seconds via `updateRiderLocation`.
   - One-tap buttons: "Mark Delivered", "Call Customer".

**Step 5: Add Track Delivery link in `Footer.tsx` & Verify Build**

Add link to `Footer.tsx` under Delivery & Concierge.
Run: `npm --prefix apps/web run build`
Expected: Next.js production build succeeds with 0 errors.

**Step 6: Commit**

```bash
git add apps/web/components/delivery/ apps/web/components/InvoiceClient.tsx apps/web/app/tracking/ apps/web/app/rider/ apps/web/components/Footer.tsx
git commit -m "feat(web): add interactive leaflet delivery map, tracking card, and mobile rider gps portal"
```

---

### Task 6: Full End-to-End Automated Delivery & Map Verification Suite

**Files:**
- Create: `scripts/verify_delivery_pipeline.py`

**Step 1: Write automated Python E2E verification script**

Create `scripts/verify_delivery_pipeline.py`:
1. Creates checkout order via `/api/v1/orders/checkout/`.
2. Generates & completes payment via `/api/v1/payments/{id}/verify/`.
3. Verifies `order-service` auto-creates `DeliveryShipment` with valid tracking number and initial Cambodia coordinates.
4. Verifies public tracking endpoint `/api/v1/orders/tracking/{tracking_number}/`.
5. Simulates mobile rider streaming GPS via `/api/v1/orders/tracking/{tracking_number}/location/`.
6. Checks that shipment status automatically transitions to `OUT_FOR_DELIVERY` and live coordinates are updated.
7. Advances status to `DELIVERED` via internal webhook and verifies order status transitions to `DELIVERED`.

**Step 2: Run verification script**

Run: `python scripts/verify_delivery_pipeline.py`
Expected: `>>> FULL DELIVERY PIPELINE VERIFICATION: 100% SUCCESSFUL <<<` with exit code 0.

**Step 3: Commit**

```bash
git add scripts/verify_delivery_pipeline.py
git commit -m "test: add end-to-end automated delivery and live tracking verification suite"
```
