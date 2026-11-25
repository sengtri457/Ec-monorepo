<#
.SYNOPSIS
    Tears down the Kubernetes deployment for the e-commerce system.
#>

[CmdletBinding()]
param (
    [switch]$DeleteVolumes
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Tearing Down University E-Commerce Kubernetes Stack" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$root = Resolve-Path "$PSScriptRoot\.."
$overlayPath = "$root\infrastructure\kubernetes\overlays\local"

Write-Host "`n>>> Deleting Kubernetes resources via Kustomize..." -ForegroundColor Yellow
kubectl delete -k $overlayPath --ignore-not-found

if ($DeleteVolumes) {
    Write-Host "`n>>> Deleting Persistent Volume Claim (postgres-pvc)..." -ForegroundColor Yellow
    kubectl delete pvc postgres-pvc -n ecommerce-microservices --ignore-not-found
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " Teardown Completed." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
