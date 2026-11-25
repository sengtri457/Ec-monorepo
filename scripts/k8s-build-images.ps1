<#
.SYNOPSIS
    Builds all container images for the University E-Commerce Kubernetes deployment.
.DESCRIPTION
    Builds the 5 Django microservices and 2 Next.js standalone frontends.
    Optionally loads the images directly into Minikube or Kind clusters.
#>

[CmdletBinding()]
param (
    [switch]$LoadToMinikube,
    [string]$KindCluster = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Building Kubernetes Container Images (Local Dev)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$root = Resolve-Path "$PSScriptRoot\.."

Write-Host "`n>>> Building Next.js standalone bundles for Kubernetes..." -ForegroundColor Yellow
$prevApiUrl = $env:NEXT_PUBLIC_API_URL
$prevStoreUrl = $env:NEXT_PUBLIC_STORE_URL
$prevBakongId = $env:BAKONG_ACCOUNT_ID
$prevBakongMerchant = $env:BAKONG_MERCHANT_NAME
try {
    $env:NEXT_PUBLIC_API_URL = "http://localhost:30080/api/v1"
    $env:NEXT_PUBLIC_STORE_URL = "http://localhost:30000"
    if (-not $env:BAKONG_ACCOUNT_ID) { $env:BAKONG_ACCOUNT_ID = "clothes@abaa" }
    if (-not $env:BAKONG_MERCHANT_NAME) { $env:BAKONG_MERCHANT_NAME = "Clothes Apparel Co" }

    Push-Location $root
    pnpm --filter web build
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to build Next.js web app"; exit 1 }
    pnpm --filter admin build
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to build Next.js admin app"; exit 1 }
} finally {
    Pop-Location
    $env:NEXT_PUBLIC_API_URL = $prevApiUrl
    $env:NEXT_PUBLIC_STORE_URL = $prevStoreUrl
    $env:BAKONG_ACCOUNT_ID = $prevBakongId
    $env:BAKONG_MERCHANT_NAME = $prevBakongMerchant
}

$images = @(
    @{ Name = "ec-user-service:latest"; Context = "$root\backend\services\user-service"; Dockerfile = "$root\backend\services\user-service\Dockerfile" },
    @{ Name = "ec-product-service:latest"; Context = "$root\backend\services\product-service"; Dockerfile = "$root\backend\services\product-service\Dockerfile" },
    @{ Name = "ec-order-service:latest"; Context = "$root\backend\services\order-service"; Dockerfile = "$root\backend\services\order-service\Dockerfile" },
    @{ Name = "ec-payment-service:latest"; Context = "$root\backend\services\payment-service"; Dockerfile = "$root\backend\services\payment-service\Dockerfile" },
    @{ Name = "ec-notification-service:latest"; Context = "$root\backend\services\notification-service"; Dockerfile = "$root\backend\services\notification-service\Dockerfile" },
    @{ Name = "ec-web:latest"; Context = "$root"; Dockerfile = "$root\apps\web\Dockerfile" },
    @{ Name = "ec-admin:latest"; Context = "$root"; Dockerfile = "$root\apps\admin\Dockerfile" }
)

foreach ($img in $images) {
    Write-Host "`n>>> Building $($img.Name)..." -ForegroundColor Yellow
    docker build -t $img.Name -f $img.Dockerfile $img.Context
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build $($img.Name)"
        exit 1
    }
    Write-Host "✓ $($img.Name) built successfully." -ForegroundColor Green

    if ($LoadToMinikube) {
        Write-Host ">>> Loading $($img.Name) into Minikube..." -ForegroundColor Cyan
        minikube image load $img.Name
    }

    if ($KindCluster) {
        Write-Host ">>> Loading $($img.Name) into Kind cluster '$KindCluster'..." -ForegroundColor Cyan
        kind load docker-image $img.Name --name $KindCluster
    }
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " All 7 images built successfully!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
