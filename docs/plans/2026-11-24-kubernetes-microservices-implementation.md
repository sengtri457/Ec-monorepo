# Kubernetes Microservices Full-Stack Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Transform the e-commerce microservices platform into a production-grade, Kustomize-managed Kubernetes deployment encompassing all 5 Django microservices, PostgreSQL with persistent volumes & init scripts, Nginx API Gateway, and both Next.js frontends.

**Architecture:** A modular Kubernetes architecture organized with Kustomize (`base` and `overlays/local`). Microservices utilize `initContainers` for automated database migrations before service availability. Frontend applications are built with lean multi-stage Dockerfiles. Nginx operates as a unified API Gateway and reverse proxy routing traffic across frontends and microservices.

**Tech Stack:** Kubernetes (v1.28+), Kustomize, Docker, PostgreSQL 16 Alpine, Django 5.x / Python 3.12, Next.js 16 / Node.js 20, Nginx Alpine, PowerShell / Bash automation.

---

### Task 1: Containerize Next.js Frontend Applications

**Files:**
- Create: `apps/web/Dockerfile`
- Create: `apps/admin/Dockerfile`
- Create: `apps/web/.dockerignore`
- Create: `apps/admin/.dockerignore`
- Modify: `apps/web/next.config.mjs`
- Modify: `apps/admin/next.config.ts`

**Step 1: Enable standalone output in `apps/web/next.config.mjs` and `apps/admin/next.config.ts`**
Ensure Next.js generates standalone bundles for lightweight container deployment.

**Step 2: Create multi-stage Dockerfiles**
Define builder and runner stages using Node 20 Alpine.

**Step 3: Test local production build of frontends**
Run: `pnpm --filter web build; pnpm --filter admin build`
Expected: PASS with `.next/standalone` created.

**Step 4: Commit**
```bash
git add apps/web/Dockerfile apps/admin/Dockerfile apps/web/.dockerignore apps/admin/.dockerignore apps/web/next.config.mjs apps/admin/next.config.ts
git commit -m "feat(k8s): add standalone nextjs dockerfiles and dockerignore for web and admin"
```

---

### Task 2: Multi-Tenant Database Storage & Initialization Manifests

**Files:**
- Create: `infrastructure/kubernetes/base/storage/postgres-pvc.yaml`
- Create: `infrastructure/kubernetes/base/configmaps/postgres-init-configmap.yaml`
- Create: `infrastructure/kubernetes/base/secrets/services-secrets.yaml`
- Create: `infrastructure/kubernetes/base/deployments/postgres.yaml`
- Create: `infrastructure/kubernetes/base/services/postgres.yaml`

**Step 1: Create PostgreSQL PersistentVolumeClaim**
Define `postgres-pvc` with 5Gi storage request.

**Step 2: Create Postgres init ConfigMap**
Mount `01-init-databases.sql` to initialize `user_db`, `product_db`, `order_db`, `payment_db`, and `notification_db`.

**Step 3: Implement Postgres Deployment & Service**
Attach PVC to `/var/lib/postgresql/data` and ConfigMap to `/docker-entrypoint-initdb.d`. Define readiness and liveness probes.

**Step 4: Verify YAML syntax**
Run: `kubectl apply --dry-run=client -f infrastructure/kubernetes/base/storage/ -f infrastructure/kubernetes/base/deployments/postgres.yaml` (or syntax validator)
Expected: PASS.

**Step 5: Commit**
```bash
git add infrastructure/kubernetes/base/storage/ infrastructure/kubernetes/base/configmaps/postgres-init-configmap.yaml infrastructure/kubernetes/base/deployments/postgres.yaml infrastructure/kubernetes/base/services/postgres.yaml infrastructure/kubernetes/base/secrets/services-secrets.yaml
git commit -m "feat(k8s): implement postgres persistence, database init configmap, and service"
```

---

### Task 3: Django Microservice Manifests with InitContainer Migrations

**Files:**
- Create: `infrastructure/kubernetes/base/configmaps/services-config.yaml`
- Create: `infrastructure/kubernetes/base/deployments/user-service.yaml`
- Create: `infrastructure/kubernetes/base/services/user-service.yaml`
- Create: `infrastructure/kubernetes/base/deployments/product-service.yaml`
- Create: `infrastructure/kubernetes/base/services/product-service.yaml`
- Create: `infrastructure/kubernetes/base/deployments/order-service.yaml`
- Create: `infrastructure/kubernetes/base/services/order-service.yaml`
- Create: `infrastructure/kubernetes/base/deployments/payment-service.yaml`
- Create: `infrastructure/kubernetes/base/services/payment-service.yaml`
- Create: `infrastructure/kubernetes/base/deployments/notification-service.yaml`
- Create: `infrastructure/kubernetes/base/services/notification-service.yaml`

**Step 1: Consolidate shared ConfigMap for microservices**
Configure URLs, database hosts, ports, and common settings.

**Step 2: Implement Deployment manifests with `wait-and-migrate` initContainers**
Configure each deployment with an `initContainer` executing `python manage.py migrate --noinput` followed by the application container.

**Step 3: Define ClusterIP services for all 5 services**
Expose port 8000 for internal cluster communication.

**Step 4: Validate microservice manifests**
Expected: Clean validation across all 5 deployments and services.

**Step 5: Commit**
```bash
git add infrastructure/kubernetes/base/deployments/ infrastructure/kubernetes/base/services/ infrastructure/kubernetes/base/configmaps/services-config.yaml
git commit -m "feat(k8s): configure django microservice deployments with migration initcontainers"
```

---

### Task 4: Unified Gateway & Frontend Kubernetes Manifests

**Files:**
- Create: `infrastructure/kubernetes/base/configmaps/gateway-nginx-configmap.yaml`
- Create: `infrastructure/kubernetes/base/deployments/gateway.yaml`
- Create: `infrastructure/kubernetes/base/services/gateway.yaml`
- Create: `infrastructure/kubernetes/base/deployments/web.yaml`
- Create: `infrastructure/kubernetes/base/services/web.yaml`
- Create: `infrastructure/kubernetes/base/deployments/admin.yaml`
- Create: `infrastructure/kubernetes/base/services/admin.yaml`

**Step 1: Create Nginx Gateway ConfigMap**
Route `/api/v1/` to microservices, `/` to `web:3000`, `/admin-portal/` to `admin:3001`, and `/health` to Nginx status.

**Step 2: Implement Gateway Deployment and Service**
Mount `gateway-nginx-configmap` to `/etc/nginx/nginx.conf`. Expose port 80.

**Step 3: Implement Web Storefront & Admin Portal Deployments and Services**
Deploy Next.js apps with proper environment variables and resource constraints.

**Step 4: Commit**
```bash
git add infrastructure/kubernetes/base/configmaps/gateway-nginx-configmap.yaml infrastructure/kubernetes/base/deployments/ infrastructure/kubernetes/base/services/
git commit -m "feat(k8s): implement unified gateway and frontend web and admin manifests"
```

---

### Task 5: Kustomize Base & Local Overlay Setup

**Files:**
- Create: `infrastructure/kubernetes/base/kustomization.yaml`
- Create: `infrastructure/kubernetes/overlays/local/kustomization.yaml`
- Create: `infrastructure/kubernetes/overlays/local/patches/gateway-nodeport.yaml`
- Create: `infrastructure/kubernetes/overlays/local/patches/web-nodeport.yaml`
- Create: `infrastructure/kubernetes/overlays/local/patches/admin-nodeport.yaml`

**Step 1: Create base `kustomization.yaml`**
Aggregate all resources into the `ecommerce-microservices` namespace.

**Step 2: Create local overlay with NodePort mappings**
Map Gateway to NodePort 30080, Web to 30000, and Admin to 30001 for effortless local cluster access.

**Step 3: Test Kustomize manifest build**
Run: `kubectl kustomize infrastructure/kubernetes/overlays/local`
Expected: Generates a complete, valid multi-document Kubernetes YAML stream without errors.

**Step 4: Commit**
```bash
git add infrastructure/kubernetes/base/kustomization.yaml infrastructure/kubernetes/overlays/
git commit -m "feat(k8s): configure kustomize base and local development overlays"
```

---

### Task 6: Build & Deployment Automation Scripts

**Files:**
- Create: `scripts/k8s-build-images.ps1`
- Create: `scripts/k8s-build-images.sh`
- Create: `scripts/k8s-deploy.ps1`
- Create: `scripts/k8s-deploy.sh`
- Create: `scripts/k8s-teardown.ps1`
- Create: `scripts/k8s-teardown.sh`

**Step 1: Write cross-platform image build scripts**
Automate building `ec-user-service`, `ec-product-service`, `ec-order-service`, `ec-payment-service`, `ec-notification-service`, `ec-web`, `ec-admin`.

**Step 2: Write deployment and teardown scripts**
Apply Kustomize manifests and wait for pod rollout completion.

**Step 3: Commit**
```bash
git add scripts/k8s-*
git commit -m "feat(scripts): add automated cross-platform kubernetes build, deploy, and teardown scripts"
```

---

### Task 7: Full Deployment Verification & University Presentation Guide

**Files:**
- Create: `docs/kubernetes-deployment-guide.md`
- Test: Validate all manifests via `kubectl kustomize`
- Update: `docs/plans/task.md`

**Step 1: Write the University Deployment Guide**
Detailed guide explaining architecture, Minikube/Docker Desktop setup, migration mechanics, service mesh concepts, and commands for presentation.

**Step 2: Validate Kustomize and all manifest outputs**
Run `kubectl kustomize infrastructure/kubernetes/overlays/local` to verify zero YAML formatting or schema errors.

**Step 3: Update Task Tracker and Commit**
```bash
git add docs/kubernetes-deployment-guide.md docs/plans/task.md
git commit -m "docs(k8s): complete kubernetes deployment guide and mark implementation tasks complete"
```
