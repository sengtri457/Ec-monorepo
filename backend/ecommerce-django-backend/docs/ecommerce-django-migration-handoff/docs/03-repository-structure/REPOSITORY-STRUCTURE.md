# Repository Structure

Use one Git repository (monorepo) for frontend, backend services, infrastructure, and documentation.

```text
ecommerce-system/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
│
├── backend/
│   ├── api-gateway/
│   │   ├── nginx.conf
│   │   └── README.md
│   │
│   └── services/
│       ├── user-service/
│       │   ├── config/
│       │   │   ├── settings/
│       │   │   ├── urls.py
│       │   │   ├── asgi.py
│       │   │   └── wsgi.py
│       │   ├── apps/accounts/
│       │   │   ├── migrations/
│       │   │   ├── tests/
│       │   │   ├── models.py
│       │   │   ├── serializers.py
│       │   │   ├── views.py
│       │   │   ├── urls.py
│       │   │   └── permissions.py
│       │   ├── tests/
│       │   ├── manage.py
│       │   ├── requirements.txt
│       │   ├── Dockerfile
│       │   └── .env.example
│       │
│       ├── product-service/
│       │   ├── config/
│       │   ├── apps/catalog/
│       │   ├── apps/inventory/
│       │   ├── tests/
│       │   ├── manage.py
│       │   ├── requirements.txt
│       │   ├── Dockerfile
│       │   └── .env.example
│       │
│       ├── order-service/
│       │   ├── config/
│       │   ├── apps/cart/
│       │   ├── apps/orders/
│       │   ├── tests/
│       │   ├── manage.py
│       │   ├── requirements.txt
│       │   ├── Dockerfile
│       │   └── .env.example
│       │
│       ├── payment-service/
│       │   ├── config/
│       │   ├── apps/payments/
│       │   ├── tests/
│       │   ├── manage.py
│       │   ├── requirements.txt
│       │   ├── Dockerfile
│       │   └── .env.example
│       │
│       └── notification-service/
│           ├── config/
│           ├── apps/notifications/
│           ├── tests/
│           ├── manage.py
│           ├── requirements.txt
│           ├── Dockerfile
│           └── .env.example
│
├── infrastructure/
│   ├── docker/
│   │   └── docker-compose.yml
│   ├── postgres/
│   │   └── init/
│   ├── kubernetes/
│   │   ├── namespace.yaml
│   │   ├── configmaps/
│   │   ├── secrets/
│   │   ├── deployments/
│   │   ├── services/
│   │   └── ingress/
│   └── monitoring/
│       ├── prometheus/
│       └── grafana/
│
├── docs/
│   ├── 00-project-overview/
│   ├── 01-current-system-audit/
│   ├── 02-architecture/
│   ├── 03-repository-structure/
│   ├── 04-service-design/
│   ├── 05-database-design/
│   ├── 06-api-contracts/
│   ├── 07-migration-roadmap/
│   ├── 08-data-migration/
│   ├── 09-testing-quality/
│   ├── 10-infrastructure/
│   ├── 11-cicd-kubernetes/
│   ├── 12-security-operations/
│   └── 13-project-management/
│
├── .github/workflows/
│   ├── backend-tests.yml
│   └── build-images.yml
├── .gitignore
└── README.md
```

## Structure rules

1. Every service has its own Django project, settings, URLConf, requirements, migrations, tests, and Dockerfile.
2. Keep domain apps inside their owning service.
3. Do not create a shared Django app that imports models across services.
4. Avoid shared runtime business logic between services.
5. Keep deployment manifests outside service source code.
6. Do not commit `.env` files, database dumps, secrets, or generated virtual environments.

## Suggested Django app layout

```text
apps/example/
├── migrations/
├── tests/
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── services.py
├── permissions.py
└── admin.py
```

Use `services.py` when business workflows need a clear home. Do not split every small function into extra layers just to follow a template. Preserve existing organization where it is already understandable.
