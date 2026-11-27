import type {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  Popup,
} from "maplibre-gl";

export type BasemapTheme = "light" | "dark";

/** MapLibre & GeoJSON standard coordinate tuple: [longitude, latitude]. */
export type MapCoordinate = [number, number];

export interface GeoLocation {
  longitude: number;
  latitude: number;
}

export interface CambodiaBounds {
  readonly minLng: number;
  readonly maxLng: number;
  readonly minLat: number;
  readonly maxLat: number;
}

export interface CambodiaTestLocation {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly coordinate: readonly [number, number];
}

export interface DefaultMapConfigOptions {
  theme?: BasemapTheme;
  customStyleUrl?: string;
  center?: readonly [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  workerUrl?: string;
}

export interface DefaultMapConfig {
  style: string;
  center: MapCoordinate;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  workerUrl: string;
}

export type MapErrorCode =
  | "SSR_ENVIRONMENT"
  | "MISSING_CONTAINER"
  | "INVALID_COORDINATE"
  | "WEBGL_UNAVAILABLE"
  | "STYLE_LOAD_FAILED";

export declare class MapInitializationError extends Error {
  readonly code: MapErrorCode;
  constructor(code: MapErrorCode, message: string, cause?: unknown);
}

export interface CreateMapOptions {
  container: HTMLElement | null | undefined;
  style: string;
  center: readonly [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  workerUrl?: string;
  setWorkerUrl?: (url: string) => void;
  MapConstructor?: typeof MapLibreMap;
  isBrowserEnvironment?: () => boolean;
  checkWebGL?: () => boolean;
  onLoad?: () => void;
  onError?: (event: unknown) => void;
}

export interface FitMapOptions {
  BoundsConstructor?: typeof LngLatBounds;
  padding?:
    | number
    | { top: number; bottom: number; left: number; right: number };
  maxZoom?: number;
  duration?: number;
}

export interface CreateHtmlMarkerOptions<TMap = MapLibreMap> {
  map: TMap;
  coordinate: readonly [number, number];
  element: HTMLElement;
  anchor?:
    | "center"
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  offset?: [number, number];
  popupHtml?: string;
  onClick?: () => void;
  MarkerConstructor?: typeof Marker;
  PopupConstructor?: typeof Popup;
}

export interface ManagedMarkerEntry {
  marker: Marker;
  element: HTMLElement;
  cleanup: () => void;
}

export interface SyncCourierMarkersOptions<
  TCourier extends { courierId: string; longitude: number; latitude: number }
> {
  map: unknown;
  registry: Map<string, ManagedMarkerEntry>;
  couriers: readonly TCourier[];
  selectedCourierId: string | null;
  createMarkerElement: (courier: TCourier, isSelected: boolean) => HTMLElement;
  updateMarkerElement?: (
    element: HTMLElement,
    courier: TCourier,
    isSelected: boolean
  ) => void;
  onSelect?: (courierId: string) => void;
  MarkerConstructor?: typeof Marker;
}

export interface RouteLineFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "LineString";
    coordinates: MapCoordinate[];
  };
}

export interface UpsertRouteLayerOptions {
  sourceId: string;
  layerId: string;
  coordinates: readonly (readonly [number, number])[];
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  arrowLayerId?: string;
  arrowColor?: string;
}

export interface TelemetryPayloadInput {
  id?: string;
  courierId?: string;
  longitude: number;
  latitude: number;
  heading?: number | null;
  speed?: number | null;
  updatedAt?: string | number | null;
}

export type TelemetryValidationResult =
  | {
      valid: true;
      id: string;
      coordinate: MapCoordinate;
      timestampMs: number | null;
      heading: number | undefined;
      speed: number | undefined;
    }
  | {
      valid: false;
      reason: "missing-id" | "invalid-coordinate" | "stale";
    };

export declare const OPENFREEMAP_STYLES: Readonly<Record<BasemapTheme, string>>;
export declare const DEFAULT_MAPLIBRE_WORKER_URL: string;
export declare const PHNOM_PENH_CENTER: readonly [number, number];
export declare const TOUL_KORK_HUB_COORDINATE: readonly [number, number];
export declare const CAMBODIA_BOUNDS: CambodiaBounds;
export declare const CAMBODIA_TEST_LOCATIONS: readonly CambodiaTestLocation[];

export declare function resolveStyleUrl(
  theme: BasemapTheme,
  customStyleUrl?: string
): string;
export declare function createDefaultMapConfig(
  overrides?: DefaultMapConfigOptions
): DefaultMapConfig;

export declare function toMapCoordinate(location: GeoLocation): MapCoordinate;
export declare function fromLatLng(
  latitude: number,
  longitude: number
): MapCoordinate;

export declare function isValidCoordinate(
  coordinate: unknown
): coordinate is MapCoordinate;
export declare function isValidLatLng(
  latitude: unknown,
  longitude: unknown
): boolean;
export declare function isWithinCambodiaBounds(coordinate: unknown): boolean;
export declare function isLocationStale(
  updatedAt: string | number | null | undefined,
  nowMs?: number,
  maxAgeMs?: number
): boolean;
export declare function validateTelemetryUpdate(
  payload: TelemetryPayloadInput,
  previousTimestampMs?: number | null
): TelemetryValidationResult;

export declare function haversineKm(
  from: readonly [number, number],
  to: readonly [number, number]
): number;
export declare function calculateRouteDistanceKm(
  coordinates: readonly (readonly [number, number])[]
): number;
export declare function estimateDrivingMinutes(
  distanceKm: number,
  speedKmh?: number,
  minMinutes?: number
): number;
export declare function formatDistance(km: number): string;

export declare function isWebGLSupported(
  doc?: { createElement: (tagName: string) => { getContext?: (type: string) => unknown } }
): boolean;

export declare function createMap(options: CreateMapOptions): MapLibreMap;
export declare function destroyMap(
  map: { remove?: () => void } | null | undefined
): void;
export declare function fitMapToCoordinates(
  map:
    | MapLibreMap
    | {
        fitBounds: (
          bounds: LngLatBounds,
          options?: Record<string, unknown>
        ) => unknown;
      }
    | null
    | undefined,
  coordinates: readonly (readonly [number, number])[],
  options?: FitMapOptions
): boolean;

export declare function createHtmlMarker<TMap = MapLibreMap>(
  options: CreateHtmlMarkerOptions<TMap>
): { marker: Marker; cleanup: () => void };
export declare function syncCourierMarkers<
  TCourier extends { courierId: string; longitude: number; latitude: number }
>(options: SyncCourierMarkersOptions<TCourier>): void;

export declare function buildRouteFeature(
  coordinates: readonly (readonly [number, number])[],
  properties?: Record<string, unknown>
): RouteLineFeature;
export declare function clearRouteLayer(
  map: MapLibreMap | { getSource?: (id: string) => unknown } | null | undefined,
  sourceId: string
): boolean;
export declare function upsertRouteLayer(
  map:
    | MapLibreMap
    | {
        isStyleLoaded?: () => boolean | void;
        getSource: (id: string) => unknown;
        getLayer?: (id: string) => unknown;
        addSource: (id: string, spec: Record<string, unknown>) => unknown;
        addLayer: (spec: Record<string, unknown>) => unknown;
      }
    | null
    | undefined,
  options: UpsertRouteLayerOptions
): boolean;
