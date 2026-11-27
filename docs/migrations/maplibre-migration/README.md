# MapLibre GL JS Migration Documentation

**Migration:** Leaflet + `@maplibre/maplibre-gl-leaflet` hybrid -> Pure MapLibre GL JS (`maplibre-gl@6.19.0`)  
**Branch:** `feat/maplibre-remove-leaflet` (base: `development`)  
**Status:** Frontend implementation, tests, lint, and Next.js production builds verified; Kubernetes rollout and live browser verification tracked in Task 26.

## Migration Purpose

Standardize customer delivery tracking (`apps/web`) and admin fleet dispatch (`apps/admin`) on pure MapLibre GL JS, eliminating the `@maplibre/maplibre-gl-leaflet` bridge, removing all active `leaflet` / `@types/leaflet` dependencies, unifying on GeoJSON `[longitude, latitude]` coordinates, and isolating reusable mapping utilities in `@ec/map-basemap`.

## Architecture Overview

- **Customer Storefront (`apps/web`):** `DeliveryMapView.tsx` renders OpenFreeMap Positron (`https://tiles.openfreemap.org/styles/positron`), Hub/Rider/Destination DOM markers, GeoJSON OSRM road route lines + directional arrow symbols, manual Recenter, `NavigationControl` + `ScaleControl`, and an accessible text fallback if WebGL is unavailable.
- **Admin Console (`apps/admin`):** `FleetDispatchMap.tsx` renders OpenFreeMap Dark (`https://tiles.openfreemap.org/styles/dark`), Phnom Penh Hub marker, keyed courier DOM markers updated in-place via `setLngLat`, dashed GeoJSON selected-courier route lines, `Reset View` camera control, and a dark selectable courier fallback if WebGL is unavailable.
- **Shared Package (`packages/map-basemap`):** Modular ESM package (`@ec/map-basemap`) providing style presets, Cambodia test constants, coordinate conversion/validation, distance/ETA math, telemetry & stale-GPS guards, WebGL detection, MapLibre lifecycle, marker sync, and GeoJSON route upsert helpers.
- **Routing & Backend:** `apps/web/app/actions/fetch-road-route.ts` calls OSRM (`router.project-osrm.org`) and passes native `[lng, lat]` GeoJSON directly to MapLibre. Existing Django microservices, Nginx gateway, and PostgreSQL persistence remain untouched.

## Document Index

| Document | Scope |
|---|---|
| [01-objectives-and-scope.md](./01-objectives-and-scope.md) | Goals, non-goals, and acceptance criteria |
| [02-current-architecture.md](./02-current-architecture.md) | Pre-migration baseline & Phase 0 findings |
| [03-target-architecture.md](./03-target-architecture.md) | Pure MapLibre component & package layers |
| [04-shared-map-package.md](./04-shared-map-package.md) | `@ec/map-basemap` modules, types, and API |
| [05-customer-delivery-map.md](./05-customer-delivery-map.md) | `DeliveryMapView.tsx` and `DeliveryTrackingCard.tsx` |
| [06-admin-fleet-dispatch.md](./06-admin-fleet-dispatch.md) | `FleetDispatchMap.tsx` and scaling thresholds |
| [07-realtime-integration.md](./07-realtime-integration.md) | HTTP REST tracking, polling, and telemetry validation |
| [08-osrm-routing.md](./08-osrm-routing.md) | `fetch-road-route.ts`, `[lng, lat]` order, throttling |
| [09-cambodia-geographic-support.md](./09-cambodia-geographic-support.md) | Cambodia coordinate coverage & OSRM probe results |
| [10-dependency-cleanup.md](./10-dependency-cleanup.md) | Removed Leaflet packages, CSS, and repo audit |
| [11-testing-and-validation.md](./11-testing-and-validation.md) | Unit, component, lint, and production build checks |
| [12-deployment.md](./12-deployment.md) | Worker sync, Dockerfiles, and Kubernetes rollout |
| [IMPLEMENTATION-CHECKLIST.md](./IMPLEMENTATION-CHECKLIST.md) | Live Definition-of-Done checklist |

## Implementation Order

1. Phase 0: Repository inspection, branch sync (`development` -> `feat/maplibre-remove-leaflet`)
2. Phase 1: `@ec/map-basemap` pure MapLibre modules & Node tests
3. Phase 2–3: OSRM GeoJSON `[lng, lat]` alignment & `DeliveryMapView.tsx` migration
4. Phase 4–5: `FleetDispatchMap.tsx` migration & telemetry/stale-update guards
5. Phase 6: Removal of `leaflet`, `@types/leaflet`, `@maplibre/maplibre-gl-leaflet`, and `.ec-osm-dark-fallback`
6. Phase 7: Workspace test/lint/build gates & Cambodia geographic validation
7. Phase 8: Migration documentation, Docker rebuilds, Kubernetes rollout, and live browser checks

## Important Constraints

- **Coordinate Order:** MapLibre and GeoJSON strictly use `[longitude, latitude]`. Only `fromLatLng(lat, lng)` converts legacy scalar/DTO pairs explicitly.
- **No WebGL Raster Fallback:** Per migration spec §14.3, missing WebGL renders a structured text/telemetry fallback UI rather than Leaflet/OSM raster tiles.
- **Public Services Caveat:** OpenFreeMap and `router.project-osrm.org` are public services without production SLAs; style URLs (`NEXT_PUBLIC_MAP_STYLE_URL`, `NEXT_PUBLIC_ADMIN_MAP_STYLE_URL`) and `OSRM_BASE_URL` remain env-configurable.
- **Git Safety:** All work lives on `feat/maplibre-remove-leaflet` targeting `development`; `main` is never modified.
