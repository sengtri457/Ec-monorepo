# Existing API Baseline

Record the current monolith's behavior before migration.

## Initial endpoint inventory

The following routes were identified from the existing project documentation. Confirm exact paths and behavior from the current URL configuration.

| Method | Existing path | App | Auth required? | New owner |
|---|---|---|---|---|
| GET | `/api/v1/catalog/categories/` | catalog | Verify | Product |
| GET | `/api/v1/catalog/products/` | catalog | Verify | Product |
| GET | `/api/v1/catalog/products/<slug_or_id>/` | catalog | Verify | Product |
| GET/POST/etc. | Existing cart routes | cart | Verify | Order |
| POST | `/api/v1/orders/checkout/` | orders | Verify | Order |
| GET | Existing order detail routes | orders | Verify | Order |
| GET/POST/etc. | Existing payment routes | payments | Verify | Payment |

## Capture for every endpoint

- HTTP method and URL.
- Authentication and permission requirements.
- Query parameters.
- Request JSON.
- Successful response JSON.
- Error response JSON.
- HTTP status codes.
- Validation rules.
- Side effects, such as stock changes or payment record creation.

## Compatibility rule

When an endpoint moves, keep its public path and response shape where practical. If a change is required, document it and update the frontend and API documentation in the same pull request.
