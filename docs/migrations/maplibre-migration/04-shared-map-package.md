# 04 — Shared Map Package (`@ec/map-basemap`)

## Module Layout

`packages/map-basemap` remains a zero-build ESM workspace package (`"type": "module"`, transpiled by Next.js via `transpilePackages: ["@ec/map-basemap"]`) with strict TypeScript declarations (`src/index.d.ts`) and `tsc --noEmit` (`checkJs: true`).

```text
packages/map-basemap/src/
├── index.mjs
├── index.d.ts
├── index.test.mjs
├── config/
│   ├── map-config.mjs      # PHNOM_PENH_CENTER, TOUL_KORK_HUB_COORDINATE, CAMBODIA_BOUNDS, CAMBODIA_TEST_LOCATIONS
│   └── map-styles.mjs      # OPENFREEMAP_STYLES, DEFAULT_MAPLIBRE_WORKER_URL, resolveStyleUrl
├── core/
│   ├── create-map.mjs      # createMap (SSR/container/coordinate/WebGL/workerUrl guards)
│   └── destroy-map.mjs     # destroyMap, fitMapToCoordinates
├── geo/
│   ├── coordinates.mjs     # toMapCoordinate, fromLatLng
│   ├── distance.mjs        # haversineKm, calculateRouteDistanceKm, estimateDrivingMinutes, formatDistance
│   └── validation.mjs      # isValidCoordinate, isValidLatLng, isWithinCambodiaBounds, isLocationStale, validateTelemetryUpdate
├── markers/
│   └── create-marker.mjs   # createHtmlMarker, syncCourierMarkers
├── routes/
│   └── route-source.mjs    # buildRouteFeature, upsertRouteLayer, clearRouteLayer
└── utils/
    └── map-errors.mjs      # MapInitializationError, isWebGLSupported
```

## Key Design Notes (`maplibre-gl@6.19.0`)

- `maplibre-gl@6.19.0` exports named symbols (`Map`, `Marker`, `Popup`, `NavigationControl`, `ScaleControl`, `LngLatBounds`, `setWorkerUrl`) without a default export.
- `MapOptions.attributionControl` accepts `false | AttributionControlOptions` (not `boolean`); `createMap` configures `attributionControl: { compact: true }`.
- `Map.isStyleLoaded()` returns `boolean | void`; `index.d.ts` accepts `() => boolean | void` and structural union types (`MapLibreMap | ...`) so both real MapLibre instances and unit test mocks pass `tsc`.
