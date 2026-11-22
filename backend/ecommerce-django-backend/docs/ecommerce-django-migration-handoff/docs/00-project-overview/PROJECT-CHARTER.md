# Project Charter

## 1. Purpose

Migrate the existing Django e-commerce backend from a modular monolith into a small, independently runnable microservices architecture while preserving its existing business behavior.

The scope is a university project. The architecture should demonstrate service separation, independent databases, REST communication, containerization, CI/CD, Kubernetes deployment, and basic monitoring without introducing unnecessary enterprise infrastructure.

## 2. Objectives

- Separate business domains into independently runnable Django services.
- Give each service ownership of its own PostgreSQL database.
- Replace direct cross-domain database relationships with scalar identifiers and REST APIs.
- Preserve product, inventory, cart, checkout, order, and payment rules.
- Provide one frontend entry point through Nginx.
- Run the system locally with Docker Compose.
- Demonstrate Kubernetes using Minikube.
- Automate basic checks and image builds with GitHub Actions.
- Document architecture, APIs, setup, testing, and operations.

## 3. In scope

| Component | Responsibility |
|---|---|
| User Service | Accounts, authentication, customer addresses |
| Product Service | Categories, products, variants, images, inventory |
| Order Service | Cart, shipping, checkout, orders, order history |
| Payment Service | Payment records, KHQR/COD/card flows and verification |
| Notification Service | Notification records and email/Telegram delivery |
| API Gateway | Nginx routing |
| Data | PostgreSQL database per service |
| Delivery | Docker, Compose, GitHub Actions, Kubernetes |
| Operations | Health checks, logs, basic Prometheus/Grafana |

## 4. Out of scope for the first version

- Kafka or RabbitMQ.
- Redis caching or distributed locks.
- Service mesh.
- Distributed tracing platform.
- Multi-region deployment.
- Complex API management platform.
- Production-scale autoscaling.
- Payment provider certification beyond the existing integration's supported scope.

These may be future enhancements, not prerequisites for the first university version.

## 5. Definition of success

1. Each service starts independently.
2. Each service connects only to its own database.
3. The gateway routes requests to the correct service.
4. A customer can complete the main purchase workflow.
5. Payment status can be verified and reflected in the order.
6. Notification requests are handled.
7. Automated tests pass.
8. Docker Compose starts the local system.
9. Kubernetes manifests deploy the system to Minikube.
10. API documentation and architecture diagrams are included.

## 6. Assumptions

- The existing repository is the source of truth for current business rules.
- Existing endpoint behavior should be retained where practical.
- Existing primary-key values should be preserved during initial migration.
- One PostgreSQL server/container hosting multiple separate databases is acceptable for the university demonstration.
- Public cloud hosting is optional unless the teacher explicitly requires it.
