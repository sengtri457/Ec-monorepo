# 03 — Target Architecture

## Pure MapLibre GL JS Stack

```text
apps/web (Customer Tracking)             apps/admin (Fleet Dispatch)
  DeliveryMapView.tsx                      FleetDispatchMap.tsx
          \                                        /
           +------------------+-------------------+
                              |
                              v
                    @ec/map-basemap (ESM)
             styles | lifecycle | markers | routes
             geo validation | distance | WebGL guard
                              |
                              v
                    maplibre-gl@6.19.0
         (WebGL vector canvas + GeoJSON + DOM Markers)
             /                |                 \
            v                 v                  v
     OpenFreeMap        OSRM GeoJSON      REST Tracking API
  (Positron / Dark)   ([lng, lat] line)   (Order Service / Dispatch)
```

## Layer Responsibilities

| Layer | Responsibility |
|---|---|
| `packages/map-basemap` | Shared MapLibre configuration, `[lng, lat]` validation, distance/ETA math, WebGL check, map init/destroy, marker collection sync, GeoJSON source/layer upserts, telemetry timestamp validation. Zero React/Next/order business logic. |
| `apps/web/app/actions/fetch-road-route.ts` | Server Action querying OSRM (`{lng},{lat}`), validating status/geometry/distance/duration, returning `[lng, lat]` coordinates. |
| `apps/web/components/delivery/DeliveryMapView.tsx` | Light Positron customer tracking map, Hub/Destination/Rider DOM markers, GeoJSON route + arrow symbols, throttled OSRM refresh, Recenter control, WebGL text fallback. |
| `apps/admin/components/dispatch/FleetDispatchMap.tsx` | Dark fleet dispatch map, Phnom Penh Hub, keyed courier DOM markers, selected-courier dashed GeoJSON route, `Reset View`, WebGL selectable fallback. |
| `backend/services/order-service` | Existing shipment persistence, Cambodia city/khan geocoding, and REST tracking endpoints (preserved untouched). |
