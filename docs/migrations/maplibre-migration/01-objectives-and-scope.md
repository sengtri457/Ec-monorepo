# 01 — Objectives and Scope

## Primary Objective

Eliminate Leaflet (`leaflet`, `@types/leaflet`) and the `@maplibre/maplibre-gl-leaflet` adapter from the E-Commerce monorepo so both customer delivery tracking (`apps/web`) and admin fleet dispatch (`apps/admin`) run directly on pure MapLibre GL JS (`maplibre-gl@6.19.0`).

## In Scope

- Refactor `packages/map-basemap` (`@ec/map-basemap`) into reusable pure MapLibre modules (styles, config, GeoJSON coordinates/validation/distance, WebGL detection, map lifecycle, HTML markers, GeoJSON route layers, telemetry guards).
- Align `apps/web/app/actions/fetch-road-route.ts` to validate OSRM responses and preserve native GeoJSON `[longitude, latitude]` coordinates.
- Rewrite `apps/web/components/delivery/DeliveryMapView.tsx` on pure MapLibre GL JS (OpenFreeMap Positron, 3 markers, GeoJSON route + directional arrows, throttled OSRM updates, Recenter control, WebGL text fallback).
- Add lightweight 10-second live tracking polling while `OUT_FOR_DELIVERY` in `apps/web/components/delivery/DeliveryTrackingCard.tsx`.
- Rewrite `apps/admin/components/dispatch/FleetDispatchMap.tsx` on pure MapLibre GL JS (OpenFreeMap Dark, Phnom Penh Hub, keyed courier markers, selected dashed GeoJSON route, `Reset View`, WebGL selectable courier fallback).
- Remove `.ec-osm-dark-fallback` CSS from `apps/admin/app/globals.css`.
- Remove Leaflet dependencies from `apps/web`, `apps/admin`, and `pnpm-lock.yaml`.
- Add Vitest + React Testing Library test suites for `apps/web` and `apps/admin` alongside expanded `node --test` coverage in `@ec/map-basemap`.
- Validate Cambodia coverage, production Next.js builds, Docker images, and Kubernetes rollout.

## Out of Scope

- Rewriting Django backend microservices, database schemas, order workflows, or authentication/authorization.
- Introducing a new WebSocket/Redis backend infrastructure (no WebSocket server exists in the current repository).
- Self-hosting OpenFreeMap vector tiles or OSRM routing servers (style URLs and `OSRM_BASE_URL` are configurable for future self-hosting).
- Adding commercial mapping SDKs or API-key-gated basemaps.
