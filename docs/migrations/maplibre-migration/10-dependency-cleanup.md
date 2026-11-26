# 10 — Dependency & Codebase Cleanup

## Removed Packages

Executed from repository root:

```powershell
pnpm --filter web remove leaflet @types/leaflet @maplibre/maplibre-gl-leaflet
pnpm --filter admin remove leaflet @types/leaflet @maplibre/maplibre-gl-leaflet
```

Removed from `apps/web/package.json`, `apps/admin/package.json`, and `pnpm-lock.yaml`:
- `leaflet` (`^1.9.4`)
- `@types/leaflet` (`^1.9.22`)
- `@maplibre/maplibre-gl-leaflet` (`^0.1.4`)

Retained packages:
- `maplibre-gl` (`^6.19.0`)
- `@ec/map-basemap` (`workspace:*`)

## Removed Code, CSS & Legacy Compatibility Bridges

- Removed `leaflet` and `leaflet/dist/leaflet.css` imports from `DeliveryMapView.tsx` and `FleetDispatchMap.tsx`.
- Removed `.ec-osm-dark-fallback` CSS filter rule from `apps/admin/app/globals.css`.
- Removed deprecated `attachBasemapLayer`, `OSM_FALLBACK_TILE_URL`, `LeafletLike`, `LeafletLayerLike`, and `MaplibreGLFactory` from `packages/map-basemap/src/`.
- Updated comment in `backend/services/order-service/apps/orders/models.py#L214` to reference MapLibre & OSRM.

## Repository-Wide Audit

Verified via `git grep` that zero active application source files, stylesheets, package manifests, Dockerfiles, or Kubernetes manifests reference `leaflet`, `L.map`, `L.marker`, `L.polyline`, `L.divIcon`, `L.tileLayer`, or `@maplibre/maplibre-gl-leaflet`. Historical migration plans in `docs/plans/` remain untouched for audit history.
