# Test Strategy and Acceptance Criteria

## 1. Test levels

| Test type | Purpose |
|---|---|
| Unit tests | Validate model and business rules |
| API tests | Validate endpoint contracts and permissions |
| Service integration tests | Validate service with its own database |
| Cross-service tests | Validate REST communication |
| End-to-end tests | Validate customer purchase workflow |
| Deployment smoke tests | Validate Docker and Kubernetes |

## 2. Preserve existing tests

Before extraction:
- Run the existing test suite.
- Record passing and failing tests.
- Keep tests for stock validation, checkout, payment state, and model constraints.
- Move tests with their owning domain where appropriate.
- Update tests only when behavior intentionally changes.

Do not remove a failing test just to make CI green. Determine whether it exposes a regression or an obsolete contract.

## 3. Acceptance checklist

### User Service
- [ ] Registration works.
- [ ] Login works.
- [ ] JWT validation works.
- [ ] Current-user endpoint returns authenticated account.
- [ ] Address ownership is enforced.

### Product Service
- [ ] Category and product reads work.
- [ ] Product CRUD permissions work.
- [ ] Variant uniqueness is enforced.
- [ ] Price and stock constraints are enforced.
- [ ] Stock reservations cannot oversell inventory.
- [ ] Stock movement history is retained.

### Order Service
- [ ] Cart behavior is preserved.
- [ ] Checkout validates input.
- [ ] Order snapshots are stored.
- [ ] User and variant IDs are stored without cross-service ForeignKeys.
- [ ] Failed order creation releases stock reservation.
- [ ] Order history and shipping behavior work.

### Payment Service
- [ ] Payment record creation works.
- [ ] KHQR behavior is preserved where configured.
- [ ] COD behavior works.
- [ ] Verification result is validated.
- [ ] Duplicate callbacks do not duplicate state transitions.
- [ ] Payment state reaches Order Service through an authenticated API.

### Notification Service
- [ ] Notification request is authenticated.
- [ ] Notification record is stored.
- [ ] Successful delivery is recorded.
- [ ] Failed delivery is recorded.
- [ ] Retry does not create uncontrolled duplicate messages.

## 4. End-to-end scenario

1. Customer logs in.
2. Customer browses products.
3. Customer adds a variant to cart.
4. Customer starts checkout.
5. Order Service requests stock reservation.
6. Product Service reserves stock atomically in its own database.
7. Order Service creates order and snapshots.
8. Payment Service creates a payment.
9. Payment is verified or marked according to selected method.
10. Order Service updates order status.
11. Notification Service records and sends notification.

Also test insufficient stock, downstream service outage, order creation failure after reservation, payment failure/timeout, duplicate callbacks, and notification provider failure.
