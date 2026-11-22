# Current System Audit

## 1. Current architecture

The existing repository is a Django modular monolith: multiple Django apps run inside one Django project, with one settings module, one URL configuration, and one configured database.

This is a useful starting point. Existing app boundaries can guide service extraction, but separate Django apps alone do not make an application microservices.

## 2. Existing domain mapping

| Existing app | Current responsibility | Planned destination |
|---|---|---|
| `apps.accounts` | User and customer address data | User Service |
| `apps.catalog` | Category, product, variant, image | Product Service |
| `apps.inventory` | Stock movement and inventory behavior | Product Service |
| `apps.cart` | Cart and cart items | Order Service |
| `apps.orders` | Shipping, order, order items, status history | Order Service |
| `apps.payments` | Payment and payment transaction | Payment Service |

Notification Service is a small new service for the assignment.

## 3. Existing behavior to preserve

The repository documentation and inspected code indicate that the backend includes:

- Product catalog and category endpoints.
- Product variants and product images.
- Cart management, including guest/authenticated cart behavior.
- Checkout and order creation.
- Shipping methods.
- Order status history.
- Payment records and payment transactions.
- Bakong KHQR, COD, and card payment methods.
- Inventory validation and stock movement history.
- Database constraints for non-negative stock and prices.
- Variant uniqueness constraints.
- Row locking during checkout with `select_for_update()`.
- Order-item snapshots: product title, SKU, size, color, unit price, quantity, and line total.

Confirm every item against the current branch and test suite before migration.

## 4. Cross-domain couplings to inspect

| Existing relationship | Required migration change |
|---|---|
| `Order.user` → User model | Store scalar `user_id` |
| `OrderItem.variant` → ProductVariant | Store scalar `variant_id`; retain order snapshots |
| `OrderStatusHistory.changed_by` → User model | Store scalar `changed_by_user_id` |
| `Payment.order` → Order model | Store scalar `order_id` |

Search all models, serializers, services, admin classes, signals, and tests for other cross-domain references.

## 5. Audit checklist

- [ ] Record current Git branch and commit.
- [ ] Confirm working tree is clean.
- [ ] Run the current backend.
- [ ] Run the current test suite and record results.
- [ ] Read all model definitions.
- [ ] Read serializers and validation methods.
- [ ] Read views, viewsets, service functions, and signals.
- [ ] Read URL configurations.
- [ ] Read all migrations.
- [ ] Identify every ForeignKey and ManyToManyField crossing planned service boundaries.
- [ ] Identify transactions and `select_for_update()` usage.
- [ ] Identify payment provider integration and callback behavior.
- [ ] Identify environment variables and secrets.
- [ ] Back up the current database.
- [ ] Record API request and response examples.

## 6. Configuration concerns

The previously inspected settings included a development SQLite configuration, development secret/debug/CORS settings, and an example PostgreSQL URL. Confirm the latest branch before changing anything.

Before deployment:
- Read secrets from environment variables.
- Set `DEBUG=False`.
- Restrict allowed hosts and CORS origins.
- Use PostgreSQL.
- Do not commit `.env` files or credentials.

## 7. Baseline evidence

Use `BASELINE-API.md` to record actual endpoint paths, request and response examples, status codes, permissions, and side effects. Do not invent or silently change API behavior during extraction.
