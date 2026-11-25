# Keyless Leaflet Map Tracking Migration (OpenFreeMap + MapLibre GL Layer) Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Eliminate the CARTO `"API KEY REQUIRED"` watermark across both customer delivery tracking (`apps/web`) and admin fleet dispatch (`apps/admin`) while keeping Leaflet (`^1.9.4`) and OSRM road routing (`fetch-road-route.ts`) intact with zero API keys.

**Architecture:** Extract a zero-runtime-dependency shared helper `@ec/map-basemap` (`packages/map-basemap`) that attaches OpenFreeMap vector styles (`positron` light for `apps/web`, `dark` for `apps/admin`) to an existing Leaflet `L.Map` via `@maplibre/maplibre-gl-leaflet` (`maplibreGL`) and automatically falls back to OpenStreetMap raster tiles (`tile.openstreetmap.org`) if WebGL initialization throws. Keep all existing Leaflet markers (`L.divIcon`), popups, OSRM polylines, directional arrows, and `fitBounds` logic unchanged.

**Tech Stack:** TypeScript, ESM (`.mjs` + `.d.ts`), Node `node:test`, Leaflet `^1.9.4`, `maplibre-gl`, `@maplibre/maplibre-gl-leaflet`, Next.js 16 (`webpack` for `apps/web`, default bundler for `apps/admin`), Kubernetes (`docker-desktop`).

---

### Task 13: Create Shared `@ec/map-basemap` Package with TDD Unit Tests

**Files:**
- Create: `packages/map-basemap/package.json`
- Create: `packages/map-basemap/tsconfig.json`
- Create: `packages/map-basemap/src/index.d.ts`
- Create: `packages/map-basemap/src/index.test.mjs`
- Create: `packages/map-basemap/src/index.mjs`

**Step 1: Write package manifest, tsconfig, type declarations, and failing unit test**

Create `packages/map-basemap/src/index.test.mjs` testing `OPENFREEMAP_STYLES`, `resolveStyleUrl`, and `attachBasemapLayer` (vector success, `setWorkerUrl` invocation with `/maplibre-gl-worker.mjs`, and WebGL-failure OSM raster fallback for `light` and `dark`).

**Step 2: Run test to verify it fails**

Run: `node --test packages/map-basemap/src/index.test.mjs`
Expected: FAIL because `packages/map-basemap/src/index.mjs` does not exist yet.

**Step 3: Implement `packages/map-basemap/src/index.mjs`**

Implement `OPENFREEMAP_STYLES`, `OSM_FALLBACK_TILE_URL`, `DEFAULT_MAPLIBRE_WORKER_URL`, `resolveStyleUrl`, and `attachBasemapLayer`.

**Step 4: Run test & typecheck to verify they pass**

Run: `pnpm --filter @ec/map-basemap test` and `pnpm --filter @ec/map-basemap lint`
Expected: 100% tests pass, exit code 0.

---

### Task 14: Integrate OpenFreeMap Positron Vector Tiles into `apps/web` (`DeliveryMapView`)

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/eslint.config.mjs`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/components/delivery/DeliveryMapView.tsx`
- Generate (`sync:worker`): `apps/web/public/maplibre-gl-worker.mjs`

**Step 1: Install dependencies & add worker sync script in `apps/web`**

Run: `pnpm --filter web add @ec/map-basemap@workspace:* maplibre-gl@^6.19.0 @maplibre/maplibre-gl-leaflet@^0.1.4`
Add `sync:worker`, `predev`, and `prebuild` scripts copying `maplibre-gl/dist/maplibre-gl-worker.mjs` to `public/maplibre-gl-worker.mjs`, and ignore `public/maplibre-gl-worker.mjs` in `eslint.config.mjs`.

**Step 2: Update `apps/web/next.config.ts`**

Add `transpilePackages: ["@ec/map-basemap"]`.

**Step 3: Update `apps/web/components/delivery/DeliveryMapView.tsx`**

Import `"maplibre-gl/dist/maplibre-gl.css"`, `setWorkerUrl` from `maplibre-gl`, `maplibreGL` from `@maplibre/maplibre-gl-leaflet`, and `attachBasemapLayer` from `@ec/map-basemap`, replacing CARTO Voyager `L.tileLayer` with `attachBasemapLayer({ L, map, maplibreGL, setWorkerUrl, theme: "light", customStyleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL, maxZoom: 20 })`.

**Step 4: Verify `apps/web` lint & build**

Run: `pnpm --filter web lint` and `pnpm --filter web build`
Expected: Exit code 0 with zero TypeScript or bundler errors.

---

### Task 15: Integrate OpenFreeMap Dark Vector Tiles into `apps/admin` (`FleetDispatchMap`)

**Files:**
- Modify: `apps/admin/package.json`
- Modify: `apps/admin/eslint.config.mjs`
- Modify: `apps/admin/next.config.ts`
- Modify: `apps/admin/app/globals.css`
- Modify: `apps/admin/components/dispatch/FleetDispatchMap.tsx`
- Generate (`sync:worker`): `apps/admin/public/maplibre-gl-worker.mjs`

**Step 1: Install dependencies & add worker sync script in `apps/admin`**

Run: `pnpm --filter admin add @ec/map-basemap@workspace:* maplibre-gl@^6.19.0 @maplibre/maplibre-gl-leaflet@^0.1.4`
Add `sync:worker`, `predev`, and `prebuild` scripts copying `maplibre-gl/dist/maplibre-gl-worker.mjs` to `public/maplibre-gl-worker.mjs`, and ignore `public/maplibre-gl-worker.mjs` in `eslint.config.mjs`.

**Step 2: Update `apps/admin/next.config.ts` and `apps/admin/app/globals.css`**

Add `transpilePackages: ["@ec/map-basemap"]` in `next.config.ts`, and `.ec-osm-dark-fallback` filter rule in `globals.css` for the non-WebGL fallback path.

**Step 3: Update `apps/admin/components/dispatch/FleetDispatchMap.tsx`**

Import `"maplibre-gl/dist/maplibre-gl.css"`, dynamically import `maplibre-gl`, `@maplibre/maplibre-gl-leaflet`, and `@ec/map-basemap`, replace CARTO Dark Matter `L.tileLayer` with `attachBasemapLayer({ L, map, maplibreGL, setWorkerUrl, theme: "dark", customStyleUrl: process.env.NEXT_PUBLIC_ADMIN_MAP_STYLE_URL, maxZoom: 19 })`, and isolate the Leaflet stacking context (`z-0` on outer wrapper and `relative z-0` on map container) so the HUD and telemetry drawers stay above Leaflet panes.

**Step 4: Verify `apps/admin` lint & build**

Run: `pnpm --filter admin lint` and `pnpm --filter admin build`
Expected: Exit code 0 with zero TypeScript or bundler errors.

---

### Task 16: Verify Builds, Redeploy K8s `web` & `admin`, and Verify Live Maps in Browser

**Step 1: Run full workspace tests (`@ec/map-basemap`, `web`, `admin`)**
**Step 2: Rebuild `ec-web:latest` and `ec-admin:latest` Docker images & roll out Kubernetes deployments (`web`, `admin`)**
**Step 3: Run `python scripts/verify_delivery_pipeline.py` (or create/fetch an active tracking number via the live gateway)**
**Step 4: Use `browser` subagent to visually inspect both `http://localhost:30000/tracking/<trackingNumber>` (Light Positron map + OSRM route) and `http://localhost:30001/dispatch` (Dark map + courier markers), verify zero CARTO watermark / network errors, and attach screenshots to `walkthrough.md`.**
