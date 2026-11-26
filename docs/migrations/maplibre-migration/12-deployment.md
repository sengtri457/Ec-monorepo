# 12 — Deployment & Worker Asset Packaging

## MapLibre Web Worker Handling

- Both `apps/web/package.json` and `apps/admin/package.json` run `sync:worker` on `predev`, `prebuild`, and root `postinstall`, copying `maplibre-gl/dist/maplibre-gl-worker.mjs` (550,754 bytes) to `public/maplibre-gl-worker.mjs`.
- Generated worker bundles are excluded from Git via `.gitignore` (`apps/*/public/maplibre-gl-worker.mjs`) and ESLint `globalIgnores`.
- `createMap()` in `@ec/map-basemap` calls `setWorkerUrl("/maplibre-gl-worker.mjs")` before instantiating `Map`.

## Docker & Kubernetes Packaging

- `apps/web/Dockerfile` and `apps/admin/Dockerfile` copy `.next/standalone`, `.next/static`, and `public/` (`apps/web/public` / `apps/admin/public`), ensuring `/maplibre-gl-worker.mjs` is served same-origin from the container.
- Configurable runtime/build environment variables:
  - `NEXT_PUBLIC_MAP_STYLE_URL` (customer style override, defaults to OpenFreeMap Positron)
  - `NEXT_PUBLIC_ADMIN_MAP_STYLE_URL` (admin style override, defaults to OpenFreeMap Dark)
  - `OSRM_BASE_URL` (server-side routing base URL, defaults to `https://router.project-osrm.org`)

## Rollout Procedure

1. Run `scripts/k8s-build-images.ps1` (or `pnpm --filter web build`, `pnpm --filter admin build`, `docker build` for `ec-web:latest` and `ec-admin:latest`).
2. Restart deployments in `ecommerce-microservices`:
   ```powershell
   kubectl rollout restart deployment/web deployment/admin -n ecommerce-microservices
   kubectl rollout status deployment/web -n ecommerce-microservices --timeout=180s
   kubectl rollout status deployment/admin -n ecommerce-microservices --timeout=180s
   ```
3. Verify live routes `http://localhost:30000/tracking/<trackingNumber>` and `http://localhost:30001/dispatch`.
