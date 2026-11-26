import {
  OSM_FALLBACK_TILE_URL,
  DEFAULT_MAPLIBRE_WORKER_URL,
  resolveStyleUrl,
} from "./config/map-styles.mjs";

export {
  OPENFREEMAP_STYLES,
  DEFAULT_MAPLIBRE_WORKER_URL,
  OSM_FALLBACK_TILE_URL,
  resolveStyleUrl,
} from "./config/map-styles.mjs";

export {
  PHNOM_PENH_CENTER,
  TOUL_KORK_HUB_COORDINATE,
  CAMBODIA_BOUNDS,
  CAMBODIA_TEST_LOCATIONS,
  createDefaultMapConfig,
} from "./config/map-config.mjs";

export { toMapCoordinate, fromLatLng } from "./geo/coordinates.mjs";

export {
  isValidCoordinate,
  isValidLatLng,
  isWithinCambodiaBounds,
  isLocationStale,
  validateTelemetryUpdate,
} from "./geo/validation.mjs";

export {
  haversineKm,
  calculateRouteDistanceKm,
  estimateDrivingMinutes,
  formatDistance,
} from "./geo/distance.mjs";

export { MapInitializationError, isWebGLSupported } from "./utils/map-errors.mjs";

export { createMap } from "./core/create-map.mjs";
export { destroyMap, fitMapToCoordinates } from "./core/destroy-map.mjs";

export { createHtmlMarker, syncCourierMarkers } from "./markers/create-marker.mjs";

export {
  buildRouteFeature,
  upsertRouteLayer,
  clearRouteLayer,
} from "./routes/route-source.mjs";

/**
 * Legacy Leaflet basemap bridge retained temporarily until Phase 6 dependency removal.
 * @deprecated Migrate directly to createMap() and pure MapLibre GL JS.
 * @template TMap
 * @template {{ addTo: (map: TMap) => any }} TLayer
 * @param {{
 *   L: { tileLayer: (url: string, options?: Record<string, any>) => TLayer };
 *   map: TMap;
 *   maplibreGL: (options: { style: string; padding?: number }) => TLayer;
 *   setWorkerUrl?: (url: string) => void;
 *   workerUrl?: string;
 *   theme: "light" | "dark";
 *   customStyleUrl?: string;
 *   maxZoom?: number;
 *   darkFallbackClassName?: string;
 * }} options
 * @returns {{ mode: "vector" | "raster-fallback"; layer: TLayer }}
 */
export function attachBasemapLayer({
  L,
  map,
  maplibreGL,
  setWorkerUrl,
  workerUrl = DEFAULT_MAPLIBRE_WORKER_URL,
  theme,
  customStyleUrl,
  maxZoom = 20,
  darkFallbackClassName = "ec-osm-dark-fallback",
}) {
  const style = resolveStyleUrl(theme, customStyleUrl);

  try {
    if (typeof setWorkerUrl === "function") {
      setWorkerUrl(workerUrl);
    }
    const vectorLayer = maplibreGL({ style, padding: 0.15 });
    vectorLayer.addTo(map);
    return { mode: "vector", layer: vectorLayer };
  } catch (err) {
    console.warn(
      "[map-basemap] Vector layer unavailable, using OSM fallback:",
      err
    );
    const tileLayer = L.tileLayer(OSM_FALLBACK_TILE_URL, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom,
      ...(theme === "dark" ? { className: darkFallbackClassName } : {}),
    });
    tileLayer.addTo(map);
    return { mode: "raster-fallback", layer: tileLayer };
  }
}
