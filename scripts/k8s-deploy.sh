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

# 2. Sync optional Google OAuth credentials from local .env if present
read_env_val() {
  local key="$1" file="$2"
  grep -E "^${key}=" "$file" 2>/dev/null | head -n1 | cut -d'=' -f2- | sed -e 's/^[[:space:]"'\'']*//' -e 's/[[:space:]"'\'']*$//' || true
}

GOOGLE_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_SECRET="${GOOGLE_CLIENT_SECRET:-}"
for env_file in "${ROOT_DIR}/backend/services/user-service/.env" "${ROOT_DIR}/infrastructure/docker/.env" "${ROOT_DIR}/.env"; do
  if [[ -f "$env_file" ]]; then
    [[ -z "$GOOGLE_ID" ]] && GOOGLE_ID="$(read_env_val GOOGLE_CLIENT_ID "$env_file")"
    [[ -z "$GOOGLE_SECRET" ]] && GOOGLE_SECRET="$(read_env_val GOOGLE_CLIENT_SECRET "$env_file")"
  fi
done

if [[ -n "$GOOGLE_ID" && -n "$GOOGLE_SECRET" ]]; then
  echo ""
  echo ">>> Syncing Google OAuth credentials into Secret/google-oauth-secrets..."
  kubectl create namespace ecommerce-microservices --dry-run=client -o yaml | kubectl apply -f - > /dev/null
  kubectl create secret generic google-oauth-secrets \
    --namespace ecommerce-microservices \
    --from-literal="GOOGLE_CLIENT_ID=${GOOGLE_ID}" \
    --from-literal="GOOGLE_CLIENT_SECRET=${GOOGLE_SECRET}" \
    --dry-run=client -o yaml | kubectl apply -f - > /dev/null
fi

# 3. Apply Kustomize Overlay
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
