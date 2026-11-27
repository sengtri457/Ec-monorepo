# 07 — Realtime Integration & Telemetry Validation

## Actual Repository Tracking Transport

Phase 0 inspection confirmed the repository uses HTTP REST endpoints rather than a WebSocket/Redis service:

1. **Mobile Rider GPS Stream (`apps/web/app/rider/[trackingNumber]/page.tsx`):**
   - Watches browser geolocation (`navigator.geolocation.watchPosition`) and calls `updateRiderLocation` (`PATCH /api/v1/orders/tracking/{trackingNumber}/location/`) every 5 seconds.
2. **Customer Tracking (`apps/web/components/delivery/DeliveryTrackingCard.tsx`):**
   - Fetches initial shipment via SSR (`fetchDeliveryTracking`), supports manual **Refresh**, and polls every 10 seconds while `isMapOpen && shipment.status === "OUT_FOR_DELIVERY"` (cleaned up on unmount/status change).
3. **Admin Dispatch (`apps/admin/app/dispatch/page.tsx`):**
   - Loads real pending orders (`fetchAdminOrders` / `updateAdminOrderStatus`) and runs telemetry state updates for `INITIAL_COURIERS` without recreating map instances.

## Frontend Validation & Stale Update Guards

Implemented in `@ec/map-basemap` (`src/geo/validation.mjs`) and consumed by `DeliveryMapView.tsx` and `FleetDispatchMap.tsx`:

- `validateTelemetryUpdate(payload, previousTimestampMs)`:
  - Verifies non-empty `id`/`courierId`.
  - Validates finite `[longitude, latitude]` within WGS84 (`[-180, 180]`, `[-90, 90]`).
  - Rejects out-of-order stale updates (`timestampMs < previousTimestampMs`) so older events cannot overwrite newer positions.
  - Filters non-finite `heading` and `speed` values.
- `isLocationStale(updatedAt, nowMs, maxAgeMs)`:
  - Flags missing, unparseable, or stale (`> 120s`) timestamps so `DeliveryMapView.tsx` displays a `"Last known GPS"` indicator instead of presenting outdated coordinates as live.
