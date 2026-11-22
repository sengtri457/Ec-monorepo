# Database Ownership and PostgreSQL Design

## 1. Database per service

| Service | Database | Owns |
|---|---|---|
| User | `user_db` | Users, addresses |
| Product | `product_db` | Categories, products, variants, images, stock |
| Order | `order_db` | Cart, shipping, orders, order items, status history |
| Payment | `payment_db` | Payments, payment transactions |
| Notification | `notification_db` | Notification records and delivery status |

For the university demonstration, one PostgreSQL server/container can host five separate databases. Use separate database users/credentials where practical. Each service should only receive credentials for its own database.

Separate databases are clearer than separate schemas for demonstrating Database per Service.

## 2. Cross-service references

Do not create database ForeignKeys across service boundaries.

| Relationship | Store as |
|---|---|
| Order → customer | `Order.user_id` scalar |
| Order item → product variant | `OrderItem.variant_id` scalar |
| Order history → actor | `changed_by_user_id` scalar |
| Payment → order | `Payment.order_id` scalar |
| Notification → related order/payment | Scalar reference ID and type |

The scalar field type must match the actual source primary-key type. Inspect current models before defining it.

## 3. Primary-key migration

Do not casually convert existing integer IDs to UUIDs during extraction.

Recommended initial approach:
- Preserve existing user IDs.
- Preserve product and variant IDs.
- Preserve order UUIDs if the current Order model uses UUID primary keys.
- Preserve payment IDs where practical.
- Use scalar fields with matching types.

A later UUID migration should be a separate task with an explicit mapping and data migration.

## 4. Order snapshots

Keep existing order-item snapshots, including product title, SKU, size, color, unit price, quantity, and line total. These preserve what the customer purchased at checkout, even if the product changes later.

## 5. Inventory transaction boundary

The monolith can use one database transaction and row lock across local tables. After extraction, Order Service cannot lock Product Service rows directly.

Suggested workflow:
1. Order Service requests a stock reservation from Product Service.
2. Product Service uses a local transaction and row lock to validate and reserve stock.
3. Product Service returns a reservation identifier.
4. Order Service creates the order in its own database.
5. If order creation fails, Order Service asks Product Service to release the reservation.
6. Confirm or retain the reservation at the defined business point.

Define reservation expiry and failure handling. Do not claim a distributed atomic transaction.

## 6. Payment boundary

Payment Service stores `order_id` and payment details locally. It coordinates order state through authenticated APIs, never by updating Order Service's database directly.

## 7. Configuration

Use environment variables such as `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT`. Do not hardcode credentials or reuse one service's database credentials in another service.
