# Service Boundaries and Responsibilities

## 1. User Service

**Migrates:** `apps.accounts`

Owns:
- User account records.
- Registration and login.
- Password management.
- JWT issuance/refresh or authentication integration.
- Customer addresses.

Suggested APIs:
- `POST /api/v1/auth/register/`
- `POST /api/v1/auth/login/`
- `POST /api/v1/auth/refresh/`
- `GET /api/v1/users/me/`
- `GET /api/v1/users/{id}/`
- `GET /api/v1/addresses/`
- `POST /api/v1/addresses/`

Does not own orders, products, or payments.

## 2. Product Service

**Migrates:** `apps.catalog` and `apps.inventory`

Owns:
- Categories, products, variants, images.
- Stock quantities and stock movement history.
- Stock reservation lifecycle.

Suggested public APIs:
- `GET /api/v1/catalog/categories/`
- `GET /api/v1/catalog/products/`
- `GET /api/v1/catalog/products/{id}/`
- Product CRUD routes aligned with current API behavior.
- `GET /api/v1/inventory/{variant_id}/`

Suggested internal APIs:
- `POST /internal/inventory/reservations/`
- `POST /internal/inventory/reservations/{reservation_id}/release/`
- `POST /internal/inventory/reservations/{reservation_id}/confirm/`

## 3. Order Service

**Migrates:** `apps.cart` and `apps.orders`

Owns:
- Cart and cart items.
- Shipping methods.
- Orders and order items.
- Order status history.
- Checkout orchestration.

Preserve existing cart routes where practical. Main endpoints include:
- `POST /api/v1/orders/checkout/`
- `GET /api/v1/orders/`
- `GET /api/v1/orders/{id}/`
- Authenticated internal order-status update endpoint.

Store `user_id`, `variant_id`, and `changed_by_user_id` as scalar identifiers, not cross-service ForeignKeys.

## 4. Payment Service

**Migrates:** `apps.payments`

Owns:
- Payment records and transactions.
- Payment provider integration.
- KHQR generation and verification.
- COD payment state.
- Card payment state where supported by the existing implementation.
- Payment callbacks and idempotency.

Suggested APIs:
- `POST /api/v1/payments/`
- `GET /api/v1/payments/{id}/`
- `GET /api/v1/payments/order/{order_id}/`
- `POST /api/v1/payments/{id}/verify/`
- Authenticated internal payment-result callback endpoint.

Payment stores `order_id` as a scalar identifier. It does not import Order Service models.

## 5. Notification Service

**New service**

Owns:
- Notification records.
- Delivery status.
- Email and/or Telegram sending.
- Basic retry and failure tracking.

Suggested APIs:
- `POST /internal/notifications/`
- `GET /api/v1/notifications/`
- `GET /api/v1/notifications/{id}/`

Start with synchronous REST. If sending fails, record the failure and allow retry. A message broker is not required for the first version.

## 6. Boundary rule

A service owns its domain data and business rules. Other services request information or actions through its API. They must not read or write its database directly.
