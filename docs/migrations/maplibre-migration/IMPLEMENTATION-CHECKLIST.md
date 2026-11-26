# Pure MapLibre GL JS Migration — Implementation Checklist

## Architecture
- [x] Pure MapLibre GL JS used in customer application (`apps/web`)
- [x] Pure MapLibre GL JS used in admin application (`apps/admin`)
- [x] Shared map logic maintained in `@ec/map-basemap`
- [x] OpenFreeMap styles verified (`positron` HTTP 200, `dark` HTTP 200)
- [x] OSRM routing works with GeoJSON `[longitude, latitude]` coordinates
- [x] Existing backend tracking infrastructure preserved untouched

## Functionality
- [x] Customer delivery map rewritten (`DeliveryMapView.tsx`)
- [x] Courier location updates move existing marker via `setLngLat`
- [x] Hub and destination markers render cleanly
- [x] Delivery route renders via GeoJSON source & layers with arrow symbols
- [x] Admin fleet map rewritten (`FleetDispatchMap.tsx`)
- [x] Multiple courier markers managed by `courierId` without duplicates
- [x] Courier selection highlights marker and draws route
- [x] Camera controls (`NavigationControl`, `ScaleControl`, `Recenter`, `Reset View`) implemented
- [x] Loading and style error retry states implemented
- [x] WebGL-unavailable text/telemetry fallback UI implemented

## Cambodia Geographic Support
- [x] Phnom Penh, Toul Kork, Sen Sok, Chamkarmon OSRM routes & coords verified
- [x] Siem Reap, Battambang, Sihanoukville, Kampong Speu rural OSRM routes & coords verified
- [x] Coordinate order `[longitude, latitude]` verified across package, action, and UI

## Dependencies
- [x] `leaflet`, `@types/leaflet`, `@maplibre/maplibre-gl-leaflet` removed from `apps/web`
- [x] `leaflet`, `@types/leaflet`, `@maplibre/maplibre-gl-leaflet` removed from `apps/admin`
- [x] `pnpm-lock.yaml` updated cleanly via `pnpm`
- [x] Zero active Leaflet imports or `.ec-osm-dark-fallback` CSS remain

## Quality & Deployment
- [x] Shared package tests pass (`18/18`) and `tsc --noEmit` passes
- [x] Frontend tests pass (`web` `7/7`, `admin` `3/3`)
- [x] Workspace lint passes (`pnpm lint`)
- [x] `apps/web` and `apps/admin` production builds pass (`next build`)
- [x] Worker bundle `public/maplibre-gl-worker.mjs` verified in both apps
- [ ] Docker images (`ec-web:latest`, `ec-admin:latest`) rebuilt & rolled out to K8s
- [ ] Live browser visual inspection & `verify_delivery_pipeline.py` completed

## Git
- [x] Work on `feat/maplibre-remove-leaflet` (branched off `development`)
- [x] All phases committed cleanly without touching `main`
- [ ] Feature branch ready for push & PR targeting `development` (per user option)
