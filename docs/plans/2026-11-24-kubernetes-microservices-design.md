# Kubernetes Microservices Full-Stack Architecture Design

**Date:** 2026-11-24  
**Author:** Senior System Designer & Full-Stack Developer  
**Status:** Approved (Approach 1: Production-Grade Microservices Architecture with Kustomize, InitContainers, & Unified Gateway)  
**Target Environment:** Local Kubernetes Cluster (Minikube / Docker Desktop K8s / Kind / K3d)  

---

## 1. Context & Objectives

The university e-commerce project consists of:
- **5 Django Microservices**: `user-service` (:8001), `product-service` (:8002), `order-service` (:8003), `payment-service` (:8004), `notification-service` (:8005).
- **1 Shared PostgreSQL Instance** hosting 5 discrete databases (`user_db`, `product_db`, `order_db`, `payment_db`, `notification_db`).
- **1 Nginx API Gateway** routing `/api/v1/*` to individual backend services.
- **2 Next.js 16 Applications**: `apps/web` (customer storefront) and `apps/admin` (back-office management portal).

This design transitions the entire stack from Docker Compose to a clean, declarative **Kubernetes (K8s)** architecture managed via **Kustomize**, suitable for academic defense, local demonstration, and production extension.

---

## 2. Architectural Blueprint

```
                                  [ Client Browser ]
                                          |
                                    (localhost:80)
                                          |
                                    v     v     v
                         +---------------------------------+
                         |      K8s Gateway (Nginx)        |
                         |  ClusterIP / NodePort 30080     |
                         +---------------------------------+
                           /              |              \
             /api/v1/*    /               | /             \ /admin-portal/*
                         v                v                v
                 [Microservices]    [Web Storefront]    [Admin Portal]
                 (ClusterIPs)       (ClusterIP:3000)    (ClusterIP:3001)
                         |
           +-------------+-------------+
           |             |             |
           v             v             v
      user-service  product-service order-service payment-service notification-service
           \             |             |              |             /
            \            |             |              |            /
             +-----------+-------------+--------------+-----------+
                                       |
                                       v
                              [PostgreSQL (K8s)]
                              (ClusterIP: 5432)
                           Mounted PVC: pgdata-pvc
                    Init ConfigMap: 01-init-databases.sql
```

---

## 3. Key Components & Engineering Specifications

### 3.1 Multi-Tenant Database & Storage
- **Postgres Deployment / StatefulSet**:
  - Image: `postgres:16-alpine`.
  - Storage: `PersistentVolumeClaim` (`postgres-pvc`, 5Gi ReadWriteOnce, local-path/standard storage class).
  - Initialization: ConfigMap `postgres-init-configmap` populated with `infrastructure/postgres/init/01-init-databases.sql`.
  - Health checks: Readiness probe `pg_isready -U postgres` and liveness probe.

### 3.2 Database Migration Strategy (InitContainers)
To prevent startup race conditions where microservices receive HTTP requests before their Django database schemas exist:
- Every Django microservice pod contains an `initContainer`:
  ```yaml
  initContainers:
    - name: wait-and-migrate
      image: <service-image>:latest
      imagePullPolicy: IfNotPresent
      command: ["sh", "-c", "python manage.py migrate --noinput"]
      envFrom:
        - configMapRef:
            name: services-config
      env:
        - name: DB_NAME
          value: "<service_db>"
        - name: DB_USER
          value: "<service_user>"
        # ...
  ```
- The main Django container only starts *after* the `initContainer` migration finishes with exit code 0.

### 3.3 Containerization of Frontends
- **`apps/web` Dockerfile**:
  - Multi-stage build (Node 20 Alpine).
  - Uses `standalone` output mode to bundle dependencies into a lean container (~120MB).
  - Exposes port 3000.
- **`apps/admin` Dockerfile**:
  - Multi-stage build (Node 20 Alpine).
  - Uses `standalone` output mode.
  - Exposes port 3001.

### 3.4 Unified API Gateway & Ingress
- ConfigMap `gateway-configmap` mounts a tailored `nginx.conf`:
  - Upstreams:
    - `user-service:8000`
    - `product-service:8000`
    - `order-service:8000`
    - `payment-service:8000`
    - `notification-service:8000`
    - `web:3000`
    - `admin:3001`
  - Routes:
    - `/api/v1/auth/`, `/api/v1/users/`, `/api/v1/addresses/` -> `user-service`
    - `/api/v1/products/`, `/api/v1/categories/`, `/api/v1/inventory/` -> `product-service`
    - `/api/v1/orders/`, `/api/v1/shipping-methods/` -> `order-service`
    - `/api/v1/payments/` -> `payment-service`
    - `/api/v1/notifications/` -> `notification-service`
    - `/api/v1/health` -> Nginx status / upstream health
    - `/admin-portal/` -> `admin` service
    - `/` -> `web` storefront service

### 3.5 Declarative Packaging with Kustomize
- `infrastructure/kubernetes/base/`:
  - Shared declarations: `kustomization.yaml`, `namespace.yaml`, configmaps, secrets, storage, deployments, and services.
- `infrastructure/kubernetes/overlays/local/`:
  - Local overrides: `imagePullPolicy: IfNotPresent`, NodePort service mappings for gateway (`nodePort: 30080`), web (`nodePort: 30000`), admin (`nodePort: 30001`), postgres (`nodePort: 30532`), resource limits tuned for laptop development.

---

## 4. Automation & Verification Tooling

1. `scripts/k8s-build-images.ps1` & `scripts/k8s-build-images.sh`:
   - Builds all 7 container images locally: `ec-user-service`, `ec-product-service`, `ec-order-service`, `ec-payment-service`, `ec-notification-service`, `ec-web`, `ec-admin`, `ec-gateway`.
2. `scripts/k8s-deploy.ps1` & `scripts/k8s-deploy.sh`:
   - Executes `kubectl apply -k infrastructure/kubernetes/overlays/local`.
   - Waits for pod rollouts with `kubectl rollout status`.
3. `scripts/k8s-teardown.ps1` & `scripts/k8s-teardown.sh`:
   - Graceful deletion via `kubectl delete -k infrastructure/kubernetes/overlays/local`.
4. `docs/kubernetes-deployment-guide.md`:
   - Comprehensive documentation for university defense with troubleshooting and verification commands.
