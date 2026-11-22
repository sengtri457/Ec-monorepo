# Local Development Infrastructure

## 1. Recommended stack

- Docker Desktop with WSL2 on Windows, or Docker Engine on Linux.
- Docker Compose.
- PostgreSQL.
- Nginx.
- Five Django services.
- Optional Prometheus and Grafana profile.

A 16 GB RAM laptop is a comfortable target. An 8 GB machine may work with fewer containers active and monitoring disabled.

## 2. Expected Compose services

- `gateway`
- `user-service`
- `product-service`
- `order-service`
- `payment-service`
- `notification-service`
- `postgres`

One PostgreSQL container may host five separate databases for the university demonstration. Each service must still have credentials restricted to its own database.

## 3. Environment variables

Each service should have its own `.env.example`, for example:

```env
DJANGO_SECRET_KEY=replace-for-local-development
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=user_db
DB_USER=user_service_user
DB_PASSWORD=change_me
DB_HOST=postgres
DB_PORT=5432
```

Use service-specific values. Do not configure every service to use the same database.

Service URL examples:

```env
USER_SERVICE_URL=http://user-service:8000
PRODUCT_SERVICE_URL=http://product-service:8000
ORDER_SERVICE_URL=http://order-service:8000
PAYMENT_SERVICE_URL=http://payment-service:8000
NOTIFICATION_SERVICE_URL=http://notification-service:8000
```

These are Docker-network URLs. Expose the gateway to the host for browser access.

## 4. Startup workflow

Once the Compose file exists:

```bash
docker compose -f infrastructure/docker/docker-compose.yml build
docker compose -f infrastructure/docker/docker-compose.yml up -d
docker compose -f infrastructure/docker/docker-compose.yml ps
docker compose -f infrastructure/docker/docker-compose.yml logs -f
```

Run each service's migrations using its container or documented management command.

## 5. Resource management

- Start without Prometheus/Grafana.
- Use one PostgreSQL container with separate databases.
- Keep worker counts low for local development.
- Do not run Docker Compose and Minikube stacks simultaneously unless the machine has enough memory.
- Stop unused containers when focusing on one service.

## 6. Health endpoints

Each service should expose a lightweight `/health/` endpoint. A separate readiness check may verify its database connection.
