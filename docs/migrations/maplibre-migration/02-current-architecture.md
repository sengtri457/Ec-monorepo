# 02 — Current Architecture (Pre-Migration Baseline)

## Hybrid Leaflet + MapLibre Baseline

Prior to this migration (`45e3eb0` on `development`), the frontend used a hybrid wrapper stack:

```text
React Component (DeliveryMapView / FleetDispatchMap)
  -> Leaflet (L.map, L.marker, L.divIcon, L.polyline)
    -> @maplibre/maplibre-gl-leaflet
      -> MapLibre GL JS (vector tile canvas)
        -> OpenFreeMap vector styles (or OSM raster fallback)
```

## Pain Points Observed During Phase 0 Inspection

1. **Dual Coordinate Conventions:** Backend/OSRM returned `[longitude, latitude]`, `fetch-road-route.ts` reversed it to `[latitude, longitude]` for Leaflet, and `DeliveryMapView.tsx` / `FleetDispatchMap.tsx` used `[lat, lng]` throughout.
2. **Extra Dependency Footprint:** Both `apps/web` and `apps/admin` carried `leaflet@^1.9.4`, `@types/leaflet@^1.9.22`, and `@maplibre/maplibre-gl-leaflet@^0.1.4` alongside `maplibre-gl@^6.19.0`.
3. **Unthrottled OSRM Requests:** `DeliveryMapView.tsx` re-invoked `fetchRoadRoute` on every `[currentLat, currentLng]` update without distance threshold, cooldown, or stale request cancellation, and recreated polyline + DOM arrow markers on every update.
4. **Marker Churn in Admin Dispatch:** `FleetDispatchMap.tsx` rebuilt Leaflet `L.divIcon` instances on every 4-second telemetry tick (`setIcon`) and used Leaflet CSS filter hacks (`.ec-osm-dark-fallback`) for WebGL fallback.
5. **No Frontend Automated Tests:** Neither `apps/web` nor `apps/admin` had a test script or component test coverage; only `packages/map-basemap` had 8 `node:test` unit tests.
6. **Backend Reality Check:** Phase 0 inspection confirmed tracking updates use HTTP REST (`PATCH /api/v1/orders/tracking/{trackingNumber}/location/` and `GET /api/v1/orders/tracking/{trackingNumber}/`) and simulated courier telemetry in `apps/admin/app/dispatch/page.tsx`, with no WebSocket or Redis service in the codebase.
