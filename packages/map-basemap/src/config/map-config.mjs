import { DEFAULT_MAPLIBRE_WORKER_URL, resolveStyleUrl } from "./map-styles.mjs";

/**
 * Central Phnom Penh coordinate in MapLibre [longitude, latitude] order.
 * @type {readonly [number, number]}
 */
export const PHNOM_PENH_CENTER = Object.freeze(
  /** @type {readonly [number, number]} */ ([104.9282, 11.5564])
);

/**
 * Clothes Toul Kork Central Fulfillment Hub coordinate in [longitude, latitude] order.
 * @type {readonly [number, number]}
 */
export const TOUL_KORK_HUB_COORDINATE = Object.freeze(
  /** @type {readonly [number, number]} */ ([104.8988, 11.5761])
);

/**
 * Geographic bounding box encompassing Cambodia for coverage test assertions.
 */
export const CAMBODIA_BOUNDS = Object.freeze({
  minLng: 102.3,
  maxLng: 107.7,
  minLat: 9.9,
  maxLat: 14.7,
});

/**
 * Helper to define a frozen tuple-typed Cambodia test location.
 * @param {string} id
 * @param {string} name
 * @param {string} region
 * @param {number} lng
 * @param {number} lat
 */
function loc(id, name, region, lng, lat) {
  return Object.freeze({
    id,
    name,
    region,
    coordinate: Object.freeze(/** @type {readonly [number, number]} */ ([lng, lat])),
  });
}

/**
 * Verified Cambodian test coordinates in [longitude, latitude] order.
 * Covers Phnom Penh districts, major provincial hubs, and rural areas.
 * @type {readonly Readonly<{ id: string; name: string; region: string; coordinate: readonly [number, number] }>[]}
 */
export const CAMBODIA_TEST_LOCATIONS = Object.freeze([
  loc("phnom-penh", "Phnom Penh Central", "Phnom Penh", 104.9282, 11.5564),
  loc("toul-kork", "Toul Kork Hub", "Phnom Penh", 104.8988, 11.5761),
  loc("sen-sok", "Sen Sok", "Phnom Penh", 104.8667, 11.5833),
  loc("chamkarmon", "Chamkarmon", "Phnom Penh", 104.9282, 11.5422),
  loc("siem-reap", "Siem Reap", "Siem Reap", 103.8564, 13.3633),
  loc("battambang", "Battambang", "Battambang", 103.2022, 13.0957),
  loc("sihanoukville", "Sihanoukville", "Preah Sihanouk", 103.5292, 10.6096),
  loc("kampong-speu-rural", "Kampong Speu Rural", "Kampong Speu", 104.415, 11.4533),
]);

/**
 * Builds a normalized MapLibre configuration object with sensible Phnom Penh defaults.
 * @param {{
 *   theme?: "light" | "dark";
 *   customStyleUrl?: string;
 *   center?: readonly [number, number];
 *   zoom?: number;
 *   minZoom?: number;
 *   maxZoom?: number;
 *   workerUrl?: string;
 * }} [overrides]
 */
export function createDefaultMapConfig(overrides = {}) {
  const theme = overrides.theme === "dark" ? "dark" : "light";
  return {
    style: resolveStyleUrl(theme, overrides.customStyleUrl),
    center: /** @type {[number, number]} */ ([
      ...(overrides.center ?? PHNOM_PENH_CENTER),
    ]),
    zoom: overrides.zoom ?? 13,
    minZoom: overrides.minZoom ?? 4,
    maxZoom: overrides.maxZoom ?? 20,
    workerUrl: overrides.workerUrl ?? DEFAULT_MAPLIBRE_WORKER_URL,
  };
}
