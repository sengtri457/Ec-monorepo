# Gradual Migration Plan

## Target estimate

Approximately 128–167 focused hours, or around 8 weeks at 3–4 hours per day. This is a planning estimate, not a guarantee. Team size, test coverage, and payment-provider complexity can change it.

## Phase 0 — Audit and preparation

**Estimate: 12–16 hours**

- [ ] Create a feature branch from `development`.
- [ ] Confirm working tree and record source commit.
- [ ] Run the current backend and tests.
- [ ] Inventory models, URLs, serializers, views, signals, and services.
- [ ] Map cross-domain ForeignKeys.
- [ ] Record current API contracts.
- [ ] Back up the current database.
- [ ] Prepare PostgreSQL.
- [ ] Agree service names, ports, and database ownership.

**Exit criteria:** Existing checkout and payment flows are understood and a reproducible baseline exists.

## Phase 1 — User Service

**Estimate: 15–20 hours**

- [ ] Create independent Django project.
- [ ] Move accounts domain code.
- [ ] Configure `user_db`.
- [ ] Preserve user primary keys.
- [ ] Move address management.
- [ ] Configure JWT behavior.
- [ ] Add health endpoint.
- [ ] Add unit and API tests.
- [ ] Test data import.

**Exit criteria:** User Service runs independently and authentication works.

## Phase 2 — Product Service

**Estimate: 18–22 hours**

- [ ] Create independent Django project.
- [ ] Move catalog and inventory apps.
- [ ] Configure `product_db`.
- [ ] Preserve product/variant constraints.
- [ ] Preserve stock movement history.
- [ ] Preserve row locking within Product Service.
- [ ] Add internal stock reservation/release endpoints.
- [ ] Add unit and API tests.
- [ ] Import and validate product data.

**Exit criteria:** Catalog and inventory work independently.

## Phase 3 — Order Service

**Estimate: 20–25 hours**

- [ ] Create independent Django project.
- [ ] Move cart and order apps.
- [ ] Configure `order_db`.
- [ ] Replace cross-service ForeignKeys with scalar IDs.
- [ ] Preserve order-item snapshots.
- [ ] Integrate with User Service where needed.
- [ ] Integrate with Product Service.
- [ ] Implement reservation compensation on order failure.
- [ ] Preserve shipping and order history.
- [ ] Add integration tests.

**Exit criteria:** Cart and checkout work through service APIs.

## Phase 4 — Payment Service

**Estimate: 15–20 hours**

- [ ] Create independent Django project.
- [ ] Move payment models and provider integration.
- [ ] Configure `payment_db`.
- [ ] Replace Order ForeignKey with scalar `order_id`.
- [ ] Preserve KHQR, COD, and card behavior as applicable.
- [ ] Add callback validation and idempotency.
- [ ] Integrate with Order Service.
- [ ] Test success, failure, pending, and duplicate callbacks.

**Exit criteria:** Payment lifecycle is independent and updates order state through an API.

## Phase 5 — Notification Service and Gateway

**Estimate: 15–20 hours**

- [ ] Create Notification Service.
- [ ] Configure `notification_db`.
- [ ] Implement notification records and delivery status.
- [ ] Add email or Telegram delivery.
- [ ] Add failure recording and retry.
- [ ] Configure Nginx path routing.
- [ ] Test gateway routing.

**Exit criteria:** All five services are reachable through the gateway and notification requests are handled.

## Phase 6 — Docker and CI

**Estimate: 15–20 hours**

- [ ] Add Dockerfile to each service.
- [ ] Create Docker Compose stack.
- [ ] Configure service-specific database credentials.
- [ ] Add health checks.
- [ ] Add GitHub Actions test workflow.
- [ ] Add image build workflow if registry is available.
- [ ] Document local startup and troubleshooting.

**Exit criteria:** Complete stack starts locally and CI runs tests.

## Phase 7 — Kubernetes and final delivery

**Estimate: 18–24 hours**

- [ ] Create namespace and configuration.
- [ ] Create Deployment and Service manifests.
- [ ] Configure secrets without committing real values.
- [ ] Deploy to Minikube.
- [ ] Configure ingress or gateway exposure.
- [ ] Add basic Prometheus/Grafana monitoring.
- [ ] Run end-to-end test.
- [ ] Complete architecture and API documentation.
- [ ] Prepare final presentation and demo.

**Exit criteria:** System is demonstrable in Kubernetes and required documentation is complete.

## Migration rule

Complete one phase, test it, document it, and merge its feature branch into `development` before starting the next major extraction. Do not delete the old monolith until the new service passes acceptance tests and its data is validated.
