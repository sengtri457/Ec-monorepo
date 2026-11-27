# 06 — Admin Fleet Dispatch (`apps/admin`)

## Modified Components & Styles

- `apps/admin/components/dispatch/FleetDispatchMap.tsx`
- `apps/admin/app/globals.css` (removed obsolete `.ec-osm-dark-fallback` CSS filter)

## Features Implemented in `FleetDispatchMap.tsx`

1. **Dark Basemap & Controls:** Uses OpenFreeMap Dark (`OPENFREEMAP_STYLES.dark`, overridable via `NEXT_PUBLIC_ADMIN_MAP_STYLE_URL`), `center: PHNOM_PENH_CENTER` (`[104.9282, 11.5564]`), `NavigationControl` (`top-right`), and the existing **Reset View** HUD control (`map.flyTo`).
2. **Keyed Courier Marker Lifecycle:** Uses `syncCourierMarkers` with `Map<string, ManagedMarkerEntry>` keyed by `courierId`:
   - Existing markers move via `marker.setLngLat([longitude, latitude])` and update speed/selection styling in-place.
   - New couriers create a single `Marker` with a stable `onSelectCourierRef` click handler.
   - Removed/filtered couriers invoke `cleanup()` (`marker.remove()`) and delete from the registry.
3. **Selected Courier Route Visualization:** Uses `upsertRouteLayer` (`selected-courier-route` / `selected-courier-route-line`, dashed terracotta `#944434`) from `PHNOM_PENH_CENTER` to the selected courier, clearing via `clearRouteLayer` when deselected.
4. **Camera Behavior:** Gently calls `map.easeTo` only when `selectedCourierId` changes, avoiding camera jumps on 4-second telemetry jitter ticks.
5. **Stacking Context & WebGL Fallback:** Preserves `relative z-0` map isolation beneath the HUD (`z-20`), Pending Orders dock (`z-20`), and `CourierTelemetryDrawer` (`z-30`). When WebGL is unavailable, renders a dark selectable grid of active couriers with coordinates and speeds so dispatch remains operational.

## Scaling Strategy

- `< 50` couriers (current fleet size: 5): DOM `Marker` instances via `syncCourierMarkers`.
- `50–500` couriers: Migrate marker rendering to a GeoJSON `FeatureCollection` source + MapLibre `symbol` layer.
- `500+` couriers: Enable `cluster: true` on the GeoJSON source and render clustered symbol layers.
