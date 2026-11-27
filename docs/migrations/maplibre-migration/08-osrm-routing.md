# 08 — OSRM Road Routing

## Server Action Contract (`apps/web/app/actions/fetch-road-route.ts`)

- Preserves Next.js `"use server"` execution (avoiding browser CORS issues) and caches OSRM responses for 600s (`next: { revalidate: 600 }`) with a 15s timeout (`AbortSignal.timeout(15_000)`).
- Requests `{OSRM_BASE_URL || "https://router.project-osrm.org"}/route/v1/driving/{originLng},{originLat};{destLng},{destLat}?overview=full&geometries=geojson`.
- Validates input coordinates via `isValidLatLng`, HTTP status (`resp.ok`), OSRM `"Ok"` code, non-empty `routes[0].geometry.coordinates` filtered by `isValidCoordinate`, and finite `distance` / `duration`.
- Exports:
  - `fetchRoadRouteMetrics(originLat, originLng, destLat, destLng): Promise<RoadRouteResult>`
  - `fetchRoadRoute(originLat, originLng, destLat, destLng): Promise<MapCoordinate[]>`
- **Coordinate Order:** Returns GeoJSON `[longitude, latitude]` coordinates directly without Leaflet `[lat, lng]` inversion.

## Route Throttling & Fallback in `DeliveryMapView.tsx`

- **Distance & Cooldown Guard:** Re-requests OSRM only on initial mount, destination change, or when the rider moves `>= 0.15 km` (`150m`) from the last routed origin AND `>= 15_000 ms` have elapsed.
- **Race Protection:** Monotonic `routeSeqRef` counter discards stale out-of-order OSRM responses.
- **Fallback Geometry:** If OSRM fails or returns `NoRoute`/empty coordinates, renders a straight-line GeoJSON segment `[nextCoord, destCoord]` and computes distance/ETA via `calculateRouteDistanceKm` / `estimateDrivingMinutes`.
