# E-Commerce Microservices Architecture

This directory houses the independent Django microservices extracted from the legacy monolith (`ecommerce-django-backend`), following the university migration blueprint.

## Microservices Directory

| Service | Port | Database | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **`user-service/`** | 8001 | `user_db` | User accounts, authentication, JWT tokens, customer addresses |
| **`product-service/`** | 8002 | `product_db` | Product catalog, variants, images, stock management, stock reservations |
| **`order-service/`** | 8003 | `order_db` | Cart, shipping methods, checkout orchestration, order snapshots, status history |
| **`payment-service/`** | 8004 | `payment_db` | Payment records, Bakong KHQR EMVCo generation & MD5 verification, callbacks |
| **`notification-service/`** | 8005 | `notification_db` | Email & Telegram notification dispatch, delivery history |

## Quick Start (Docker Compose)

From the project root:

```bash
# Build and run all services + postgres + gateway
docker compose -f infrastructure/docker/docker-compose.yml up --build -d

# Check running status
docker compose -f infrastructure/docker/docker-compose.yml ps

# View gateway and service logs
docker compose -f infrastructure/docker/docker-compose.yml logs -f
```

## Running Tests Locally

Each service can be tested independently:

```bash
cd backend/services/user-service && pytest
cd backend/services/product-service && pytest
cd backend/services/order-service && pytest
cd backend/services/payment-service && pytest
cd backend/services/notification-service && pytest
```

## Kubernetes (Minikube) Deployment

```bash
# 1. Apply namespace, configmaps, and secrets
kubectl apply -f infrastructure/kubernetes/namespace.yaml
kubectl apply -f infrastructure/kubernetes/configmaps/
kubectl apply -f infrastructure/kubernetes/secrets/

# 2. Deploy Postgres, microservices, and gateway
kubectl apply -f infrastructure/kubernetes/deployments/
kubectl apply -f infrastructure/kubernetes/services/
kubectl apply -f infrastructure/kubernetes/ingress/

# 3. Deploy Observability Stack (Prometheus + Grafana)
kubectl apply -f infrastructure/monitoring/prometheus/
kubectl apply -f infrastructure/monitoring/grafana/
```
