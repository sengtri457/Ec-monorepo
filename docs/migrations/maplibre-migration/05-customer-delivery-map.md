# 05 — Customer Delivery Map (`apps/web`)

## Modified Components

- `apps/web/components/delivery/DeliveryMapView.tsx`
- `apps/web/components/delivery/DeliveryTrackingCard.tsx`

## Features Implemented in `DeliveryMapView.tsx`

1. **Basemap & Controls:** Uses OpenFreeMap Positron (`OPENFREEMAP_STYLES.light`, overridable via `NEXT_PUBLIC_MAP_STYLE_URL`), `NavigationControl` (`bottom-right`), `ScaleControl` (`bottom-left`, metric), and a **Recenter** button in the top overlay bar.
2. **Custom DOM Markers:** Creates pure DOM markers for the Toul Kork Hub (`[originLng, originLat]`), Customer Destination (`[destLng, destLat]`), and Courier Rider (`[currentLng, currentLat]`) with HTML-escaped popup content.
3. **In-Place Marker Updates:** Subsequent `shipment.currentLat`/`currentLng` updates move the existing rider marker via `riderMarkerRef.current.setLngLat([lng, lat])` and update `data-active` pulse markup without recreating the map or markers.
4. **GeoJSON Route & Directional Arrows:** Renders `delivery-route` (`Feature<LineString>`) via `delivery-route-line` and a GPU-rendered `symbol` layer (`delivery-route-arrows`) with `"symbol-placement": "line"`.
5. **Camera Discipline:** Fits bounds via `fitMapToCoordinates` on initial route load (or destination change) and when the user clicks **Recenter**, never hijacking camera pan on periodic GPS updates.
6. **Error & Fallback Handling:**
   - Checks `isWebGLSupported()` via `useSyncExternalStore` (avoiding SSR mismatch and cascading effect renders). When WebGL is unavailable, renders an accessible text card displaying status, destination address, last known rider coordinates, courier/driver details, and update timestamp.
   - Displays a loading indicator until `map.on("load")` and a non-blocking **Retry Map** banner if basemap style/tile loading fails.
   - Displays a `"Last known GPS"` indicator when `OUT_FOR_DELIVERY` coordinates are missing or stale (> 2 minutes).

## Live Polling in `DeliveryTrackingCard.tsx`

- Preserves the existing manual **Refresh** button and props API.
- Adds a cleaned-up 10-second `setInterval` polling `fetchDeliveryTracking(shipment.trackingNumber)` only when `isMapOpen && shipment.status === "OUT_FOR_DELIVERY"`.
