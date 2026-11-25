# System Design Audit & Gap Remediation Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Resolve identified architectural bugs, missing e-commerce business flows, payment/stock vulnerabilities, and design system inconsistencies across the monorepo for the university project.

**Architecture:** Standardize financial calculations (VAT vs Sales tax) between `order-service` and Next.js `apps/web`; implement a background stock reservation reaper and cancellation restock handler; secure the payment verification gateway; introduce an admin portal authentication route guard; connect the customer profile directly to backend order and address APIs; and normalize design tokens across apps.

**Tech Stack:** Next.js 16 (App Router, React 19, Tailwind CSS v4), Django 6.1 / Django REST Framework, Nginx API Gateway, PostgreSQL, Docker Compose, Pytest.

---

### Task 1: Financial & Tax Calculation Alignment (Order Service & Web Checkout)

**Context & Root Cause:**
In `apps/web/context/CartContext.tsx` line 339 and `apps/web/app/checkout/page.tsx` line 231, VAT is assumed to be included in listing prices (`tax = 0.00`). However, in `backend/services/order-service/config/settings.py` line 130 and `apps/orders/services.py` lines 58-60, `DEFAULT_TAX_RATE = 0.10` automatically computes and adds a 10% tax on top of subtotal, causing a financial mismatch between what the customer sees/pays and what the backend records.

**Files:**
- Modify: `backend/services/order-service/config/settings.py`
- Modify: `backend/services/order-service/apps/orders/services.py`
- Modify: `backend/services/order-service/tests/test_order_service.py`
- Modify: `apps/web/app/checkout/page.tsx`
- Modify: `apps/web/lib/api.ts`

**Step 1: Write the failing unit test**
Add a test in `backend/services/order-service/tests/test_order_service.py` asserting that when `DEFAULT_TAX_RATE` is configured to `0.00` (or when tax-inclusive VAT mode is enabled), `order.tax == 0.00` and `order.total_usd == subtotal + shipping_cost`.

**Step 2: Run test to verify it fails**
Run: `python -m pytest backend/services/order-service/tests/test_order_service.py -k test_checkout_tax_inclusive`
Expected: FAIL

**Step 3: Implement minimal fix**
- Set `DEFAULT_TAX_RATE = Decimal(os.environ.get('DEFAULT_TAX_RATE', '0.00'))` in `settings.py` to match Cambodia retail standards where VAT is included in item prices.
- Ensure `CheckoutService.process_checkout` quantizes tax correctly and preserves financial consistency.

**Step 4: Run test to verify it passes**
Run: `python -m pytest backend/services/order-service/tests/test_order_service.py`
Expected: ALL PASS

**Step 5: Commit**
```bash
git add backend/services/order-service/ apps/web/
git commit -m "fix(finance): align order service tax rate with cambodia retail standard"
```

---

### Task 2: Stock Reservation Expiry Reaper & Admin Cancellation Restock

**Context & Root Cause:**
When orders are placed, `product-service` reserves stock by immediately decrementing `variant.stock -= qty`. If an order is never paid, no background reaper releases the expired reservation. Furthermore, when an admin changes an order status to `CANCELLED` via `AdminOrderStatusUpdateView` in `apps/orders/views.py`, it never calls `ProductServiceClient.release_stock()`, resulting in permanent inventory loss.

**Files:**
- Create: `backend/services/product-service/apps/inventory/management/commands/release_expired_reservations.py`
- Modify: `backend/services/product-service/apps/inventory/views.py`
- Modify: `backend/services/order-service/apps/orders/views.py`
- Test: `backend/services/product-service/tests/test_admin_inventory.py`
- Test: `backend/services/order-service/tests/test_admin_orders.py`

**Step 1: Write failing tests**
- In `product-service`: Test `release_expired_reservations` management command recovers stock for reservations past `expires_at`.
- In `order-service`: Test transitioning order status to `CANCELLED` calls `ProductServiceClient.release_stock()` when order was unpaid/pending.

**Step 2: Run tests to verify failure**
Run: `python -m pytest backend/services/product-service/tests/test_admin_inventory.py -k test_expired_reservation_release`
Expected: FAIL

**Step 3: Implement implementation**
- Create management command `release_expired_reservations` in `product-service`.
- Add stock release call in `AdminOrderStatusUpdateView` when `status == 'CANCELLED'` and `order.stock_reservation_id` exists.

**Step 4: Run tests to verify they pass**
Run: `python -m pytest backend/services/product-service/ && python -m pytest backend/services/order-service/`
Expected: PASS

**Step 5: Commit**
```bash
git add backend/services/product-service/ backend/services/order-service/
git commit -m "fix(inventory): implement reservation expiry reaper and admin cancellation restock"
```

---

### Task 3: Secure Payment Verification & Fix API Gateway Health Route

**Context & Root Cause:**
1. In `backend/services/payment-service/apps/payments/views.py`, `PaymentVerifyView` has `permission_classes = [permissions.AllowAny]`, allowing unauthenticated public callers to mark any payment as `COMPLETED`.
2. In `apps/admin/components/AdminHeader.tsx`, line 37 hardcodes `fetch("http://localhost/api/v1/health")`. But `backend/api-gateway/nginx.conf` only defines `/health/` and lacks `/api/v1/health`, causing the admin portal to permanently show "Gateway Offline".

**Files:**
- Modify: `backend/api-gateway/nginx.conf`
- Modify: `backend/services/payment-service/apps/payments/views.py`
- Modify: `apps/admin/components/AdminHeader.tsx`
- Test: `backend/services/payment-service/tests/test_payment_service.py`

**Step 1: Write failing tests**
- Test that public unauthenticated requests to `/api/v1/payments/<id>/verify/` without an internal service key or admin auth are rejected with HTTP 403.
- Test that `nginx.conf` maps both `/health/` and `/api/v1/health/` properly.

**Step 2: Run tests to verify failure**
Run: `python -m pytest backend/services/payment-service/tests/test_payment_service.py -k test_unauthenticated_verify_rejected`
Expected: FAIL

**Step 3: Implement minimal fix**
- Add `IsInternalServiceOrAdmin` permission check to `PaymentVerifyView` (or support signed webhook callback).
- Add `location /api/v1/health/` block in `nginx.conf`.
- Update `AdminHeader.tsx` to read `process.env.NEXT_PUBLIC_API_URL` rather than hardcoding `http://localhost/api/v1/health`.

**Step 4: Run tests to verify pass**
Run: `python -m pytest backend/services/payment-service/`
Expected: PASS

**Step 5: Commit**
```bash
git add backend/api-gateway/nginx.conf backend/services/payment-service/ apps/admin/
git commit -m "fix(security): protect payment verify endpoint and add gateway health route"
```

---

### Task 4: Admin Portal Route Guard & Environment Configuration

**Context & Root Cause:**
In `apps/admin`, there is no route guard or middleware protecting `/`, `/orders`, `/inventory`, `/dispatch`, or `/products`. When an unauthenticated visitor accesses the console, pages fail to fetch, dispatch `admin:auth-expired`, but leave broken empty states without redirecting to `/login`. In addition, `apps/admin` lacks an `.env.example`.

**Files:**
- Create: `apps/admin/.env.example`
- Create: `apps/admin/components/AdminRouteGuard.tsx`
- Modify: `apps/admin/components/AdminShell.tsx`
- Modify: `apps/admin/app/login/page.tsx`

**Step 1: Create test verification script**
Verify that accessing protected routes while unauthenticated redirects user to `/login`.

**Step 2: Implement AdminRouteGuard**
- Build `AdminRouteGuard` checking `isLoading`, `isAuthenticated`, and `user.is_staff`.
- Wrap non-login pages inside `AdminShell` with `AdminRouteGuard`.
- Provide smooth loading skeleton while verifying local credentials.

**Step 3: Verify Admin Console Build & Lint**
Run: `pnpm --filter admin build`
Expected: PASS

**Step 4: Commit**
```bash
git add apps/admin/
git commit -m "feat(admin): implement route guard and provide environment template"
```

---

### Task 5: Customer Profile Backend Integration (Orders & Addresses)

**Context & Root Cause:**
In `apps/web/app/profile/components/OrderHistoryTab.tsx` and `AddressBookTab.tsx`, data is strictly read from and written to `localStorage`. Real user orders and customer addresses in `order-service` and `user-service` are never queried or displayed to the authenticated customer.

**Files:**
- Modify: `apps/web/app/profile/components/OrderHistoryTab.tsx`
- Modify: `apps/web/app/profile/components/AddressBookTab.tsx`
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/lib/orders.ts`

**Step 1: Write integration helper functions**
- Add `fetchCustomerOrders()` in `apps/web/lib/api.ts` calling `/api/v1/orders/`.
- Add `fetchCustomerAddresses()` and `saveCustomerAddress()` in `apps/web/lib/api.ts` calling `/api/v1/addresses/`.

**Step 2: Update OrderHistoryTab & AddressBookTab**
- Load orders from backend with graceful fallback to local storage if offline/guest.
- Load and persist addresses to backend database when authenticated.

**Step 3: Run web build to verify TypeScript typing and imports**
Run: `pnpm --filter web build`
Expected: PASS

**Step 4: Commit**
```bash
git add apps/web/
git commit -m "feat(profile): integrate customer order history and address book with backend services"
```

---

### Task 6: Design System Token Normalization & UX Consistency

**Context & Root Cause:**
`apps/web` and `apps/admin` diverge in their token architectures: `apps/web` uses a defined 3-layer CSS variable structure (`--canvas`, `--ink`, `--accent-terracotta`), while `apps/admin` has hardcoded hex colors, inconsistent dark/light themes on login vs interior, and raw inline styles.

**Files:**
- Modify: `apps/admin/app/globals.css`
- Modify: `apps/admin/app/login/page.tsx`
- Modify: `apps/admin/components/AdminHeader.tsx`
- Modify: `apps/admin/components/AdminBottomNav.tsx`

**Step 1: Align Theme Variables**
- Extend `@theme` in `apps/admin/app/globals.css` with semantic color aliases matching the corporate brand identity (`--color-brand-terracotta`, `--color-canvas`, `--color-surface`).
- Bring login screen styling into harmonious alignment with the rest of the console.

**Step 2: Run linting and styling checks**
Run: `pnpm --filter admin lint`
Expected: 0 errors

**Step 3: Commit**
```bash
git add apps/admin/
git commit -m "style(design-system): normalize tokens and theme variables across admin console"
```

---

### Task 7: Full Monorepo End-to-End Verification

**Context:**
Run the complete regression and verification suite across all microservices, frontend applications, and integration scripts to ensure zero regression and 100% test coverage.

**Commands:**
1. `python scripts/run_all_tests.py` -> All 5 microservices unit tests pass
2. `pnpm run build` -> Turbo builds both `web` and `admin` Next.js apps with 0 errors
3. `pnpm run lint` -> Turbo lints all packages and apps with 0 errors
4. Update `docs/plans/task.md` with completed audit and remediation items.
