# API Gateway, Auth Headers & Zero-Trust Security Enhancement Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Harden the e-commerce platform perimeter and microservices by implementing edge rate-limiting and header sanitization in Nginx, eliminating order IDOR vulnerabilities in Order Service, enforcing inter-service authentication (`X-Internal-Service-Key`), and establishing a centralized frontend API client with automatic Bearer token injection.

**Architecture:** Multi-layered defense-in-depth:
1. **Perimeter Layer (Nginx Gateway):** Strips untrusted internal headers (`X-Internal-Service-Key`, `X-User-Id`), applies rate-limiting on sensitive auth and payment paths, forwards `Authorization: Bearer <token>`, and injects modern security headers (`X-Frame-Options`, `X-Content-Type-Options`).
2. **Service-to-Service Layer (Zero-Trust):** All microservices (`product`, `order`, `payment`, `notification`) enforce an `IsInternalService` permission requiring a cryptographically random `X-Internal-Service-Key` on all `/internal/*` routes.
3. **Data Protection Layer (Order Service):** Closes IDOR on `OrderDetailView` by enforcing strict ownership matching for authenticated users and cryptographically signed `guest_access_token` validation for guest checkout.
4. **Client Layer (Next.js):** Centralizes all API traffic through a unified `apiClient` that automatically attaches Bearer tokens, injects session keys, and handles 401 auth expiration gracefully.

**Tech Stack:** Nginx (Alpine), Django 5.x / Django REST Framework, PyJWT, Python `requests`, Next.js 16 (App Router / TypeScript).

---

### Task 1: Inter-Service Authentication (`X-Internal-Service-Key`)

**Files:**
- Create: `backend/services/order-service/apps/core/permissions.py`
- Create: `backend/services/product-service/apps/core/permissions.py`
- Create: `backend/services/payment-service/apps/core/permissions.py`
- Create: `backend/services/notification-service/apps/core/permissions.py`
- Modify: `backend/services/order-service/apps/orders/views.py:107-115`
- Modify: `backend/services/order-service/apps/orders/client.py:10-75`
- Modify: `backend/services/product-service/apps/inventory/views.py:35-180`
- Modify: `backend/services/payment-service/apps/payments/client.py:6-22`
- Modify: `backend/services/notification-service/apps/notifications/views.py:30-45`
- Test: `backend/services/order-service/tests/test_internal_security.py`

**Step 1: Write the failing test**
Create `backend/services/order-service/tests/test_internal_security.py`:
```python
import pytest
from rest_framework.test import APIClient
from django.conf import settings

@pytest.mark.django_db
def test_internal_order_status_update_requires_valid_internal_key():
    client = APIClient()
    url = "/internal/orders/00000000-0000-0000-0000-000000000000/status/"

    # 1. Without header -> Must be 403 Forbidden
    res_no_key = client.patch(url, {"status": "PROCESSING"}, format="json")
    assert res_no_key.status_code == 403

    # 2. With wrong key -> Must be 403 Forbidden
    res_wrong_key = client.patch(
        url,
        {"status": "PROCESSING"},
        format="json",
        HTTP_X_INTERNAL_SERVICE_KEY="invalid-secret-key"
    )
    assert res_wrong_key.status_code == 403
```

**Step 2: Run test to verify it fails**
Run: `docker exec ec-order-service pytest tests/test_internal_security.py -v`
Expected: FAIL (returns 404 or 400 because `permission_classes = [permissions.AllowAny]` currently allows any caller).

**Step 3: Implement `IsInternalService` Permission and Apply Across Services**
1. Create `apps/core/permissions.py` in each microservice:
```python
import os
from django.conf import settings
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied

class IsInternalService(BasePermission):
    """
    Restricts access strictly to internal microservices presenting the valid X-Internal-Service-Key.
    """
    def has_permission(self, request, view):
        expected_key = os.environ.get('INTERNAL_SERVICE_KEY', getattr(settings, 'INTERNAL_SERVICE_KEY', 'default-internal-secret-change-me'))
        received_key = request.headers.get('X-Internal-Service-Key')
        if not received_key or received_key != expected_key:
            raise PermissionDenied({"error": {"code": "FORBIDDEN", "message": "Invalid or missing internal service key."}})
        return True
```

2. Attach `permission_classes = [IsInternalService]` to:
   - `InternalOrderStatusUpdateView` in `order-service`
   - `CreateStockReservationView`, `ReleaseStockReservationView`, `ConfirmStockReservationView` in `product-service`
   - `CreateNotificationView` in `notification-service`

3. Update client callers (`ProductServiceClient`, `OrderServiceClient`, `NotificationServiceClient`):
```python
INTERNAL_KEY = os.environ.get('INTERNAL_SERVICE_KEY', 'default-internal-secret-change-me')

# In requests.post / requests.patch:
headers = {
    'Content-Type': 'application/json',
    'X-Internal-Service-Key': INTERNAL_KEY
}
```

**Step 4: Run test to verify it passes**
Run: `docker exec ec-order-service pytest tests/test_internal_security.py -v`
Expected: PASS with 403 Forbidden on missing/invalid keys.

---

### Task 2: Order IDOR & Customer Data Protection (`order-service`)

**Files:**
- Modify: `backend/services/order-service/apps/orders/models.py:40-60`
- Modify: `backend/services/order-service/apps/orders/services.py:45-80`
- Modify: `backend/services/order-service/apps/orders/views.py:95-106`
- Modify: `backend/services/order-service/apps/orders/serializers.py:15-45`
- Test: `backend/services/order-service/tests/test_order_idor.py`

**Step 1: Write the failing test**
Create `backend/services/order-service/tests/test_order_idor.py`:
```python
import pytest
from rest_framework.test import APIClient
from apps.orders.models import Order, ShippingMethod

@pytest.mark.django_db
def test_unauthorized_user_cannot_read_another_users_order():
    client = APIClient()
    shipping = ShippingMethod.objects.create(code="std", name="Standard", rate_usd=0)
    order = Order.objects.create(
        order_number="CLO-TEST-IDOR-01",
        user_id=42,  # Owned by User 42
        customer_name="Secret User",
        customer_email="secret@example.com",
        customer_phone="012345678",
        street_address="Confidential Location",
        city_province="Phnom Penh",
        shipping_method=shipping,
        subtotal=100,
        total_usd=110,
    )

    # 1. Unauthenticated request without token -> Must be 401 or 404
    res_unauth = client.get(f"/api/v1/orders/{order.order_number}/")
    assert res_unauth.status_code in [401, 403, 404]

    # 2. Request by wrong authenticated user (User 99) -> Must be 403 or 404
    client.credentials(HTTP_AUTHORIZATION="Bearer fake-token-user-99")
    res_wrong_user = client.get(f"/api/v1/orders/{order.order_number}/")
    assert res_wrong_user.status_code in [401, 403, 404]
```

**Step 2: Run test to verify it fails**
Run: `docker exec ec-order-service pytest tests/test_order_idor.py -v`
Expected: FAIL (currently returns 200 OK because `OrderDetailView` allows `AllowAny`).

**Step 3: Implement Order Privacy & Guest Access Token**
1. In `apps/orders/models.py`, add `guest_access_token = models.CharField(max_length=64, blank=True, db_index=True)`:
```python
import secrets

class Order(TimeStampedModel, UUIDModel):
    ...
    guest_access_token = models.CharField(max_length=64, blank=True, db_index=True)

    def save(self, *args, **kwargs):
        if not self.guest_access_token:
            self.guest_access_token = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)
```
2. In `OrderDetailView` ([`apps/orders/views.py`](file:///d:/Sv23/EC/backend/services/order-service/apps/orders/views.py#L101)):
```python
class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    lookup_field = 'order_number'

    def get_queryset(self):
        user_id = get_current_user_id(self.request)
        token = (
            self.request.headers.get('X-Order-Token') or 
            self.request.query_params.get('token') or 
            self.request.headers.get('X-Session-Key')
        )

        # Authenticated users can access their own orders
        if user_id:
            return Order.objects.filter(models.Q(user_id=user_id) | models.Q(guest_access_token=token)).prefetch_related('items')

        # Unauthenticated / guest users MUST supply the cryptographic guest_access_token
        if token:
            return Order.objects.filter(guest_access_token=token).prefetch_related('items')

        return Order.objects.none()
```
3. In `CheckoutView`, return `guest_access_token` in the response payload so the client can immediately access `/invoice/<order_number>?token=<guest_access_token>`.

**Step 4: Run test to verify it passes**
Run: `docker exec ec-order-service pytest tests/test_order_idor.py -v`
Expected: PASS with 404/403 for unauthorized inquiries and 200 for authentic owners.

---

### Task 3: API Gateway Perimeter Hardening & Rate Limiting (`nginx.conf`)

**Files:**
- Modify: `backend/api-gateway/nginx.conf:1-109`
- Modify: `infrastructure/docker/docker-compose.yml:200-218`
- Test: `scripts/verify_gateway_security.py`

**Step 1: Write the failing test**
Create `scripts/verify_gateway_security.py`:
```python
import requests

GATEWAY = "http://localhost"

def test_gateway_security():
    # 1. External attempt to reach /internal/ must be 403 Forbidden
    res_internal = requests.get(f"{GATEWAY}/internal/inventory/reservations/")
    assert res_internal.status_code == 403

    # 2. Client header spoofing: client sends X-Internal-Service-Key, gateway MUST strip it
    # We verify by hitting an endpoint that would otherwise leak internal privileges
    res_spoof = requests.post(f"{GATEWAY}/api/v1/orders/", headers={"X-Internal-Service-Key": "evil-key"})
    # Must succeed or fail normally without internal elevation

    # 3. Security headers must be present on response
    res = requests.get(f"{GATEWAY}/health/")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
```

**Step 2: Run test to verify it fails**
Run: `python scripts/verify_gateway_security.py`
Expected: FAIL (missing security headers `X-Content-Type-Options`, `X-Frame-Options`).

**Step 3: Implement Hardened Nginx Gateway Configuration**
Update `backend/api-gateway/nginx.conf`:
1. Add Rate Limiting Zones:
```nginx
# Rate Limiting Zones
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_status 429;
```
2. Add Perimeter Security Headers:
```nginx
# Perimeter Security Headers
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```
3. Strip Spoofable Internal Headers from incoming requests:
```nginx
# Crucial: Strip untrusted headers injected by external callers
proxy_set_header X-Internal-Service-Key "";
proxy_set_header X-User-Role "";
```
4. Apply Rate Limits on `/api/v1/auth/` and `/api/v1/payments/`:
```nginx
location /api/v1/auth/ {
    limit_req zone=auth_limit burst=10 nodelay;
    proxy_pass http://user_service/api/v1/auth/;
}
location /api/v1/payments/ {
    limit_req zone=auth_limit burst=10 nodelay;
    proxy_pass http://payment_service/api/v1/payments/;
}
```

**Step 4: Reload Nginx and run test**
Run: `docker exec ec-gateway nginx -t && docker restart ec-gateway`
Run: `python scripts/verify_gateway_security.py`
Expected: PASS (exit code 0, security headers verified, internal endpoints blocked).

---

### Task 4: Payment Service Authentication & Integrity Protection

**Files:**
- Modify: `backend/services/payment-service/apps/payments/views.py:34-110`
- Modify: `backend/services/payment-service/apps/core/permissions.py`
- Test: `backend/services/payment-service/tests/test_payment_security.py`

**Step 1: Write the failing test**
Create `backend/services/payment-service/tests/test_payment_security.py`:
```python
import pytest
from rest_framework.test import APIClient
from apps.payments.models import Payment

@pytest.mark.django_db
def test_duplicate_payment_creation_is_idempotent():
    client = APIClient()
    order_id = "11111111-1111-1111-1111-111111111111"
    payload = {
        "order_id": order_id,
        "order_number": "CLO-TEST-DUP",
        "payment_method": "KHQR",
        "amount_usd": "50.00",
        "amount_khr": 205000
    }
    # 1. Create first payment
    res1 = client.post("/api/v1/payments/", payload, format="json")
    assert res1.status_code == 201

    # 2. Second request for same order -> Must return existing PENDING payment, not duplicate
    res2 = client.post("/api/v1/payments/", payload, format="json")
    assert res2.status_code in [200, 201]
    assert Payment.objects.filter(order_id=order_id).count() == 1
```

**Step 2: Run test to verify it fails**
Run: `docker exec ec-payment-service pytest tests/test_payment_security.py -v`
Expected: FAIL (currently creates 2 payment objects in database).

**Step 3: Implement Idempotent Payment Intent & Order Binding**
In `PaymentCreateView` ([`backend/services/payment-service/apps/payments/views.py`](file:///d:/Sv23/EC/backend/services/payment-service/apps/payments/views.py#L34)):
```python
# Idempotency check: reuse existing PENDING payment intent
existing_payment = Payment.objects.filter(
    order_id=order_id,
    status='PENDING'
).first()

if existing_payment:
    return Response(PaymentDetailSerializer(existing_payment).data, status=status.HTTP_200_OK)
```

**Step 4: Run test to verify it passes**
Run: `docker exec ec-payment-service pytest tests/test_payment_security.py -v`
Expected: PASS (idempotent payment intent with zero database duplication).

---

### Task 5: Frontend Centralized API Client with Automatic Bearer Token

**Files:**
- Create: `ec-online-shop/lib/apiClient.ts`
- Modify: `ec-online-shop/lib/api.ts:240-330`
- Modify: `ec-online-shop/context/AuthContext.tsx:120-148`
- Modify: `ec-online-shop/app/invoice/[orderId]/page.tsx:1-50`
- Test: `npm --prefix ec-online-shop run build`

**Step 1: Create Centralized `apiClient.ts`**
Create `ec-online-shop/lib/apiClient.ts`:
```typescript
import { getStorageItem, removeStorageItem } from "@/lib/storage";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, skipAuth = false, headers = {}, ...rest } = options;

  let url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) searchParams.append(k, String(v));
    });
    const qs = searchParams.toString();
    if (qs) url += `${url.includes("?") ? "&" : "?"}${qs}`;
  }

  const mergedHeaders: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (!skipAuth && typeof window !== "undefined") {
    const token = getStorageItem<string | null>("clothes_auth_token", null);
    if (token && !mergedHeaders["Authorization"]) {
      mergedHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, { headers: mergedHeaders, ...rest });

  if (res.status === 401 && typeof window !== "undefined") {
    // Stale or revoked token
    removeStorageItem("clothes_auth_token");
    window.dispatchEvent(new Event("clothes:auth-expired"));
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message = errorBody.detail || errorBody.error?.message || errorBody.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
```

**Step 2: Refactor `lib/api.ts` to use `apiClient`**
Replace raw `fetch` calls in `submitOrderCheckout`, `fetchCatalogProducts`, and `checkPaymentStatus` with `apiClient`. Ensure `guest_access_token` is forwarded on invoice retrieval.

**Step 3: Update `app/invoice/[orderId]/page.tsx`**
Ensure that when viewing an invoice for a newly placed order, the `token` search parameter is passed so guest customers can view their receipt without encountering 403 Forbidden.

**Step 4: Verify Next.js Build**
Run: `npm --prefix ec-online-shop run build`
Expected: Compile cleanly with exit code 0 and zero TypeScript errors.

---

### Task 6: Comprehensive Security Verification & Automated Regression Test

**Files:**
- Create: `scripts/verify_security_hardening.py`
- Modify: `scripts/verify_e2e_pipeline.py`

**Step 1: Write Full Security Hardening Verification Script**
Create `scripts/verify_security_hardening.py` testing all 6 security layers:
1. Nginx edge blocks `/internal/*` with 403 Forbidden.
2. Nginx edge strips client-injected `X-Internal-Service-Key` and `X-User-Id`.
3. Inter-service direct call to `product-service:8000/internal/...` fails with 403 when missing secret, passes with valid secret.
4. `order-service` blocks unauthenticated query to `GET /api/v1/orders/<order_number>/`.
5. Authenticated User A can retrieve their own order.
6. Authenticated User B receives 404/403 when requesting User A's order.
7. Guest user can retrieve their order using valid `guest_access_token`.
8. Payment creation is idempotent.

**Step 2: Run the test suite**
Run: `python scripts/verify_security_hardening.py`
Expected: `>>> ALL SECURITY HARDENING TESTS PASSED: 100% SUCCESS <<<`

**Step 3: Re-verify standard E2E checkout & payment pipeline**
Run: `python scripts/verify_e2e_pipeline.py`
Expected: Exit code 0, all standard purchase flows pass without regression.

---

Plan complete and saved to `docs/plans/2026-11-22-api-gateway-auth-security-enhancement.md`.  
Next step: run `.agent/workflows/execute-plan.md` to execute this plan task-by-task in single-flow mode.
