#!/usr/bin/env bash
# ==============================================================================
# Deploys the full-stack e-commerce system to Kubernetes using Kustomize.
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OVERLAY_PATH="${ROOT_DIR}/infrastructure/kubernetes/overlays/local"
TIMEOUT="180s"

echo "=========================================================="
echo " Deploying University E-Commerce to Kubernetes"
echo "=========================================================="

# 1. Check cluster connectivity
if ! kubectl cluster-info > /dev/null 2>&1; then
  echo "Error: Cannot connect to a running Kubernetes cluster. Please start Minikube, Docker Desktop K8s, or Kind." >&2
  exit 1
fi
echo "Connected to Kubernetes cluster."

# 2. Apply Kustomize Overlay
echo ""
echo ">>> Applying Kustomize configuration from ${OVERLAY_PATH}..."
kubectl apply -k "${OVERLAY_PATH}"

# 3. Wait for PostgreSQL database pod rollout
echo ""
echo ">>> Waiting for PostgreSQL database pod rollout..."
kubectl rollout status deployment/postgres -n ecommerce-microservices --timeout="${TIMEOUT}"

# 4. Wait for all microservices rollouts
deployments=(
  "user-service"
  "product-service"
  "order-service"
  "payment-service"
  "notification-service"
  "web"
  "admin"
  "gateway"
)

for dep in "${deployments[@]}"; do
  echo ">>> Waiting for deployment/${dep} rollout..."
  kubectl rollout status "deployment/${dep}" -n ecommerce-microservices --timeout="${TIMEOUT}"
done

echo ""
echo "=========================================================="
echo " Deployment Completed Successfully!"
echo "=========================================================="
echo "Namespace: ecommerce-microservices"
echo ""
echo "Access Endpoints (NodePort Local Access):"
echo "  • Unified Gateway:  http://localhost:30080"
echo "  • Web Storefront:   http://localhost:30000"
echo "  • Admin Portal:     http://localhost:30001"
echo "  • API Health Check: http://localhost:30080/api/v1/health"
echo ""
echo "Port Forwarding Shortcut (Optional):"
echo "  kubectl port-forward svc/gateway 80:80 -n ecommerce-microservices"
echo "=========================================================="
