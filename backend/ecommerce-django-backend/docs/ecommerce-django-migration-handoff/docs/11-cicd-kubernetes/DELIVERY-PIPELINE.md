# CI/CD and Kubernetes Delivery

## 1. GitHub Actions

Start with a small pipeline:
1. Trigger on pull requests to `development`.
2. Install dependencies for changed services, or all backend services initially.
3. Run lint/basic checks if configured.
4. Run Django tests.
5. Build Docker images.
6. Optionally push images after merge, using repository secrets.

Do not put credentials in workflow YAML. Use GitHub Actions secrets.

Suggested files:
- `.github/workflows/backend-tests.yml`
- `.github/workflows/build-images.yml`

## 2. Kubernetes resources

For the university demonstration, create:
- Namespace.
- ConfigMaps for non-secret configuration.
- Secrets for passwords and keys.
- Deployment per service.
- ClusterIP Service per backend service.
- Gateway/Ingress exposure.
- Optional monitoring Deployment and Service.

Use resource requests and limits suitable for Minikube. Avoid production-scale replicas.

## 3. Suggested manifest structure

```text
infrastructure/kubernetes/
├── namespace.yaml
├── configmaps/
│   └── services-config.yaml
├── secrets/
│   └── README.md
├── deployments/
│   ├── user-service.yaml
│   ├── product-service.yaml
│   ├── order-service.yaml
│   ├── payment-service.yaml
│   └── notification-service.yaml
├── services/
│   ├── user-service.yaml
│   ├── product-service.yaml
│   ├── order-service.yaml
│   ├── payment-service.yaml
│   └── notification-service.yaml
└── ingress/
    └── gateway-ingress.yaml
```

Do not commit real secret values. For a local classroom demo, create secrets with `kubectl` and document the commands without recording secret values.

## 4. Minikube demonstration

Demonstrate:
- Cluster status.
- Namespace and pods.
- Services.
- Gateway access.
- A successful API request.
- Logs from one service.
- A rollout or restart.

Kubernetes is a deployment requirement, not a reason to introduce complex distributed infrastructure.

## 5. Monitoring

Minimum demonstration:
- Prometheus scrapes metrics where supported.
- Grafana displays basic service or container metrics.
- Show availability, request metrics if instrumented, and resource usage.

Do not claim application-level metrics exist until instrumentation is implemented.
