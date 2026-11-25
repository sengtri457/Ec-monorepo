# University E-Commerce Platform — Kubernetes Deployment & Defense Guide

**Target Environment:** Local Kubernetes (Minikube / Docker Desktop K8s / Kind / K3d)  
**Configuration Management:** Declarative Kustomize (`base` & `overlays/local`)  
**Architecture Pattern:** Database-per-Service Microservices + Standalone Next.js 16 Frontends + Unified Nginx Gateway  

---

## 1. System Architecture Overview

The system consists of **9 containerized components** orchestrated inside the dedicated `ecommerce-microservices` Kubernetes namespace:

```
                                [ Client Browser / Postman ]
                                             |
                                  (localhost:30080 or 80)
                                             |
                                  v          v          v
                        +-----------------------------------------+
                        |        API Gateway (Nginx Alpine)       |
                        |      NodePort 30080 / ClusterIP 80      |
                        +-----------------------------------------+
                          /                  |                  \
             /api/v1/*   /                   | /                 \ /admin-portal/*
                        v                    v                    v
              +-------------------+  +------------------+  +------------------+
              |   Microservices   |  |  Web Storefront  |  |   Admin Portal   |
              |   (ClusterIPs)    |  |  (NodePort 30000)|  |  (NodePort 30001)|
              +-------------------+  +------------------+  +------------------+
               |     |     |     \            |                     |
               |     |     |      \           +----------+----------+
               v     v     v       v                     |
             user  prod  order  payment  notif           |
               \     |     |       /    /                |
                \    |     |      /    /                 |
                 v   v     v     v    v                  v
              +----------------------------------------------------+
              |          PostgreSQL 16 Multi-Tenant Pod            |
              |          ClusterIP: 5432 / PVC: pgdata             |
              | (user_db, product_db, order_db, payment_db, notif) |
              +----------------------------------------------------+
```

---

## 2. Directory Structure

```text
infrastructure/kubernetes/
├── base/                                # Declarative base manifests
│   ├── kustomization.yaml               # Kustomize manifest index
│   ├── namespace.yaml                   # 'ecommerce-microservices' namespace
│   ├── storage/
│   │   └── postgres-pvc.yaml            # 5Gi PersistentVolumeClaim for Postgres
│   ├── configmaps/
│   │   ├── postgres-init-configmap.yaml # 01-init-databases.sql script
│   │   ├── services-config.yaml         # Shared microservice environment variables
│   │   └── gateway-nginx-configmap.yaml # Reverse proxy routing configuration
│   ├── secrets/
│   │   └── services-secrets.yaml        # Passwords, JWT keys, internal service key
│   ├── deployments/                     # Deployments with initContainer migrations
│   │   ├── postgres.yaml
│   │   ├── user-service.yaml
│   │   ├── product-service.yaml
│   │   ├── order-service.yaml
│   │   ├── payment-service.yaml
│   │   ├── notification-service.yaml
│   │   ├── web.yaml
│   │   ├── admin.yaml
│   │   └── gateway.yaml
│   └── services/                        # Internal ClusterIP service definitions
│       ├── postgres.yaml
│       ├── user-service.yaml
│       ├── product-service.yaml
│       ├── order-service.yaml
│       ├── payment-service.yaml
│       ├── notification-service.yaml
│       ├── web.yaml
│       ├── admin.yaml
│       └── gateway.yaml
└── overlays/
    └── local/                           # Local development environment overrides
        ├── kustomization.yaml           # References ../../base with local patches
        └── patches/                     # NodePort port bindings for local machine
            ├── gateway-nodeport.yaml    # NodePort 30080
            ├── web-nodeport.yaml        # NodePort 30000
            ├── admin-nodeport.yaml      # NodePort 30001
            └── postgres-nodeport.yaml   # NodePort 30532
```

---

## 3. Quickstart Deployment Guide

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed and running.
- A running Kubernetes cluster (Docker Desktop Kubernetes, Minikube, or Kind).
- `kubectl` CLI installed.

### Step 1: Build Local Container Images
Build the 7 container images locally:

**On Windows (PowerShell):**
```powershell
.\scripts\k8s-build-images.ps1
```
*(If using Minikube: `.\scripts\k8s-build-images.ps1 -LoadToMinikube`)*

**On Linux / macOS (Bash):**
```bash
chmod +x ./scripts/*.sh
./scripts/k8s-build-images.sh
```

### Step 2: Deploy to Kubernetes
Deploy all resources, initialize databases, execute migrations, and launch pods:

**On Windows (PowerShell):**
```powershell
.\scripts\k8s-deploy.ps1
```

**On Linux / macOS (Bash):**
```bash
./scripts/k8s-deploy.sh
```

**Manual `kubectl` Equivalent:**
```bash
kubectl apply -k infrastructure/kubernetes/overlays/local
```

### Step 3: Monitor Pod Rollout
Verify that all pods have reached the `Running` state:
```bash
kubectl get pods -n ecommerce-microservices -w
```

Example expected output:
```text
NAME                                    READY   STATUS    RESTARTS   AGE
admin-784f9b8c6d-x4k12                  1/1     Running   0          45s
gateway-6cb8f9d55b-8z9pn                1/1     Running   0          45s
notification-service-589cb6f64b-v7q2p   1/1     Running   0          50s
order-service-6d8b9d846b-f4b7k          1/1     Running   0          50s
payment-service-598bc76d49-m8c1s        1/1     Running   0          50s
postgres-6d4b9f788b-2x1l0               1/1     Running   0          65s
product-service-678b4d8f99-p1b8z        1/1     Running   0          50s
user-service-76b89c744f-k9x0w           1/1     Running   0          50s
web-5d9c74bf6b-w3l10                    1/1     Running   0          45s
```

---

## 4. Application Access Endpoints

Once deployed, the applications are immediately accessible via their NodePort mappings:

| Component | URL | Notes |
| :--- | :--- | :--- |
| **Unified API Gateway** | [http://localhost:30080](http://localhost:30080) | Central reverse proxy routing API and web traffic |
| **Customer Web Storefront** | [http://localhost:30000](http://localhost:30000) | Next.js 16 Customer Shopping Experience |
| **Admin Management Portal** | [http://localhost:30001](http://localhost:30001) | Next.js 16 Staff Dashboard & Order Dispatch |
| **API Health Probe** | [http://localhost:30080/api/v1/health](http://localhost:30080/api/v1/health) | Nginx gateway and upstream service health check |
| **PostgreSQL Database** | `localhost:30532` | Exposed for local DBeaver or psql debugging |

### Standard Port 80 Port-Forwarding (Optional)
To browse the platform seamlessly on `http://localhost`:
```bash
kubectl port-forward svc/gateway 80:80 -n ecommerce-microservices
```

---

## 5. Architectural Defense Questions & University Viva Q&A

### Q1: How did you solve database startup race conditions in Kubernetes?
**Answer:** In microservice architectures, Django containers can crash with `OperationalError: connection refused` if they start before PostgreSQL is ready or before database schemas exist. We solved this using native Kubernetes **`initContainers`** (`wait-and-migrate`) on each microservice pod. The `initContainer` polls the `postgres:5432` socket until it is receptive, executes `python manage.py migrate --noinput`, and exits cleanly. Only after the migration finishes successfully does Kubernetes start the application container to handle HTTP traffic.

### Q2: Why choose Kustomize over Helm for this deployment?
**Answer:** Kustomize is natively integrated directly into `kubectl` (`kubectl apply -k`), requiring zero third-party CLI installations or package registries. It adopts a declarative template-free overlay approach (`base/` for production foundations and `overlays/local/` for local machine patches like NodePort mappings), eliminating templating syntax errors and making the manifests auditable and reproducible.

### Q3: How is database multi-tenancy enforced?
**Answer:** In accordance with the cloud-native "Database-per-Service" pattern, a single high-performance PostgreSQL pod manages 5 isolated databases (`user_db`, `product_db`, `order_db`, `payment_db`, `notification_db`) with independent database credentials. A Kubernetes ConfigMap mounts `01-init-databases.sql` to `/docker-entrypoint-initdb.d/` on pod creation, ensuring each service only has permission to read and write its own domain data.

### Q4: How is security handled at the Kubernetes Gateway perimeter?
**Answer:** The Nginx Gateway strictly rejects unauthorized access to internal service-to-service endpoints (`/internal/` returns 403 Forbidden). It strips spoofable headers (`X-Internal-Service-Key`, `X-User-Role`) from external HTTP requests and enforces rate-limiting zones (`auth_limit` and `api_limit`) to protect against brute-force and denial-of-service attempts.

---

## 6. Teardown & Maintenance

To completely remove the deployment from your cluster:

**On Windows (PowerShell):**
```powershell
.\scripts\k8s-teardown.ps1
```
*(To also remove the 5Gi database volume: `.\scripts\k8s-teardown.ps1 -DeleteVolumes`)*

**On Linux / macOS (Bash):**
```bash
./scripts/k8s-teardown.sh
```
