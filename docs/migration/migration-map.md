**# MapLibre GL JS Migration**

**## Complete Technical Implementation Handoff**



**\*\*Project:\*\* E-commerce Monorepo**  

**\*\*Migration:\*\* Leaflet + MapLibre hybrid → Pure MapLibre GL JS**  

**\*\*Primary goal:\*\* Remove Leaflet completely and standardize customer delivery tracking and admin fleet dispatch on MapLibre GL JS.**  

**\*\*Target branch:\*\* `feat/maplibre-remove-leaflet`**  

**\*\*Base branch:\*\* `development`**  

**\*\*Status:\*\* Implementation specification**



**---**



**# 1. Project Overview**



**## 1.1 Objective**



**The project currently uses a hybrid mapping architecture:**



**- Leaflet handles map initialization, markers, popups, and polylines.**

**- MapLibre GL JS provides the vector basemap through `@maplibre/maplibre-gl-leaflet`.**

**- OpenFreeMap provides map styles and tiles.**

**- OSRM provides road routing.**



**This architecture introduces unnecessary dependencies and additional integration complexity.**



**The objective is to migrate the entire frontend mapping implementation to \*\*pure MapLibre GL JS\*\*.**



**After migration:**



**1. MapLibre GL JS must handle map rendering.**

**2. MapLibre markers must handle map markers.**

**3. GeoJSON sources and layers must handle routes and geographic data.**

**4. OpenFreeMap must remain the initial basemap provider.**

**5. OSRM must remain the initial routing provider.**

**6. Existing backend delivery and tracking services must continue working.**

**7. Leaflet must no longer be required anywhere in the active application code.**



**## 1.2 Main Requirements**



**| Requirement | Expected result |**

**|---|---|**

**| Remove Leaflet | No active Leaflet dependencies or implementation |**

**| Pure MapLibre | Both applications use MapLibre directly |**

**| Customer tracking | Customer can track delivery location |**

**| Fleet dispatch | Admin can monitor multiple couriers |**

**| Road routing | Display road routes using OSRM |**

**| Live tracking | Update courier positions from existing realtime services |**

**| Cambodia coverage | Support Cambodian roads and geographic coordinates |**

**| Responsive | Support desktop and mobile layouts |**

**| No API key | Initial map provider must not require an API key |**

**| Maintainability | Shared mapping logic must live in a reusable package |**



**---**



**# 2. Existing Repository Context**



**The coding agent must inspect the repository before modifying anything.**



**## 2.1 Existing Relevant Files**



**```text**

**apps/**

**├── web/**

**│   ├── components/**

**│   │   └── delivery/**

**│   │       └── DeliveryMapView.tsx**

**│   ├── app/**

**│   │   └── actions/**

**│   │       └── fetch-road-route.ts**

**│   └── package.json**

**│**

**└── admin/**

&#x20;   **├── components/**

&#x20;   **│   └── dispatch/**

&#x20;   **│       └── FleetDispatchMap.tsx**

&#x20;   **└── package.json**



**packages/**

**└── map-basemap/**

&#x20;   **└── src/**

&#x20;       **├── index.mjs**

&#x20;       **├── index.d.ts**

&#x20;       **└── index.test.mjs**



**docs/**

**└── plans/**

&#x20;   **├── 2026-11-25-leaflet-openfreemap-migration.md**

&#x20;   **└── task.md**



**pnpm-lock.yaml**

**pnpm-workspace.yaml**

**```**



**This is the known repository context. The agent must verify the actual current repository state and inspect additional related files before implementation.**



**## 2.2 Current Technology**



**| Component | Current technology |**

**|---|---|**

**| Frontend | Next.js |**

**| UI | React + TypeScript |**

**| Styling | Tailwind CSS |**

**| Package manager | pnpm |**

**| Workspace | pnpm monorepo |**

**| Map renderer | MapLibre GL JS + Leaflet |**

**| Map adapter | `@maplibre/maplibre-gl-leaflet` |**

**| Map provider | OpenFreeMap |**

**| Geographic data | OpenStreetMap |**

**| Routing | OSRM |**

**| Backend | Existing delivery microservices |**

**| Realtime | Existing WebSocket/Redis infrastructure |**



**## 2.3 Existing Mapping Problems**



**The current architecture requires two mapping libraries:**



**```text**

**Application**

&#x20;   **|**

&#x20;   **v**

**Leaflet**

&#x20;   **|**

&#x20;   **v**

**MapLibre Leaflet Adapter**

&#x20;   **|**

&#x20;   **v**

**MapLibre GL JS**

&#x20;   **|**

&#x20;   **v**

**OpenFreeMap**

**```**



**This introduces:**



**- An unnecessary adapter dependency.**

**- Two different coordinate conventions.**

**- More complicated map lifecycle management.**

**- Additional styling and marker integration work.**

**- More dependencies to maintain.**



**The target architecture removes this additional layer.**



**---**



**# 3. Target Architecture**



**## 3.1 New Mapping Architecture**



**```text**

&#x20;                   **FRONTEND APPLICATIONS**

&#x20;                             **|**

&#x20;               **+-------------+-------------+**

&#x20;               **|                           |**

&#x20;               **v                           v**

&#x20;         **Customer Web                 Admin Dashboard**

&#x20;               **|                           |**

&#x20;               **v                           v**

&#x20;      **DeliveryMapView.tsx          FleetDispatchMap.tsx**

&#x20;               **|                           |**

&#x20;               **+-------------+-------------+**

&#x20;                             **|**

&#x20;                             **v**

&#x20;                    **@ec/map-basemap**

&#x20;                             **|**

&#x20;                             **v**

&#x20;                      **MapLibre GL JS**

&#x20;                             **|**

&#x20;              **+--------------+--------------+**

&#x20;              **|              |              |**

&#x20;              **v              v              v**

&#x20;         **Map Styles       GeoJSON       Map Markers**

&#x20;              **|           Sources        \& Layers**

&#x20;              **v              |              |**

&#x20;         **OpenFreeMap         |              |**

&#x20;                             **v              v**

&#x20;                        **Delivery Routes   Courier GPS**

&#x20;                             **|**

&#x20;                             **v**

&#x20;                           **OSRM**

**```**



**## 3.2 Backend Realtime Architecture**



**Do not rebuild the existing backend tracking infrastructure as part of this frontend migration.**



**Preserve the existing architecture:**



**```text**

**Courier Mobile Application**

&#x20;         **|**

&#x20;         **| GPS coordinates**

&#x20;         **v**

**Tracking Microservice**

&#x20;         **|**

&#x20;         **v**

&#x20;        **Redis**

&#x20;         **|**

&#x20;         **v**

**WebSocket Gateway**

&#x20;         **|**

&#x20;         **v**

**Frontend Applications**

&#x20;         **|**

&#x20;         **v**

**MapLibre Marker Updates**

**```**



**The frontend receives tracking updates and changes map objects.**



**MapLibre must not become responsible for backend tracking, authentication, persistence, or business logic.**



**## 3.3 Responsibilities**



**| Component | Responsibility |**

**|---|---|**

**| MapLibre GL JS | Map rendering |**

**| OpenFreeMap | Vector basemap styles and tiles |**

**| OpenStreetMap | Geographic data |**

**| OSRM | Road route calculation |**

**| Backend tracking service | Courier location processing |**

**| Redis | Existing realtime data distribution |**

**| WebSocket | Realtime communication |**

**| PostgreSQL/PostGIS | Existing geographic persistence, if configured |**

**| Shared map package | Reusable map utilities |**



**---**



**# 4. Technology Decisions**



**## 4.1 MapLibre GL JS**



**Use:**



**```bash**

**maplibre-gl**

**```**



**MapLibre is the only map rendering library in the frontend.**



**Do not introduce:**



**```text**

**leaflet**

**@types/leaflet**

**@maplibre/maplibre-gl-leaflet**

**react-leaflet**

**```**



**unless an independently approved requirement makes one necessary. The intended final state has none of these active dependencies.**



**Official documentation:**



**https://maplibre.org/maplibre-gl-js/docs/**



**## 4.2 OpenFreeMap**



**Use OpenFreeMap as the initial vector basemap provider.**



**It is suitable for this project because its public map service does not require an API key or account registration.**



**Website:**



**https://openfreemap.org/**



**Example style URLs:**



**```text**

**https://tiles.openfreemap.org/styles/positron**

**https://tiles.openfreemap.org/styles/dark**

**```**



**Use:**



**- Positron for the customer application.**

**- Dark for the admin dashboard.**



**Keep style URLs configurable. Do not hardcode them throughout components.**



**Important:**



**OpenFreeMap is a public service. Do not interpret free public access as a production SLA or guaranteed unlimited capacity. Check its current usage policy and attribution requirements before production deployment.**



**## 4.3 OpenStreetMap**



**OpenStreetMap supplies the underlying geographic data.**



**Cambodia is supported, but road completeness varies by location.**



**Test at least:**



**- Phnom Penh**

**- Toul Kork**

**- Sen Sok**

**- Chamkarmon**

**- Siem Reap**

**- Battambang**

**- Sihanoukville**

**- Rural areas outside Phnom Penh**



**Do not assume every local road, building, house number, or address exists in the dataset.**



**OSM Cambodia project:**



**https://wiki.openstreetmap.org/wiki/WikiProject\_Cambodia**



**## 4.4 OSRM**



**Keep the existing OSRM integration initially.**



**Current route service:**



**```text**

**https://router.project-osrm.org/route/v1/driving/**

**```**



**The migration must preserve current routing behavior unless the existing implementation has a verified defect.**



**OSRM documentation:**



**https://project-osrm.org/docs/v5.24.0/api/**



**Important:**



**The public OSRM demonstration server is not a guaranteed production routing service. Consider self-hosting or selecting a managed routing provider when production traffic and availability requirements justify it.**



**---**



**# 5. Coordinate Standards**



**This is one of the most important implementation requirements.**



**## 5.1 Coordinate Convention**



**MapLibre and GeoJSON use:**



**```text**

**\[longitude, latitude]**

**```**



**Example:**



**```ts**

**const location: \[number, number] = \[**

&#x20; **104.9282,**

&#x20; **11.5564,**

**];**

**```**



**Leaflet commonly uses:**



**```text**

**\[latitude, longitude]**

**```**



**Example:**



**```ts**

**const location = \[**

&#x20; **11.5564,**

&#x20; **104.9282,**

**];**

**```**



**The new implementation must use MapLibre and GeoJSON conventions consistently.**



**## 5.2 Standard Coordinate Type**



**Create a shared coordinate type.**



**```ts**

**export type MapCoordinate = \[number, number];**



**export interface GeoLocation {**

&#x20; **longitude: number;**

&#x20; **latitude: number;**

**}**

**```**



**Provide conversion helpers only when an external system uses a different format.**



**```ts**

**export function toMapCoordinate(**

&#x20; **location: GeoLocation**

**): MapCoordinate {**

&#x20; **return \[**

&#x20;   **location.longitude,**

&#x20;   **location.latitude,**

&#x20; **];**

**}**

**```**



**Do not silently reverse coordinates.**



**## 5.3 Coordinate Validation**



**Implement a reusable validation function.**



**```ts**

**export function isValidCoordinate(**

&#x20; **coordinate: MapCoordinate**

**): boolean {**

&#x20; **const \[longitude, latitude] = coordinate;**



&#x20; **return (**

&#x20;   **Number.isFinite(longitude) \&\&**

&#x20;   **Number.isFinite(latitude) \&\&**

&#x20;   **longitude >= -180 \&\&**

&#x20;   **longitude <= 180 \&\&**

&#x20;   **latitude >= -90 \&\&**

&#x20;   **latitude <= 90**

&#x20; **);**

**}**

**```**



**Validate external GPS data before adding it to the map.**



**For Cambodia-specific test data, verify that coordinates fall within the expected Cambodian geographic area. Do not use a Cambodia-only restriction for a generic coordinate utility.**



**---**



**# 6. Shared Package Architecture**



**Expand the existing package:**



**```text**

**packages/map-basemap/**

**├── src/**

**│   ├── index.ts**

**│   ├── config/**

**│   │   ├── map-config.ts**

**│   │   └── map-styles.ts**

**│   │**

**│   ├── core/**

**│   │   ├── create-map.ts**

**│   │   ├── destroy-map.ts**

**│   │   └── map-types.ts**

**│   │**

**│   ├── markers/**

**│   │   ├── create-marker.ts**

**│   │   └── marker-types.ts**

**│   │**

**│   ├── routes/**

**│   │   ├── route-source.ts**

**│   │   └── route-types.ts**

**│   │**

**│   ├── geo/**

**│   │   ├── coordinates.ts**

**│   │   ├── distance.ts**

**│   │   └── validation.ts**

**│   │**

**│   └── utils/**

**│       └── map-errors.ts**

**│**

**├── src/**

**│   └── index.test.ts**

**│**

**├── package.json**

**└── tsconfig.json**

**```**



**The agent should adapt this structure to the existing package conventions instead of duplicating files or creating a second package unnecessarily.**



**## 6.1 Shared Package Responsibilities**



**The shared package should provide:**



**- Standard map initialization.**

**- Style configuration.**

**- Map lifecycle utilities.**

**- Marker helpers.**

**- Route source and layer helpers.**

**- Coordinate validation.**

**- Distance calculation.**

**- Shared TypeScript types.**



**It should not contain:**



**- Customer-specific UI.**

**- Admin-specific UI.**

**- Order business logic.**

**- Courier assignment logic.**

**- API authentication.**

**- WebSocket connection management.**



**## 6.2 Map Configuration**



**Example:**



**```ts**

**export const MAP\_STYLES = {**

&#x20; **light: "https://tiles.openfreemap.org/styles/positron",**

&#x20; **dark: "https://tiles.openfreemap.org/styles/dark",**

**} as const;**

**```**



**Example configuration:**



**```ts**

**export interface MapConfig {**

&#x20; **container: HTMLElement;**

&#x20; **style: string;**

&#x20; **center: \[number, number];**

&#x20; **zoom: number;**

&#x20; **minZoom?: number;**

&#x20; **maxZoom?: number;**

**}**

**```**



**Use sensible defaults, but allow each application to configure its own map.**



**## 6.3 Map Initialization**



**Create one reusable map initialization function.**



**```ts**

**import maplibregl from "maplibre-gl";**



**export function createMap(config: MapConfig) {**

&#x20; **return new maplibregl.Map({**

&#x20;   **container: config.container,**

&#x20;   **style: config.style,**

&#x20;   **center: config.center,**

&#x20;   **zoom: config.zoom,**

&#x20;   **minZoom: config.minZoom,**

&#x20;   **maxZoom: config.maxZoom,**

&#x20;   **attributionControl: true,**

&#x20; **});**

**}**

**```**



**The actual implementation must account for:**



**- Container availability.**

**- Map initialization errors.**

**- Component unmounting.**

**- Duplicate initialization.**

**- WebGL availability.**

**- Style loading errors.**



**Do not initialize the map during server-side rendering.**



**---**



**# 7. Next.js and React Integration**



**MapLibre requires a browser environment.**



**## 7.1 Client Components**



**Map components must use:**



**```tsx**

**"use client";**

**```**



**Do not instantiate MapLibre at module scope or inside a server component.**



**## 7.2 React Lifecycle**



**Use React refs to store:**



**```ts**

**const containerRef = useRef<HTMLDivElement | null>(null);**



**const mapRef = useRef<maplibregl.Map | null>(null);**

**```**



**Initialize the map inside `useEffect`.**



**Destroy it during cleanup:**



**```ts**

**return () => {**

&#x20; **mapRef.current?.remove();**

&#x20; **mapRef.current = null;**

**};**

**```**



**Prevent duplicate map initialization during React development Strict Mode.**



**Do not recreate the entire map whenever courier coordinates change.**



**## 7.3 CSS**



**Import MapLibre CSS in the correct global stylesheet or application entry point according to the existing Next.js configuration.**



**```ts**

**import "maplibre-gl/dist/maplibre-gl.css";**

**```**



**Verify that both applications load the styles correctly.**



**## 7.4 Worker Configuration**



**The existing applications copy `maplibre-gl-worker.mjs` into their public directories.**



**Inspect the existing worker configuration before changing it.**



**Requirements:**



**- Keep worker support compatible with the current bundler.**

**- Verify the worker URL in production builds.**

**- Do not add another worker copy mechanism without checking the existing one.**

**- Test both applications independently.**



**---**



**# 8. Customer Delivery Map**



**Target component:**



**```text**

**apps/web/components/delivery/DeliveryMapView.tsx**

**```**



**Rewrite this component using pure MapLibre GL JS.**



**## 8.1 Required Features**



**The customer delivery map must support:**



**1. Displaying the delivery location.**

**2. Displaying the courier's current position.**

**3. Displaying the destination.**

**4. Showing the route between courier and destination.**

**5. Updating courier position in realtime.**

**6. Displaying delivery status.**

**7. Displaying estimated arrival information when available.**

**8. Automatically adjusting the camera when appropriate.**

**9. Handling unavailable GPS coordinates.**

**10. Handling map loading and failure states.**



**## 8.2 Marker Design**



**Use MapLibre markers.**



**Suggested marker types:**



**| Marker | Purpose |**

**|---|---|**

**| Hub marker | Store or warehouse |**

**| Courier marker | Current courier location |**

**| Destination marker | Customer delivery address |**



**Use custom HTML elements for markers where appropriate.**



**Do not rebuild markers on every React render.**



**## 8.3 Realtime Courier Updates**



**When a new courier coordinate arrives:**



**```ts**

**courierMarker.setLngLat(\[**

&#x20; **longitude,**

&#x20; **latitude,**

**]);**

**```**



**Update the existing marker instead of destroying and recreating it.**



**Use a throttled or controlled camera-follow mechanism. The camera should not unexpectedly jump whenever a new GPS update arrives.**



**## 8.4 Route Display**



**Use GeoJSON sources and MapLibre layers.**



**Example:**



**```ts**

**const routeFeature: GeoJSON.Feature<**

&#x20; **GeoJSON.LineString**

**> = {**

&#x20; **type: "Feature",**

&#x20; **properties: {},**

&#x20; **geometry: {**

&#x20;   **type: "LineString",**

&#x20;   **coordinates: \[**

&#x20;     **\[104.9282, 11.5564],**

&#x20;     **\[104.9300, 11.5580],**

&#x20;   **],**

&#x20; **},**

**};**

**```**



**Add a GeoJSON source:**



**```ts**

**map.addSource("delivery-route", {**

&#x20; **type: "geojson",**

&#x20; **data: routeFeature,**

**});**

**```**



**Add a line layer:**



**```ts**

**map.addLayer({**

&#x20; **id: "delivery-route-line",**

&#x20; **type: "line",**

&#x20; **source: "delivery-route",**

&#x20; **paint: {**

&#x20;   **"line-color": "#2563eb",**

&#x20;   **"line-width": 5,**

&#x20;   **"line-opacity": 0.85,**

&#x20; **},**

**});**

**```**



**When the route changes, update the existing source:**



**```ts**

**const source = map.getSource(**

&#x20; **"delivery-route"**

**) as maplibregl.GeoJSONSource;**



**source.setData(routeFeature);**

**```**



**Do not repeatedly add duplicate sources or layers.**



**## 8.5 Camera Behavior**



**Use `fitBounds` when the map first loads or when the delivery route changes significantly.**



**Do not continuously call `fitBounds` for every GPS update.**



**Provide a manual control to recenter the map.**



**---**



**# 9. Admin Fleet Dispatch Map**



**Target component:**



**```text**

**apps/admin/components/dispatch/FleetDispatchMap.tsx**

**```**



**Rewrite this component using pure MapLibre GL JS.**



**## 9.1 Required Features**



**The admin map must support:**



**- Multiple courier locations.**

**- Courier selection.**

**- Selected courier highlighting.**

**- Courier movement updates.**

**- Courier status indicators.**

**- Route visualization.**

**- Map camera controls.**

**- Dark basemap style.**

**- Loading and error states.**



**## 9.2 Courier Data Type**



**Use the existing backend response shape where possible.**



**A normalized frontend type could look like:**



**```ts**

**export interface CourierLocation {**

&#x20; **id: string;**

&#x20; **longitude: number;**

&#x20; **latitude: number;**

&#x20; **heading?: number;**

&#x20; **speed?: number;**

&#x20; **status?: string;**

&#x20; **updatedAt?: string;**

**}**

**```**



**Do not introduce a duplicate backend contract if an existing DTO already provides these fields.**



**## 9.3 Marker Management**



**Maintain markers by courier ID.**



**Example:**



**```ts**

**const courierMarkers = new Map<**

&#x20; **string,**

&#x20; **maplibregl.Marker**

**>();**

**```**



**When receiving updates:**



**1. Find the existing marker by courier ID.**

**2. Update its position if it exists.**

**3. Create a marker if it is new.**

**4. Remove the marker if the courier is no longer in the active dataset.**

**5. Update the selected courier's visual state.**



**Avoid creating duplicate markers for the same courier.**



**## 9.4 Scaling Strategy**



**Choose rendering based on the number of active couriers.**



**| Approximate count | Starting approach |**

**|---|---|**

**| Under 50 | DOM markers |**

**| 50–500 | GeoJSON source and symbol layers |**

**| 500–5,000+ | Optimized GeoJSON, clustering, and symbol layers |**



**These are initial guidelines, not fixed limits. Profile actual performance before selecting a final approach.**



**For large datasets, avoid creating hundreds of independent DOM elements.**



**## 9.5 Courier Selection**



**When an admin selects a courier:**



**- Update the selected courier state.**

**- Highlight the selected courier.**

**- Display courier details in the existing dispatch interface.**

**- Optionally focus the camera on the courier.**

**- Display the selected courier's route when available.**



**Do not move business logic into the map component.**



**---**



**# 10. OSRM Road Routing**



**Existing route action:**



**```text**

**apps/web/app/actions/fetch-road-route.ts**

**```**



**Inspect the existing implementation and preserve its public contract where possible.**



**## 10.1 OSRM Request Format**



**```text**

**/route/v1/driving/{longitude},{latitude};{longitude},{latitude}?overview=full\&geometries=geojson**

**```**



**Example:**



**```text**

**https://router.project-osrm.org/route/v1/driving/104.9282,11.5564;104.9300,11.5580?overview=full\&geometries=geojson**

**```**



**## 10.2 Coordinate Order**



**OSRM expects:**



**```text**

**longitude,latitude**

**```**



**Its GeoJSON route geometry also uses:**



**```text**

**\[longitude, latitude]**

**```**



**Pass this geometry directly to MapLibre.**



**Do not convert it into Leaflet's `\[latitude, longitude]` convention.**



**## 10.3 Response Handling**



**Validate:**



**- HTTP response status.**

**- OSRM response code.**

**- Route existence.**

**- Geometry availability.**

**- Distance.**

**- Duration.**



**Handle these conditions without crashing the map.**



**## 10.4 Routing Optimization**



**Do not request a new OSRM route for every GPS update.**



**Recommended approach:**



**- Update courier markers on every accepted location update.**

**- Request a new route when the courier deviates significantly from the existing route.**

**- Recalculate periodically if necessary.**

**- Avoid duplicate requests while one is already in progress.**

**- Cancel obsolete frontend requests where appropriate.**

**- Use existing backend caching if available.**



**Keep routing configuration separate from the map renderer.**



**---**



**# 11. Cambodia Geographic Support**



**Cambodia support depends on the geographic data and routing provider, not on MapLibre itself.**



**## 11.1 Required Test Locations**



**Use test coordinates from verified locations in:**



**- Phnom Penh.**

**- Toul Kork.**

**- Sen Sok.**

**- Chamkarmon.**

**- Siem Reap.**

**- Battambang.**

**- Sihanoukville.**

**- Rural Cambodia.**



**Do not rely on one Phnom Penh test location to confirm national coverage.**



**## 11.2 Coverage Requirements**



**Validate the following:**



**| Feature | Validation |**

**|---|---|**

**| Basemap | Cambodian roads and geographic features render |**

**| Street labels | Labels appear where data exists |**

**| Khmer labels | Display correctly where available |**

**| Provincial roads | Verify actual coverage |**

**| Rural roads | Check missing or disconnected roads |**

**| Routing | OSRM can route between supported test points |**

**| GPS | Live coordinates appear correctly |**

**| Address accuracy | Verify real delivery locations |**



**## 11.3 Geocoding**



**MapLibre does not provide address search or geocoding by itself.**



**If the existing project already has a geocoding service, reuse it.**



**Otherwise, consider Nominatim or another suitable geocoder as a separate integration.**



**Nominatim:**



**https://nominatim.org/**



**Important:**



**- Follow the provider's usage policy.**

**- Do not treat the public Nominatim endpoint as an unrestricted production service.**

**- Do not assume every Cambodian address has an exact match.**

**- Consider storing verified customer delivery coordinates in your own database.**



**## 11.4 Future Self-Hosting**



**For future infrastructure independence, investigate a Cambodia OpenStreetMap extract.**



**https://download.geofabrik.de/asia/cambodia.html**



**Do not implement self-hosted tiles as part of this migration unless separately approved.**



**---**



**# 12. Realtime and Data Handling**



**The migration must preserve existing backend communication.**



**## 12.1 Expected Data Flow**



**```text**

**WebSocket Event**

&#x20;     **|**

&#x20;     **v**

**Validate Payload**

&#x20;     **|**

&#x20;     **v**

**Validate Coordinates**

&#x20;     **|**

&#x20;     **v**

**Check Timestamp**

&#x20;     **|**

&#x20;     **v**

**Find Courier Marker**

&#x20;     **|**

&#x20;     **v**

**Update Marker Position**

&#x20;     **|**

&#x20;     **v**

**Update UI if Necessary**

**```**



**## 12.2 Data Validation**



**Validate:**



**- Courier ID.**

**- Longitude.**

**- Latitude.**

**- Timestamp.**

**- Optional heading.**

**- Optional speed.**



**Reject malformed coordinates.**



**## 12.3 Stale Updates**



**Do not allow an older GPS event to overwrite a newer location.**



**Compare event timestamps or sequence numbers using the existing backend contract.**



**## 12.4 Performance**



**Avoid unnecessary React rerenders.**



**Use:**



**- Refs for MapLibre instances.**

**- Stable callbacks.**

**- Existing realtime subscriptions.**

**- Throttling where necessary.**

**- MapLibre source updates.**

**- Cleanup for subscriptions and markers.**



**Do not create a new WebSocket connection whenever the map component rerenders.**



**## 12.5 Security**



**Preserve the existing authentication and authorization model.**



**The frontend must not:**



**- Subscribe to unauthorized courier data.**

**- Expose internal service credentials.**

**- Trust arbitrary courier IDs from the browser.**

**- Accept unvalidated coordinates as trusted business data.**



**---**



**# 13. Dependency Cleanup**



**After both map implementations are migrated, remove obsolete dependencies.**



**Expected removals:**



**```text**

**leaflet**

**@types/leaflet**

**@maplibre/maplibre-gl-leaflet**

**```**



**Run the appropriate pnpm commands from the repository root:**



**```bash**

**pnpm --filter web remove leaflet @types/leaflet @maplibre/maplibre-gl-leaflet**



**pnpm --filter admin remove leaflet @types/leaflet @maplibre/maplibre-gl-leaflet**

**```**



**Keep:**



**```text**

**maplibre-gl**

**@ec/map-basemap**

**```**



**Update the lockfile through pnpm.**



**Do not manually edit `pnpm-lock.yaml` unless there is a specific reason and the resulting lockfile is validated.**



**## 13.1 Repository-Wide Search**



**Search for:**



**```text**

**leaflet**

**L.map**

**L.marker**

**L.polyline**

**L.divIcon**

**L.tileLayer**

**@maplibre/maplibre-gl-leaflet**

**```**



**Also inspect:**



**- CSS files.**

**- Global styles.**

**- Type declarations.**

**- Package manifests.**

**- Next.js configuration.**

**- Docker files.**

**- Kubernetes manifests.**

**- Documentation.**

**- Tests.**

**- Agent instructions.**



**Remove obsolete references from active code and update documentation that describes the old architecture.**



**Do not delete historical migration documentation simply because it mentions Leaflet.**



**---**



**# 14. Error Handling and Fallbacks**



**The map must not be the only way users can understand delivery status.**



**## 14.1 Map Loading**



**Show a loading state while:**



**- The map initializes.**

**- The style loads.**

**- The initial geographic data is prepared.**



**## 14.2 Style or Tile Failure**



**If the basemap fails:**



**- Show an understandable error message.**

**- Preserve delivery information.**

**- Provide retry behavior where appropriate.**

**- Avoid an infinite loading state.**



**Consider a configurable fallback basemap provider, but do not silently switch to a provider with different licensing or API-key requirements.**



**## 14.3 WebGL Failure**



**MapLibre requires WebGL support.**



**If WebGL is unavailable:**



**- Do not repeatedly attempt to initialize the map.**

**- Display a fallback interface.**

**- Show the latest known courier location as text.**

**- Show delivery status and destination information.**

**- Keep other delivery actions usable.**



**A raster tile fallback does not solve a complete WebGL failure.**



**## 14.4 GPS Failure**



**If courier coordinates are missing or stale:**



**- Keep the last known location if available.**

**- Indicate that the location is not current.**

**- Display the last update timestamp.**

**- Do not display an invalid marker.**



**---**



**# 15. Testing Strategy**



**Testing is mandatory. Do not consider the migration complete just because the application compiles.**



**## 15.1 Shared Package Tests**



**Test:**



**- Coordinate validation.**

**- Coordinate conversion.**

**- Distance calculations.**

**- Map configuration.**

**- Route GeoJSON structure.**

**- Error handling.**



**Use the repository's existing testing framework.**



**## 15.2 Customer Map Tests**



**Verify:**



**- Map initializes.**

**- Customer map uses the light style.**

**- Courier marker appears.**

**- Destination marker appears.**

**- Route appears.**

**- Realtime GPS changes the existing marker.**

**- Camera controls work.**

**- Missing coordinates are handled.**

**- Map cleanup works.**

**- WebGL failure is handled.**



**## 15.3 Admin Map Tests**



**Verify:**



**- Map initializes with the dark style.**

**- Multiple couriers appear.**

**- Selecting a courier works.**

**- Existing courier markers update correctly.**

**- Removed couriers disappear.**

**- Duplicate markers are not created.**

**- Route visualization works.**

**- Camera controls work.**



**## 15.4 Routing Tests**



**Verify:**



**- OSRM request uses longitude-first coordinates.**

**- Valid routes render.**

**- Invalid routes are handled.**

**- Empty geometry is handled.**

**- Failed requests do not crash the map.**

**- Repeated GPS events do not trigger unnecessary routing requests.**



**## 15.5 Cambodia Coverage Tests**



**Verify real map rendering and routing for the selected test locations.**



**Do not mark Cambodian coverage as fully verified based only on a successful map initialization.**



**Record:**



**- Test location.**

**- Map rendering result.**

**- Road coverage result.**

**- Routing result.**

**- Missing roads or other limitations.**



**## 15.6 Build and Quality Commands**



**Run the actual scripts defined in the repository.**



**Expected quality gates include:**



**```bash**

**pnpm install --frozen-lockfile**

**pnpm lint**

**pnpm test**

**pnpm build**

**pnpm --filter web build**

**pnpm --filter admin build**

**```**



**If a script does not exist, do not invent a successful result. Inspect `package.json` and use the available equivalent.**



**---**



**# 16. Implementation Phases**



**Implement in the following order.**



**## Phase 0: Repository Inspection**



**Tasks:**



**1. Inspect Git status and current branch.**

**2. Inspect the `development` branch.**

**3. Read existing map components.**

**4. Read the shared map package.**

**5. Read OSRM route implementation.**

**6. Inspect frontend package manifests.**

**7. Inspect WebSocket integration.**

**8. Inspect existing tests.**

**9. Inspect Next.js worker configuration.**

**10. Record dependencies and existing behavior.**



**Deliverable:**



**```text**

**Repository inspection report**

**```**



**Do not modify application code before understanding the existing contracts.**



**## Phase 1: Shared MapLibre Package**



**Tasks:**



**1. Expand `packages/map-basemap`.**

**2. Implement map configuration.**

**3. Implement MapLibre initialization.**

**4. Implement lifecycle cleanup.**

**5. Implement coordinate helpers.**

**6. Implement marker helpers.**

**7. Implement route source helpers.**

**8. Add tests.**

**9. Verify package exports and TypeScript types.**



**Deliverable:**



**A reusable shared MapLibre package.**



**## Phase 2: Customer Delivery Map**



**Tasks:**



**1. Rewrite `DeliveryMapView.tsx`.**

**2. Initialize MapLibre.**

**3. Add customer-facing map style.**

**4. Add hub, courier, and destination markers.**

**5. Implement route source and layer.**

**6. Integrate existing delivery data.**

**7. Integrate existing realtime updates.**

**8. Implement camera controls.**

**9. Implement loading and error states.**

**10. Add tests.**



**Deliverable:**



**Customer delivery tracking using pure MapLibre.**



**## Phase 3: OSRM Integration**



**Tasks:**



**1. Inspect existing route action.**

**2. Preserve its public contract where possible.**

**3. Validate OSRM responses.**

**4. Preserve GeoJSON coordinate order.**

**5. Integrate the route into MapLibre.**

**6. Avoid unnecessary route recalculation.**

**7. Add route tests.**



**Deliverable:**



**Working road routing with MapLibre.**



**## Phase 4: Admin Fleet Dispatch**



**Tasks:**



**1. Rewrite `FleetDispatchMap.tsx`.**

**2. Use the dark basemap.**

**3. Implement multiple courier markers.**

**4. Add marker management by courier ID.**

**5. Implement courier selection.**

**6. Add route visualization.**

**7. Integrate existing dispatch data.**

**8. Preserve existing UI interactions.**

**9. Add tests.**



**Deliverable:**



**Admin fleet dispatch using pure MapLibre.**



**## Phase 5: Realtime Validation**



**Tasks:**



**1. Verify existing WebSocket subscriptions.**

**2. Verify courier update payloads.**

**3. Validate coordinate values.**

**4. Prevent stale updates.**

**5. Update existing markers.**

**6. Test multiple couriers.**

**7. Verify cleanup.**

**8. Check performance.**



**Deliverable:**



**Realtime delivery and fleet tracking working without duplicate connections or markers.**



**## Phase 6: Dependency Cleanup**



**Tasks:**



**1. Remove Leaflet from web.**

**2. Remove Leaflet from admin.**

**3. Remove the MapLibre Leaflet adapter.**

**4. Update pnpm lockfile.**

**5. Remove unused imports.**

**6. Remove obsolete CSS.**

**7. Search the entire repository for Leaflet usage.**

**8. Update affected documentation.**



**Deliverable:**



**No active Leaflet dependencies or implementation.**



**## Phase 7: Final Validation**



**Tasks:**



**1. Run shared package tests.**

**2. Run frontend tests.**

**3. Run lint.**

**4. Build web.**

**5. Build admin.**

**6. Verify map styles.**

**7. Verify OSRM.**

**8. Verify realtime tracking.**

**9. Verify Cambodia test locations.**

**10. Verify WebGL fallback.**

**11. Inspect production bundle and worker behavior.**



**Deliverable:**



**Validated pure MapLibre migration.**



**## Phase 8: Deployment Preparation**



**Tasks:**



**1. Inspect Docker build configuration.**

**2. Inspect Kubernetes deployment configuration.**

**3. Confirm worker assets are copied.**

**4. Build the required Docker images.**

**5. Verify deployment manifests.**

**6. Prepare rollout instructions.**

**7. Deploy only after explicit approval and available infrastructure.**

**8. Verify the running deployment.**



**Deliverable:**



**Deployment-ready changes and rollout documentation.**



**Important: The previously recorded Kubernetes image rebuild and rollout task was pending because Docker Desktop was offline. Recheck the current environment. Do not claim deployment succeeded without actual verification.**



**---**



**# 17. Git Workflow**



**## 17.1 Critical Rule**



**\*\*Never modify or commit directly to `main`.\*\***



**The project uses `development` as its integration branch.**



**The agent must preserve the existing Git workflow.**



**## 17.2 Branch Workflow**



**```bash**

**git status**

**git branch --show-current**

**git fetch origin**

**```**



**Inspect the current branch and any uncommitted changes.**



**If the working tree is clean and `development` is available:**



**```bash**

**git checkout development**

**git pull origin development**

**git checkout -b feat/maplibre-remove-leaflet**

**```**



**If there are uncommitted changes, do not discard them. Inspect and preserve them before switching branches.**



**## 17.3 Implementation and Commit**



**Use meaningful commits:**



**```bash**

**git add packages/map-basemap**



**git commit -m "feat(map): add shared MapLibre utilities"**

**```**



**```bash**

**git add apps/web**



**git commit -m "feat(web): migrate delivery map to MapLibre"**

**```**



**```bash**

**git add apps/admin**



**git commit -m "feat(admin): migrate fleet dispatch map to MapLibre"**

**```**



**```bash**

**git add pnpm-lock.yaml**



**git commit -m "chore(map): remove Leaflet dependencies"**

**```**



**The agent may group related changes into fewer commits if the repository's conventions favor that approach.**



**## 17.4 Push and Pull Request**



**```bash**

**git push -u origin feat/maplibre-remove-leaflet**

**```**



**Create a pull request:**



**```text**

**Base: development**

**Compare: feat/maplibre-remove-leaflet**

**```**



**Do not merge automatically.**



**Wait for review and approval.**



**Do not push to or modify `main`.**



**---**



**# 18. Documentation Deliverables**



**Create or update:**



**```text**

**docs/**

**└── migrations/**

&#x20;   **└── maplibre-migration/**

&#x20;       **├── README.md**

&#x20;       **├── 01-objectives-and-scope.md**

&#x20;       **├── 02-current-architecture.md**

&#x20;       **├── 03-target-architecture.md**

&#x20;       **├── 04-shared-map-package.md**

&#x20;       **├── 05-customer-delivery-map.md**

&#x20;       **├── 06-admin-fleet-dispatch.md**

&#x20;       **├── 07-realtime-integration.md**

&#x20;       **├── 08-osrm-routing.md**

&#x20;       **├── 09-cambodia-geographic-support.md**

&#x20;       **├── 10-dependency-cleanup.md**

&#x20;       **├── 11-testing-and-validation.md**

&#x20;       **├── 12-deployment.md**

&#x20;       **└── IMPLEMENTATION-CHECKLIST.md**

**```**



**Each document should have a clear scope.**



**Do not put the entire implementation into one oversized document.**



**The README should explain:**



**- Migration purpose.**

**- Architecture overview.**

**- Document index.**

**- Implementation order.**

**- Important constraints.**

**- Completion status.**



**The checklist must be updated as work progresses.**



**---**



**# 19. Definition of Done**



**The migration is complete only when all required conditions are satisfied.**



**## Architecture**



**- \[ ] Pure MapLibre GL JS is used in the customer application.**

**- \[ ] Pure MapLibre GL JS is used in the admin application.**

**- \[ ] Shared map logic is maintained in `@ec/map-basemap`.**

**- \[ ] OpenFreeMap styles load correctly.**

**- \[ ] OSRM routing works.**

**- \[ ] Existing backend tracking infrastructure is preserved.**



**## Functionality**



**- \[ ] Customer delivery map works.**

**- \[ ] Courier location updates work.**

**- \[ ] Destination marker works.**

**- \[ ] Delivery route renders.**

**- \[ ] Admin fleet map works.**

**- \[ ] Multiple courier markers work.**

**- \[ ] Courier selection works.**

**- \[ ] Camera controls work.**

**- \[ ] Loading and error states work.**

**- \[ ] WebGL fallback works.**



**## Cambodia**



**- \[ ] Phnom Penh map coverage tested.**

**- \[ ] Siem Reap map coverage tested.**

**- \[ ] Battambang map coverage tested.**

**- \[ ] Provincial or rural coverage tested.**

**- \[ ] Routing tested in supported locations.**

**- \[ ] Coordinate order verified.**



**## Dependencies**



**- \[ ] Leaflet removed from web dependencies.**

**- \[ ] Leaflet removed from admin dependencies.**

**- \[ ] MapLibre Leaflet adapter removed.**

**- \[ ] Lockfile updated.**

**- \[ ] No active Leaflet imports remain.**

**- \[ ] No obsolete Leaflet CSS remains.**



**## Quality**



**- \[ ] Shared package tests pass.**

**- \[ ] Frontend tests pass.**

**- \[ ] Lint passes.**

**- \[ ] Web production build passes.**

**- \[ ] Admin production build passes.**

**- \[ ] Worker configuration verified.**

**- \[ ] Realtime behavior verified.**

**- \[ ] No duplicate map initialization.**

**- \[ ] No duplicate courier markers.**



**## Git and Deployment**



**- \[ ] Work is on `feat/maplibre-remove-leaflet`.**

**- \[ ] Changes are committed.**

**- \[ ] Feature branch is pushed.**

**- \[ ] Pull request targets `development`.**

**- \[ ] Review is completed before merging.**

**- \[ ] No direct changes to `main`.**

**- \[ ] Deployment is verified separately.**



**---**



**# 20. Agent Implementation Rules**



**The coding agent must follow these rules throughout the implementation.**



**### Rule 1: Inspect Before Modifying**



**Read existing components, types, APIs, configuration, and tests before changing code.**



**Do not assume the repository matches this document exactly.**



**### Rule 2: Preserve Existing Business Logic**



**The migration is about the map rendering layer.**



**Do not rewrite:**



**- Order management.**

**- Courier assignment.**

**- Delivery status transitions.**

**- Authentication.**

**- Authorization.**

**- WebSocket backend services.**

**- Database models.**



**Only change these areas if a verified compatibility issue requires it and the change is within the approved scope.**



**### Rule 3: Reuse Existing Contracts**



**Reuse existing API responses, DTOs, hooks, and services.**



**Do not create duplicate data models or new endpoints without a clear technical reason.**



**### Rule 4: Avoid Unnecessary Dependencies**



**Use MapLibre's native capabilities.**



**Do not add another mapping wrapper or adapter.**



**### Rule 5: Keep Components Maintainable**



**Avoid giant React components.**



**Separate:**



**- Map initialization.**

**- Marker management.**

**- Route rendering.**

**- Realtime data handling.**

**- UI controls.**



**Keep responsibilities clear.**



**### Rule 6: Handle Lifecycle Correctly**



**Every map, marker, event listener, subscription, and resource must have a proper cleanup strategy.**



**Avoid memory leaks.**



**### Rule 7: Test Each Phase**



**Do not wait until the entire migration is finished before testing.**



**Run the relevant tests and builds after each major phase.**



**### Rule 8: Do Not Fake Completion**



**Report the actual result of every test.**



**If a test cannot run because infrastructure is unavailable, record it as blocked.**



**### Rule 9: Preserve Git Safety**



**Never work directly on `main`.**



**Do not discard user changes.**



**Use a feature branch and submit a pull request against `development`.**



**### Rule 10: Report Implementation Results**



**At the end, provide:**



**1. Summary of completed work.**

**2. Files created.**

**3. Files modified.**

**4. Dependencies removed.**

**5. Tests executed and their results.**

**6. Build results.**

**7. Known limitations.**

**8. Remaining tasks.**

**9. Git branch and commit information.**

**10. Deployment status.**



**---**



**# 21. Final Target State**



**The expected final architecture is:**



**```text**

**ECOMMERCE MONOREPO**

**│**

**├── apps/**

**│   ├── web/**

**│   │   └── Delivery Tracking**

**│   │       └── MapLibre GL JS**

**│   │**

**│   └── admin/**

**│       └── Fleet Dispatch**

**│           └── MapLibre GL JS**

**│**

**├── packages/**

**│   └── map-basemap/**

**│       ├── Map Configuration**

**│       ├── Map Lifecycle**

**│       ├── Marker Utilities**

**│       ├── Route Utilities**

**│       └── Geographic Utilities**

**│**

**├── backend/**

**│   └── Existing Microservices**

**│       ├── Delivery**

**│       ├── Tracking**

**│       └── WebSocket Integration**

**│**

**└── docs/**

&#x20;   **└── migrations/**

&#x20;       **└── maplibre-migration/**

**```**



**\*\*Final technology stack:\*\***



**| Layer | Technology |**

**|---|---|**

**| Map renderer | MapLibre GL JS |**

**| Basemap | OpenFreeMap |**

**| Geographic data | OpenStreetMap |**

**| Routing | OSRM |**

**| Coordinates | WGS84 / EPSG:4326 |**

**| Frontend | Next.js + React + TypeScript |**

**| Shared utilities | `@ec/map-basemap` |**

**| Realtime | Existing WebSocket + Redis |**

**| Geographic persistence | Existing PostgreSQL/PostGIS setup, if configured |**



**\*\*Final migration goal:\*\* One mapping engine, one coordinate convention, shared map utilities, existing backend services preserved, and no active Leaflet dependencies.**



**---**



**\*\*Implementation instruction:\*\* Start with Phase 0. Inspect the actual repository and report the current branch, working-tree status, existing map implementation, and any differences from this specification. Then implement phase by phase. Do not skip tests, change unrelated business logic, modify `main`, or claim deployment success without verification.**



