import {
  Map as MapLibreMap,
  setWorkerUrl as defaultSetWorkerUrl,
} from "maplibre-gl";
import { DEFAULT_MAPLIBRE_WORKER_URL } from "../config/map-styles.mjs";
import { isValidCoordinate } from "../geo/validation.mjs";
import { MapInitializationError, isWebGLSupported } from "../utils/map-errors.mjs";

/**
 * Creates a MapLibre GL JS Map instance with strict browser, container, coordinate,
 * WebGL, and worker URL guards. Never initializes during SSR.
 * @param {{
 *   container: HTMLElement | null | undefined;
 *   style: string;
 *   center: readonly [number, number];
 *   zoom: number;
 *   minZoom?: number;
 *   maxZoom?: number;
 *   workerUrl?: string;
 *   setWorkerUrl?: (url: string) => void;
 *   MapConstructor?: typeof MapLibreMap;
 *   isBrowserEnvironment?: () => boolean;
 *   checkWebGL?: () => boolean;
 *   onLoad?: () => void;
 *   onError?: (event: unknown) => void;
 * }} options
 * @returns {MapLibreMap}
 */
export function createMap({
  container,
  style,
  center,
  zoom,
  minZoom,
  maxZoom,
  workerUrl = DEFAULT_MAPLIBRE_WORKER_URL,
  setWorkerUrl = defaultSetWorkerUrl,
  MapConstructor = MapLibreMap,
  isBrowserEnvironment = () => typeof window !== "undefined",
  checkWebGL = () => isWebGLSupported(),
  onLoad,
  onError,
}) {
  if (!isBrowserEnvironment()) {
    throw new MapInitializationError(
      "SSR_ENVIRONMENT",
      "MapLibre cannot initialize in a server-side rendering environment."
    );
  }

  if (!container) {
    throw new MapInitializationError(
      "MISSING_CONTAINER",
      "Map container element is required to initialize MapLibre."
    );
  }

  if (!isValidCoordinate(center)) {
    throw new MapInitializationError(
      "INVALID_COORDINATE",
      `Invalid initial center coordinate: ${JSON.stringify(center)}`
    );
  }

  if (!checkWebGL()) {
    throw new MapInitializationError(
      "WEBGL_UNAVAILABLE",
      "WebGL is unavailable in this browser environment."
    );
  }

  if (typeof setWorkerUrl === "function" && workerUrl) {
    setWorkerUrl(workerUrl);
  }

  const map = new MapConstructor({
    container,
    style,
    center: /** @type {[number, number]} */ ([center[0], center[1]]),
    zoom,
    ...(minZoom !== undefined ? { minZoom } : {}),
    ...(maxZoom !== undefined ? { maxZoom } : {}),
    attributionControl: { compact: true },
  });

  if (typeof onLoad === "function") {
    map.on("load", onLoad);
  }
  if (typeof onError === "function") {
    map.on("error", onError);
  }

  return map;
}
