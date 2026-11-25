#!/usr/bin/env bash
# ==============================================================================
# Tears down the Kubernetes deployment for the e-commerce system.
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OVERLAY_PATH="${ROOT_DIR}/infrastructure/kubernetes/overlays/local"

echo "=========================================================="
echo " Tearing Down University E-Commerce Kubernetes Stack"
echo "=========================================================="

echo ">>> Deleting Kubernetes resources via Kustomize..."
kubectl delete -k "${OVERLAY_PATH}" --ignore-not-found

if [[ "${1:-}" == "--delete-volumes" ]]; then
  echo ">>> Deleting Persistent Volume Claim (postgres-pvc)..."
  kubectl delete pvc postgres-pvc -n ecommerce-microservices --ignore-not-found
fi

echo "=========================================================="
echo " Teardown Completed."
echo "=========================================================="
