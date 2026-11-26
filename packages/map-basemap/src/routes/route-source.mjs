import { isValidCoordinate } from "../geo/validation.mjs";

/**
 * Builds a valid GeoJSON LineString Feature from [longitude, latitude] coordinates.
 * @param {readonly (readonly [number, number])[]} coordinates
 * @param {Record<string, unknown>} [properties]
 * @returns {{
 *   type: "Feature";
 *   properties: Record<string, unknown>;
 *   geometry: { type: "LineString"; coordinates: [number, number][] };
 * }}
 */
export function buildRouteFeature(coordinates, properties = {}) {
  const valid = Array.isArray(coordinates)
    ? coordinates
        .filter((coord) => isValidCoordinate(coord))
        .map((coord) => /** @type {[number, number]} */ ([coord[0], coord[1]]))
    : [];

  return {
    type: "Feature",
    properties,
    geometry: {
      type: "LineString",
      coordinates: valid,
    },
  };
}

/**
 * Clears an existing GeoJSON source without removing its layer.
 * @param {{ getSource?: (id: string) => any } | null | undefined} map
 * @param {string} sourceId
 * @returns {boolean}
 */
export function clearRouteLayer(map, sourceId) {
  if (!map || typeof map.getSource !== "function") {
    return false;
  }
  const source = map.getSource(sourceId);
  if (!source || typeof source.setData !== "function") {
    return false;
  }
  source.setData({
    type: "FeatureCollection",
    features: [],
  });
  return true;
}

/**
 * Inserts or updates a GeoJSON line route source & layer (with optional line-placed arrow symbols)
 * without duplicating sources or layers across route refreshes.
 * @param {{
 *   isStyleLoaded?: () => boolean;
 *   getSource: (id: string) => any;
 *   getLayer?: (id: string) => any;
 *   addSource: (id: string, spec: Record<string, any>) => void;
 *   addLayer: (spec: Record<string, any>) => void;
 * } | null | undefined} map
 * @param {{
 *   sourceId: string;
 *   layerId: string;
 *   coordinates: readonly (readonly [number, number])[];
 *   paint?: Record<string, unknown>;
 *   layout?: Record<string, unknown>;
 *   arrowLayerId?: string;
 *   arrowColor?: string;
 * }} options
 * @returns {boolean}
 */
export function upsertRouteLayer(
  map,
  {
    sourceId,
    layerId,
    coordinates,
    paint = {},
    layout = {},
    arrowLayerId,
    arrowColor = "#1d4ed8",
  }
) {
  if (
    !map ||
    (typeof map.isStyleLoaded === "function" && !map.isStyleLoaded())
  ) {
    return false;
  }

  const feature = buildRouteFeature(coordinates);
  if (feature.geometry.coordinates.length < 2) {
    clearRouteLayer(map, sourceId);
    return false;
  }

  const existingSource = map.getSource(sourceId);
  if (existingSource && typeof existingSource.setData === "function") {
    existingSource.setData(feature);
    return true;
  }

  map.addSource(sourceId, {
    type: "geojson",
    data: feature,
  });

  if (typeof map.getLayer !== "function" || !map.getLayer(layerId)) {
    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: {
        "line-join": "round",
        "line-cap": "round",
        ...layout,
      },
      paint: {
        "line-color": "#2563eb",
        "line-width": 5,
        "line-opacity": 0.85,
        ...paint,
      },
    });
  }

  if (
    arrowLayerId &&
    (typeof map.getLayer !== "function" || !map.getLayer(arrowLayerId))
  ) {
    map.addLayer({
      id: arrowLayerId,
      type: "symbol",
      source: sourceId,
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 90,
        "text-field": "▶",
        "text-size": 12,
        "text-keep-upright": false,
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": arrowColor,
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
    });
  }

  return true;
}
