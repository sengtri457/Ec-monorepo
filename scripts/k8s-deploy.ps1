<#
.SYNOPSIS
    Deploys the full-stack e-commerce system to Kubernetes using Kustomize.
.DESCRIPTION
    Applies the local development overlay, waits for all pod rollouts to stabilize,
    and displays active access endpoints.
#>

[CmdletBinding()]
param (
    [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Deploying University E-Commerce to Kubernetes" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check kubectl connectivity
try {
    $clusterInfo = kubectl cluster-info 2>&1
    Write-Host "Connected to Kubernetes cluster." -ForegroundColor Green
} catch {
    Write-Error "Could not connect to a running Kubernetes cluster. Please start Minikube, Docker Desktop K8s, or Kind."
    exit 1
}

# 2. Sync optional Google OAuth credentials from local .env if present
$root = Resolve-Path "$PSScriptRoot\.."
$overlayPath = "$root\infrastructure\kubernetes\overlays\local"

$googleClientId = $env:GOOGLE_CLIENT_ID
$googleClientSecret = $env:GOOGLE_CLIENT_SECRET
foreach ($envFile in @("$root\backend\services\user-service\.env", "$root\infrastructure\docker\.env", "$root\.env")) {
    if ((Test-Path $envFile) -and (-not $googleClientId -or -not $googleClientSecret)) {
        Get-Content $envFile | ForEach-Object {
            if (-not $googleClientId -and $_ -match '^GOOGLE_CLIENT_ID=(.+)$') { $googleClientId = $matches[1].Trim().Trim('"').Trim("'") }
            if (-not $googleClientSecret -and $_ -match '^GOOGLE_CLIENT_SECRET=(.+)$') { $googleClientSecret = $matches[1].Trim().Trim('"').Trim("'") }
        }
    }
}
if ($googleClientId -and $googleClientSecret) {
    Write-Host "`n>>> Syncing Google OAuth credentials into Secret/google-oauth-secrets..." -ForegroundColor Yellow
    kubectl create namespace ecommerce-microservices --dry-run=client -o yaml | kubectl apply -f - | Out-Null
    kubectl create secret generic google-oauth-secrets `
        --namespace ecommerce-microservices `
        --from-literal="GOOGLE_CLIENT_ID=$googleClientId" `
        --from-literal="GOOGLE_CLIENT_SECRET=$googleClientSecret" `
        --dry-run=client -o yaml | kubectl apply -f - | Out-Null
}

# 3. Apply Kustomize Overlay
Write-Host "`n>>> Applying Kustomize configuration from $overlayPath..." -ForegroundColor Yellow
kubectl apply -k $overlayPath
if ($LASTEXITCODE -ne 0) {
    Write-Error "kubectl apply -k failed."
    exit 1
}

# 3. Wait for database readiness first
Write-Host "`n>>> Waiting for PostgreSQL database pod rollout..." -ForegroundColor Yellow
kubectl rollout status deployment/postgres -n ecommerce-microservices --timeout="${TimeoutSeconds}s"

# 4. Wait for all microservices rollouts
$deployments = @(
    "user-service",
    "product-service",
    "order-service",
    "payment-service",
    "notification-service",
    "web",
    "admin",
    "gateway"
)

foreach ($dep in $deployments) {
    Write-Host ">>> Waiting for deployment/$dep rollout..." -ForegroundColor Yellow
    kubectl rollout status "deployment/$dep" -n ecommerce-microservices --timeout="${TimeoutSeconds}s"
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Namespace: ecommerce-microservices" -ForegroundColor Cyan
Write-Host "`nAccess Endpoints (NodePort Local Access):" -ForegroundColor Cyan
Write-Host "  • Unified Gateway:  http://localhost:30080" -ForegroundColor White
Write-Host "  • Web Storefront:   http://localhost:30000" -ForegroundColor White
Write-Host "  • Admin Portal:     http://localhost:30001" -ForegroundColor White
Write-Host "  • API Health Check: http://localhost:30080/api/v1/health" -ForegroundColor White
Write-Host "`nPort Forwarding Shortcut (Optional):" -ForegroundColor Gray
Write-Host "  kubectl port-forward svc/gateway 80:80 -n ecommerce-microservices" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green
