/**
 * Keyless OpenFreeMap vector style presets for light (storefront) and dark (admin) themes.
 * @type {Readonly<Record<"light" | "dark", string>>}
 */
export const OPENFREEMAP_STYLES = Object.freeze({
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
});

export const OSM_FALLBACK_TILE_URL =
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const DEFAULT_MAPLIBRE_WORKER_URL = "/maplibre-gl-worker.mjs";

/**
 * Resolves the MapLibre style URL for a basemap theme, honoring optional env overrides.
 * @param {"light" | "dark"} theme
 * @param {string} [customStyleUrl]
 * @returns {string}
 */
export function resolveStyleUrl(theme, customStyleUrl) {
  const trimmed =
    typeof customStyleUrl === "string" ? customStyleUrl.trim() : "";
  return trimmed || OPENFREEMAP_STYLES[theme];
}

/**
 * Attaches an OpenFreeMap vector layer to a Leaflet map via @maplibre/maplibre-gl-leaflet,
 * configuring a same-origin Web Worker URL when provided and falling back to OpenStreetMap
 * raster tiles if WebGL/MapLibre initialization throws.
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
