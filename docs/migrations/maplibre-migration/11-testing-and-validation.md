# 11 — Testing and Validation

## Automated Test Suites

| Workspace | Runner | Command | Observed Result |
|---|---|---|---|
| `@ec/map-basemap` | Node 22 `node --test` | `pnpm --filter @ec/map-basemap test` | 18/18 passed (5 suites) |
| `apps/web` | Vitest + React Testing Library (`jsdom`) | `pnpm --filter web test` | 7/7 passed (2 test files: `fetch-road-route.test.ts`, `DeliveryMapView.test.tsx`) |
| `apps/admin` | Vitest + React Testing Library (`jsdom`) | `pnpm --filter admin test` | 3/3 passed (1 test file: `FleetDispatchMap.test.tsx`) |

## Lint, Typecheck & Production Builds

| Check | Command | Observed Result |
|---|---|---|
| `@ec/map-basemap` typecheck | `pnpm --filter @ec/map-basemap lint` (`tsc --noEmit`) | Passed (0 errors) |
| Workspace lint | `pnpm lint` (`turbo run lint`) | Passed (0 errors; 1 pre-existing warning in untouched `apps/web/context/AuthContext.tsx`) |
| Lockfile integrity | `pnpm install --frozen-lockfile` | Passed |
| Web production build | `pnpm --filter web build` (`next build --webpack`) | Passed (12/12 pages) |
| Admin production build | `pnpm --filter admin build` (`next build` Turbopack) | Passed (10/10 pages) |
| Worker bundle generation | `sync:worker` (`prebuild`) | Verified `apps/web/public/maplibre-gl-worker.mjs` and `apps/admin/public/maplibre-gl-worker.mjs` (550,754 bytes each) |

## Live Browser & E2E Pipeline Verification

- Executed in Task 26 against live Kubernetes deployments (`ecommerce-microservices` namespace: `web` at `http://localhost:30000`, `admin` at `http://localhost:30001`, API gateway at `http://localhost:30080/api/v1`):
  - **Gateway & Worker Endpoints:** `GET /api/v1/health` (HTTP `200`), `GET http://localhost:30000/maplibre-gl-worker.mjs` (`550,754` bytes, HTTP `200`), and `GET http://localhost:30001/maplibre-gl-worker.mjs` (`550,754` bytes, HTTP `200`).
  - **E2E Delivery Pipeline (`scripts/verify_delivery_pipeline.py` with 20s request timeout):** Passed (`exit 0`); created live Phnom Penh `OUT_FOR_DELIVERY` shipment `KH-20261126-6765` (Order `CLO-20261126-82806A`) and Siem Reap provincial shipment `KH-20261126-6247`.
  - **Customer Storefront Browser Inspection (`http://localhost:30000/tracking/KH-20261126-6765` & `/tracking/KH-20261126-6247`):**
    - Verified 1 `canvas.maplibregl-canvas` (`805.33 × 320` px) rendering OpenFreeMap Positron vector tiles with Khmer + English Phnom Penh and Cambodia labels.
    - Verified zero `.leaflet-container`, `.leaflet-pane`, or `.leaflet-tile-pane` DOM nodes.
    - Verified 3 `.maplibregl-marker` nodes (Hub, Rider/Vehicle, Destination), crisp blue OSRM route line (`Distance: 3.8 km` / `≈ 5 mins away` on `KH-20261126-6765`; `Distance: 313.5 km` / `≈ 232 mins away` on `KH-20261126-6247`), and working `Recenter` control without MapLibre/worker runtime errors (note: initial tracking page load showed pre-existing React hydration error `#418` and one missing OpenFreeMap glyph range HTTP `404`).
  - **Admin Dispatch Console Browser Inspection (`http://localhost:30001/login` → `http://localhost:30001/dispatch`):**
    - Verified 1 `canvas.maplibregl-canvas` (`1209.33 × 519.33` px) rendering OpenFreeMap Dark vector tiles cleanly.
    - Verified zero `.leaflet-container`, `.leaflet-pane`, or `.leaflet-tile-pane` DOM nodes.
    - Verified 6 `.maplibregl-marker` nodes (1 Hub + 5 couriers), interactive marker/row selection updating `CourierTelemetryDrawer` and dashed route + `easeTo`, `Reset View` camera reset, HTTP `200` on `/maplibre-gl-worker.mjs` and OpenFreeMap `styles/dark`, and zero MapLibre/JS page errors (pre-existing gateway health CORS header absence logged independently of the map).
