# API Gateway (Nginx)

The API Gateway provides a unified reverse proxy and entry point for all frontend client traffic in the microservices architecture.

## Responsibilities
- Maps incoming `/api/v1/*` routes to their respective internal Django microservice.
- Blocks public access to `/internal/*` routes (returns HTTP 403 Forbidden).
- Preserves client metadata by passing `Authorization`, `Host`, `X-Real-IP`, and `X-Session-Key`.
- Centralizes CORS and connection timeouts.

## Routing Map

| Public URL Path | Target Microservice | Internal Port |
| :--- | :--- | :--- |
| `/api/v1/auth/*` | User Service | `user-service:8000` |
| `/api/v1/users/*` | User Service | `user-service:8000` |
| `/api/v1/addresses/*` | User Service | `user-service:8000` |
| `/api/v1/catalog/*` | Product Service | `product-service:8000` |
| `/api/v1/inventory/*` | Product Service | `product-service:8000` |
| `/api/v1/cart/*` | Order Service | `order-service:8000` |
| `/api/v1/orders/*` | Order Service | `order-service:8000` |
| `/api/v1/payments/*` | Payment Service | `payment-service:8000` |
| `/api/v1/notifications/*`| Notification Service| `notification-service:8000`|
| `/internal/*` | **Blocked** | Returns `403 Forbidden` |
