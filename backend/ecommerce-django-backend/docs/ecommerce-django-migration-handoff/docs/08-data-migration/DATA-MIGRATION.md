# Data Migration Plan

## 1. Principles

- Back up before schema or data migration.
- Keep the original database unchanged during early extraction.
- Preserve primary-key values where possible.
- Migrate data according to service ownership.
- Validate record counts and relationships.
- Use repeatable import scripts, not manual copy/paste.
- Do not allow two services to write the same business data.

## 2. Data ownership mapping

| Source domain | Destination |
|---|---|
| Users and addresses | `user_db` |
| Categories, products, variants, images | `product_db` |
| Stock movements | `product_db` |
| Cart and cart items | `order_db` |
| Shipping methods, orders, order items, status history | `order_db` |
| Payments and payment transactions | `payment_db` |
| Notification records | `notification_db` (new data) |

Confirm actual table names and dependencies from current migrations before writing scripts.

## 3. Process

1. Put the source application in a known migration state.
2. Create and verify a database backup.
3. Create target databases and service schemas.
4. Apply target service migrations.
5. Export source records in dependency-aware order.
6. Transform only fields required by the new service boundaries.
7. Import records while preserving IDs.
8. Validate counts, unique constraints, and references.
9. Run service tests against imported data.
10. Record migration date, source commit, backup name, and results.

## 4. Cross-service reference validation

Since cross-service ForeignKeys become scalar IDs, validate references through reconciliation reports or service API checks.

Examples:
- Every `Order.user_id` should refer to a migrated user.
- Every `OrderItem.variant_id` should refer to a migrated variant where required by current operations.
- Every `Payment.order_id` should refer to an order.
- Historical order snapshots must remain available even if a product is later deleted.

## 5. Cutover

For a university project, use a controlled cutover:
- Migrate and test data in target databases.
- Stop writes to the old monolith during final export/import.
- Import the final delta if needed.
- Run validation.
- Point frontend requests to the gateway.
- Keep the original database backup for rollback.

Avoid dual-writing to old and new systems unless a reconciliation process has been designed.

## 6. Rollback

If validation fails:
1. Stop the new stack.
2. Restore frontend/API routing to the old monolith.
3. Preserve logs and failed migration output.
4. Restore from backup only if the source database was modified.
5. Fix the migration script and retry against clean target databases.

Do not delete the source database during cutover.
