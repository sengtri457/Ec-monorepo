# 09 — Cambodia Geographic Support

## Coordinate Standards & Test Locations

`@ec/map-basemap` defines `CAMBODIA_BOUNDS` (`lng: 102.3..107.7`, `lat: 9.9..14.7`) and `CAMBODIA_TEST_LOCATIONS` in `[longitude, latitude]` order across urban, provincial, and rural points. `isWithinCambodiaBounds` detects swapped `[lat, lng]` Cambodia coordinates in tests without blocking global WGS84 validation in `isValidCoordinate`.

## Live OpenFreeMap & OSRM Verification Results

Executed against live public endpoints (`2026-11-26T23:13+07:00`):

### OpenFreeMap Style Availability

| Style | Endpoint | HTTP Status | Vector Sources | Layer Count |
|---|---|---|---|---|
| Light (Customer) | `https://tiles.openfreemap.org/styles/positron` | 200 | `ne2_shaded`, `openmaptiles` | 55 |
| Dark (Admin) | `https://tiles.openfreemap.org/styles/dark` | 200 | `ne2_shaded`, `openmaptiles` | 47 |

### OSRM Cambodia Route Coverage Probe

| Test Route | Coordinates (`[lng, lat]`) | HTTP / OSRM Code | Distance | Duration | Geometry Points |
|---|---|---|---|---|---|
| Toul Kork -> Chamkarmon | `[104.8988, 11.5761]` -> `[104.9282, 11.5422]` | 200 / `Ok` | 6.22 km | 8 min | 146 |
| Toul Kork -> Sen Sok | `[104.8988, 11.5761]` -> `[104.8667, 11.5833]` | 200 / `Ok` | 5.39 km | 11 min | 94 |
| Phnom Penh -> Siem Reap | `[104.9282, 11.5564]` -> `[103.8564, 13.3633]` | 200 / `Ok` | 315.52 km | 233 min | 3,054 |
| Phnom Penh -> Battambang | `[104.9282, 11.5564]` -> `[103.2022, 13.0957]` | 200 / `Ok` | 289.98 km | 210 min | 2,184 |
| Phnom Penh -> Sihanoukville | `[104.9282, 11.5564]` -> `[103.5292, 10.6096]` | 200 / `Ok` | 212.58 km | 164 min | 1,299 |
| Phnom Penh -> Kampong Speu Rural | `[104.9282, 11.5564]` -> `[104.4150, 11.4533]` | 200 / `Ok` | 63.80 km | 70 min | 986 |

## Known Limitations

- OpenStreetMap rural Cambodia coverage varies outside primary national highways; unmapped alleys or rural tracks snap to nearest mapped OSM road segments in OSRM.
- Address geocoding currently resolves via `CAMBODIA_COORDINATES` lookup in `backend/services/order-service/apps/orders/fulfillment.py`; no external Nominatim geocoder is integrated yet.
- Future self-hosted tile/routing independence can use Geofabrik Cambodia OSM extracts (`https://download.geofabrik.de/asia/cambodia.html`) configured via env variables.
