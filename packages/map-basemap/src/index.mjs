export {
  OPENFREEMAP_STYLES,
  DEFAULT_MAPLIBRE_WORKER_URL,
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
