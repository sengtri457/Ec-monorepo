# Pure MapLibre GL JS Migration Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Remove Leaflet (`leaflet`, `@types/leaflet`, `@maplibre/maplibre-gl-leaflet`) completely and standardize customer delivery tracking (`apps/web`) and admin fleet dispatch (`apps/admin`) on pure MapLibre GL JS (`maplibre-gl@6.19.0`) via `@ec/map-basemap`.

**Architecture:** Expand `packages/map-basemap` into modular ESM utilities (`config/`, `core/`, `markers/`, `routes/`, `geo/`, `utils/`) with strict `[longitude, latitude]` WGS84 coordinates, WebGL detection, MapLibre lifecycle management, GeoJSON route helpers, and telemetry validation. Rewrite `DeliveryMapView.tsx` (light Positron) and `FleetDispatchMap.tsx` (dark) as pure MapLibre components, update `fetch-road-route.ts` to preserve native GeoJSON `[lng, lat]` coordinates with throttled re-routing, remove Leaflet packages/CSS, verify across unit/component/Cambodia-coverage tests and live browser + Kubernetes rollout, and produce `docs/migrations/maplibre-migration/`.

**Tech Stack:** TypeScript 5, Node 22 ESM (`node:test`), Vitest + React Testing Library (frontend component/action tests), `maplibre-gl@6.19.0`, Next.js 16.4.6, React 19.3.0, Tailwind CSS v4, pnpm 10.30.0 + Turborepo, Docker / Kubernetes.

---

### Task 18: Phase 0 — Branch Sync, Plan Persistence & Task Tracker Setup

**Files:**
- Create: `docs/plans/2026-11-26-maplibre-remove-leaflet.md`
- Modify: `docs/plans/task.md`

**Step 1: Sync `development` and create `feat/maplibre-remove-leaflet`**
- Sync local `development` to `origin/development` (`8fbd57a`) and create `feat/maplibre-remove-leaflet` from `beb1019` (preserving `.gitignore` for `apps/*/public/maplibre-gl-worker.mjs` and root `postinstall`).

**Step 2: Save implementation plan and update `docs/plans/task.md`**
- Persist plan to `docs/plans/2026-11-26-maplibre-remove-leaflet.md` and register Tasks 18–26 in `docs/plans/task.md`.

**Step 3: Commit Phase 0 planning docs**
Run: `git add docs/plans/2026-11-26-maplibre-remove-leaflet.md docs/plans/task.md && git commit -m "docs(plans): add pure MapLibre migration plan and task tracker"`

---

### Task 19: Phase 1 — Expand `@ec/map-basemap` with Pure MapLibre Utilities (TDD)

**Files:**
- Modify: `packages/map-basemap/package.json`
- Create: `packages/map-basemap/src/config/map-styles.mjs`
- Create: `packages/map-basemap/src/config/map-config.mjs`
- Create: `packages/map-basemap/src/geo/coordinates.mjs`
- Create: `packages/map-basemap/src/geo/validation.mjs`
- Create: `packages/map-basemap/src/geo/distance.mjs`
- Create: `packages/map-basemap/src/utils/map-errors.mjs`
- Create: `packages/map-basemap/src/core/create-map.mjs`
- Create: `packages/map-basemap/src/core/destroy-map.mjs`
- Create: `packages/map-basemap/src/markers/create-marker.mjs`
- Create: `packages/map-basemap/src/routes/route-source.mjs`
- Modify: `packages/map-basemap/src/index.mjs`
- Modify: `packages/map-basemap/src/index.d.ts`
- Modify: `packages/map-basemap/src/index.test.mjs`

**Step 1: Write failing tests in `packages/map-basemap/src/index.test.mjs`**
- Cover `OPENFREEMAP_STYLES`, `resolveStyleUrl`, `PHNOM_PENH_CENTER`, `CAMBODIA_TEST_LOCATIONS`, `toMapCoordinate`, `fromLatLng`, `isValidCoordinate`, `isValidLatLng`, `isWithinCambodiaBounds`, `validateTelemetryUpdate`, `haversineKm`, `calculateRouteDistanceKm`, `estimateDrivingMinutes`, `formatDistance`, `isWebGLSupported`, `MapInitializationError`, `createMap`, `destroyMap`, `fitMapToCoordinates`, `createHtmlMarker`, `syncCourierMarkers`, `buildRouteFeature`, `upsertRouteLayer`, and `clearRouteLayer`.

**Step 2: Run test to verify RED**
Run: `pnpm --filter @ec/map-basemap test`
Expected: FAIL because new MapLibre modules and exports do not exist yet.

**Step 3: Implement modular pure-MapLibre package files**
- Keep temporary `attachBasemapLayer` compatibility export only until Phase 6 Leaflet removal so existing apps remain compilable across commits.
- Use `attributionControl: { compact: true }` (matching `maplibre-gl@6.19.0` types).

**Step 4: Run test & typecheck to verify GREEN**
Run: `pnpm --filter @ec/map-basemap test && pnpm --filter @ec/map-basemap lint`
Expected: All tests pass, exit code 0.

**Step 5: Commit**
Run: `git add packages/map-basemap && git commit -m "feat(map): add pure MapLibre utilities to @ec/map-basemap"`

---

### Task 20: Phase 2/3 — Align OSRM `fetchRoadRoute` Server Action to Native GeoJSON `[lng, lat]` (TDD)

**Files:**
- Modify: `apps/web/app/actions/fetch-road-route.ts`
- Create: `apps/web/__tests__/fetch-road-route.test.ts`

**Step 1: Write failing unit tests for `fetchRoadRoute` and `fetchRoadRouteMetrics`**
- Verify OSRM URL passes `{originLng},{originLat};{destLng},{destLat}`.
- Verify GeoJSON `[lng, lat]` coordinates are returned unchanged (no Leaflet reversal).
- Verify OSRM `distance` & `duration` validation, non-Ok code handling, empty geometry fallback, invalid input rejection, and HTTP error resilience.

**Step 2: Run test to verify RED**
**Step 3: Update `apps/web/app/actions/fetch-road-route.ts`**
**Step 4: Run test to verify GREEN**
**Step 5: Commit**

---

### Task 21: Phase 2/5 — Migrate Customer `DeliveryMapView.tsx` & `DeliveryTrackingCard.tsx` to Pure MapLibre (TDD)

**Files:**
- Modify: `apps/web/components/delivery/DeliveryMapView.tsx`
- Modify: `apps/web/components/delivery/DeliveryTrackingCard.tsx`
- Create: `apps/web/__tests__/DeliveryMapView.test.tsx`

**Step 1: Write failing component tests for `DeliveryMapView`**
- Verify `createMap` called with `OPENFREEMAP_STYLES.light` and `setWorkerUrl("/maplibre-gl-worker.mjs")`.
- Verify Hub, Destination, and Rider DOM markers added with `[lng, lat]` coordinates.
- Verify GeoJSON route source/layer rendered (`delivery-route` / `delivery-route-line`) and updated via `setData` without duplicate layers.
- Verify live `shipment.currentLat`/`currentLng` update calls `riderMarker.setLngLat([lng, lat])` without recreating map/markers, and rejects stale timestamps.
- Verify OSRM route throttling (`< 150m` movement does not spam OSRM) and manual Recenter button calls `fitBounds`.
- Verify WebGL-unavailable fallback displays text courier/status/destination details without crashing.
- Verify unmount cleans up markers and map instance.

**Step 2: Verify RED**
**Step 3: Rewrite `DeliveryMapView.tsx` and add lightweight 10s polling when `OUT_FOR_DELIVERY` in `DeliveryTrackingCard.tsx`**
**Step 4: Verify GREEN & `pnpm --filter web lint`**
**Step 5: Commit**

---

### Task 22: Phase 4/5 — Migrate Admin `FleetDispatchMap.tsx` to Pure MapLibre (TDD)

**Files:**
- Modify: `apps/admin/components/dispatch/FleetDispatchMap.tsx`
- Modify: `apps/admin/app/globals.css`
- Create: `apps/admin/__tests__/FleetDispatchMap.test.tsx`

**Step 1: Write failing component tests for `FleetDispatchMap`**
- Verify dark style (`OPENFREEMAP_STYLES.dark`), Phnom Penh hub marker at `[104.9282, 11.5564]`, and multi-courier markers keyed by `courierId`.
- Verify position updates use `setLngLat`, new couriers add markers, vanished couriers remove markers, zero duplicate markers.
- Verify clicking courier calls `onSelectCourier`, updates selection highlight, and updates `selected-courier-route` GeoJSON line.
- Verify WebGL fallback renders selectable courier telemetry list so `CourierTelemetryDrawer` remains usable.
- Verify unmount removes markers and map instance cleanly.

**Step 2: Verify RED**
**Step 3: Rewrite `FleetDispatchMap.tsx` and remove `.ec-osm-dark-fallback` from `apps/admin/app/globals.css`**
**Step 4: Verify GREEN & `pnpm --filter admin lint`**
**Step 5: Commit**

---

### Task 23: Phase 6 — Remove Leaflet Dependencies & Obsolete References

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/admin/package.json`
- Modify: `packages/map-basemap/src/index.mjs`, `packages/map-basemap/src/index.d.ts`, `packages/map-basemap/src/index.test.mjs`
- Modify: `backend/services/order-service/apps/orders/models.py` (comment line 214 only)
- Modify: `pnpm-lock.yaml` (via `pnpm`)

**Step 1:** Run `pnpm --filter web remove leaflet @types/leaflet @maplibre/maplibre-gl-leaflet` and `pnpm --filter admin remove leaflet @types/leaflet @maplibre/maplibre-gl-leaflet`.
**Step 2:** Remove deprecated Leaflet compatibility exports from `@ec/map-basemap`.
**Step 3:** Verify repo-wide search for Leaflet imports/APIs returns zero active usages.
**Step 4:** Run `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm lint`.
**Step 5:** Commit dependency & lockfile cleanup.

---

### Task 24: Phase 7 — Full Test Suite, Cambodia Coverage Verification & Production Builds

**Step 1:** Run `pnpm --filter @ec/map-basemap test`, `pnpm test`, `pnpm lint`, `pnpm --filter web build`, `pnpm --filter admin build`.
**Step 2:** Verify `apps/web/public/maplibre-gl-worker.mjs` and `apps/admin/public/maplibre-gl-worker.mjs` exist after `prebuild`.
**Step 3:** Execute Cambodia location & OSRM routing verification script across Phnom Penh, Toul Kork, Sen Sok, Chamkarmon, Siem Reap, Battambang, Sihanoukville, and rural Cambodia, recording real HTTP/route results.

---

### Task 25: Phase 8A — Create `docs/migrations/maplibre-migration/` Documentation Suite

**Files:**
- Create: `docs/migrations/maplibre-migration/README.md`
- Create: `docs/migrations/maplibre-migration/01-objectives-and-scope.md` through `12-deployment.md`
- Create: `docs/migrations/maplibre-migration/IMPLEMENTATION-CHECKLIST.md`
- Modify: `docs/plans/task.md`

---

### Task 26: Phase 8B — Rebuild Docker Images, Roll Out K8s `web` & `admin`, and Verify Live Browser Maps

**Step 1:** Run `scripts/k8s-build-images.ps1` (or rebuild `ec-web:latest` and `ec-admin:latest` and roll out `deployment/web` & `deployment/admin` in `ecommerce-microservices`).
**Step 2:** Run `python scripts/verify_delivery_pipeline.py` to generate and verify a live active shipment.
**Step 3:** Use `browser` subagent to inspect `http://localhost:30000/tracking/<trackingNumber>` and `http://localhost:30001/dispatch`, verify pure MapLibre canvas/tiles, OSRM route, markers, controls, zero console/worker/Leaflet errors, and capture screenshots in `walkthrough.md`.
**Step 4:** Update `docs/plans/task.md` and present final completion report.
