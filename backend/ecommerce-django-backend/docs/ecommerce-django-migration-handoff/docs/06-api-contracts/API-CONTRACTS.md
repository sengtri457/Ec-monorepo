# API Contracts

This is the initial target contract. Compare it with the existing URL configuration and preserve current public paths and response formats wherever practical.

## 1. Conventions

- API prefix: `/api/v1/`.
- JSON request and response bodies.
- Standard HTTP methods and status codes.
- JWT access token for authenticated user requests.
- Consistent validation error format.
- Internal endpoints require service-to-service authentication.
- Set timeouts for downstream calls.
- Never trust a `user_id` sent by the browser as proof of identity.

## 2. Initial endpoint map

### User Service

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/auth/register/` | Register |
| POST | `/api/v1/auth/login/` | Login |
| POST | `/api/v1/auth/refresh/` | Refresh token |
| GET | `/api/v1/users/me/` | Current user |
| GET | `/api/v1/users/{id}/` | Protected user detail |
| GET | `/api/v1/addresses/` | List own addresses |
| POST | `/api/v1/addresses/` | Create address |

### Product Service

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/catalog/categories/` | List categories |
| GET | `/api/v1/catalog/products/` | List products |
| GET | `/api/v1/catalog/products/{id}/` | Product detail |
| POST/PUT/PATCH/DELETE | Existing product paths | Product management |
| GET | `/api/v1/inventory/{variant_id}/` | Stock information |
| POST | `/internal/inventory/reservations/` | Reserve stock |
| POST | `/internal/inventory/reservations/{id}/release/` | Release stock |
| POST | `/internal/inventory/reservations/{id}/confirm/` | Confirm reservation |

### Order Service

| Method | Path | Purpose |
|---|---|---|
| GET | Existing cart path | Get cart |
| POST | Existing cart item path | Add item |
| PUT/PATCH | Existing cart item path | Change quantity |
| DELETE | Existing cart item path | Remove item |
| POST | `/api/v1/orders/checkout/` | Checkout |
| GET | `/api/v1/orders/` | List current user's orders |
| GET | `/api/v1/orders/{id}/` | Order detail |
| PATCH | `/internal/orders/{id}/status/` | Authenticated service update |

### Payment Service

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/payments/` | Create payment |
| GET | `/api/v1/payments/{id}/` | Payment detail |
| GET | `/api/v1/payments/order/{order_id}/` | Payment by order |
| POST | `/api/v1/payments/{id}/verify/` | Verify payment |
| POST | `/internal/payments/callback/` | Provider/internal callback |

### Notification Service

| Method | Path | Purpose |
|---|---|---|
| POST | `/internal/notifications/` | Request notification |
| GET | `/api/v1/notifications/` | List current user's notifications |
| GET | `/api/v1/notifications/{id}/` | Notification detail |

## 3. Illustrative checkout request

The exact fields must match the existing checkout serializer. This is an example, not a replacement for the current contract.

```json
{
  "shipping_address_id": 12,
  "shipping_method_id": 2,
  "payment_method": "KHQR",
  "items": [
    {
      "variant_id": 41,
      "quantity": 2
    }
  ]
}
```

The authenticated user identity should come from the validated token, not a client-supplied `user_id`.

## 4. HTTP 202

Use HTTP 202 Accepted only when the server has accepted work that will complete later. Do not return 202 for every normal API request. A synchronous checkout should return the created order response and appropriate status.

## 5. Error contract

Example consistent error shape:

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Requested quantity is not available."
  }
}
```

Document actual status codes and validation behavior. Never expose stack traces or secrets.

## 6. API documentation

Generate OpenAPI/Swagger documentation per service. The gateway is the public entry point, but each service should remain independently testable and documented.
