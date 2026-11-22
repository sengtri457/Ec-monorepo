# E-commerce Django Microservices Migration

**University-scope developer handoff and migration guide**

This pack describes a gradual migration of the existing `ecommerce-django-backend` Django modular monolith into a small microservices system. It is designed to be split into manageable Markdown documents rather than maintained as one large specification.

## Confirmed decisions

| Area | Decision |
|---|---|
| Migration strategy | Gradual extraction |
| Backend | Django + Django REST Framework |
| Services | User, Product, Order, Payment, Notification |
| Database | PostgreSQL, database per service |
| Communication | REST APIs |
| API Gateway | Nginx reverse proxy |
| Local containers | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Kubernetes | Minikube for local demonstration |
| Monitoring | Basic Prometheus + Grafana |
| Repository | Monorepo |

## Reading order

1. `docs/00-project-overview/PROJECT-CHARTER.md`
2. `docs/01-current-system-audit/CURRENT-STATE.md`
3. `docs/01-current-system-audit/BASELINE-API.md`
4. `docs/02-architecture/TARGET-ARCHITECTURE.md`
5. `docs/03-repository-structure/REPOSITORY-STRUCTURE.md`
6. `docs/04-service-design/SERVICE-BOUNDARIES.md`
7. `docs/05-database-design/DATABASE-OWNERSHIP.md`
8. `docs/06-api-contracts/API-CONTRACTS.md`
9. `docs/07-migration-roadmap/MIGRATION-PLAN.md`
10. `docs/08-data-migration/DATA-MIGRATION.md`
11. `docs/09-testing-quality/TEST-STRATEGY.md`
12. Infrastructure, CI/CD, security, and project-management documents.

## Important

This is a migration blueprint, not a claim that the repository has already been changed. Before moving code, re-check the current branch, models, migrations, serializers, views, tests, and environment configuration. The actual repository and database schema are the source of truth.

Start with the audit phase. Do not immediately create five empty services or delete the existing monolith.
