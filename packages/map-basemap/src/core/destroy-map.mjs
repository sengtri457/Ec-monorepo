import { LngLatBounds as DefaultLngLatBounds } from "maplibre-gl";
import { isValidCoordinate } from "../geo/validation.mjs";

/**
 * Safely tears down a MapLibre GL JS Map instance during component unmount.
 * @param {{ remove?: () => void } | null | undefined} map
 */
export function destroyMap(map) {
  if (!map || typeof map.remove !== "function") {
    return;
  }
  try {
    map.remove();
  } catch (err) {
    console.warn("[map-basemap] Error while destroying MapLibre instance:", err);
  }
}

/**
 * Fits the MapLibre camera around a list of [longitude, latitude] coordinates.
 * @param {{ fitBounds: (bounds: any, options?: Record<string, any>) => void } | null | undefined} map
 * @param {readonly (readonly [number, number])[]} coordinates
 * @param {{
 *   BoundsConstructor?: typeof DefaultLngLatBounds;
 *   padding?: number | { top: number; bottom: number; left: number; right: number };
 *   maxZoom?: number;
 *   duration?: number;
 * }} [options]
 * @returns {boolean}
 */
export function fitMapToCoordinates(map, coordinates, options = {}) {
  if (!map || typeof map.fitBounds !== "function" || !Array.isArray(coordinates)) {
    return false;
  }

  const valid = coordinates.filter((coord) => isValidCoordinate(coord));
  if (valid.length === 0) {
    return false;
  }

  const BoundsConstructor = options.BoundsConstructor ?? DefaultLngLatBounds;
  const bounds = new BoundsConstructor();
  for (const [lng, lat] of valid) {
    bounds.extend([lng, lat]);
  }

  map.fitBounds(bounds, {
    padding: options.padding ?? 48,
    maxZoom: options.maxZoom ?? 15,
    duration: options.duration ?? 600,
  });
  return true;
}
