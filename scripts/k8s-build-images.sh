#!/usr/bin/env bash
# ==============================================================================
# Builds all container images for the University E-Commerce Kubernetes deployment.
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=========================================================="
echo " Building Kubernetes Container Images (Local Dev)"
echo "=========================================================="

echo ""
echo ">>> Building Next.js standalone bundles for Kubernetes..."
(
  cd "${ROOT_DIR}"
  export NEXT_PUBLIC_API_URL="http://localhost:30080/api/v1"
  export NEXT_PUBLIC_STORE_URL="http://localhost:30000"
  export BAKONG_ACCOUNT_ID="${BAKONG_ACCOUNT_ID:-clothes@abaa}"
  export BAKONG_MERCHANT_NAME="${BAKONG_MERCHANT_NAME:-Clothes Apparel Co}"
  pnpm --filter web build
  pnpm --filter admin build
)

services=(
  "ec-user-service:latest:backend/services/user-service:backend/services/user-service/Dockerfile"
  "ec-product-service:latest:backend/services/product-service:backend/services/product-service/Dockerfile"
  "ec-order-service:latest:backend/services/order-service:backend/services/order-service/Dockerfile"
  "ec-payment-service:latest:backend/services/payment-service:backend/services/payment-service/Dockerfile"
  "ec-notification-service:latest:backend/services/notification-service:backend/services/notification-service/Dockerfile"
  "ec-web:latest:.:apps/web/Dockerfile"
  "ec-admin:latest:.:apps/admin/Dockerfile"
)

for entry in "${services[@]}"; do
  IFS=":" read -r name context dockerfile <<< "$entry"
  echo ""
  echo ">>> Building ${name}..."
  docker build -t "${name}" -f "${ROOT_DIR}/${dockerfile}" "${ROOT_DIR}/${context}"
  echo "✓ ${name} built successfully."
done

echo ""
echo "=========================================================="
echo " All 7 images built successfully!"
echo "=========================================================="
