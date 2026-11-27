import { isValidCoordinate } from "./validation.mjs";

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Computes great-circle distance in kilometers between two [longitude, latitude] coordinates.
 * @param {readonly [number, number]} from
 * @param {readonly [number, number]} to
 * @returns {number}
 */
export function haversineKm(from, to) {
  if (!isValidCoordinate(from) || !isValidCoordinate(to)) {
    return 0;
  }
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Sums total distance in kilometers along a GeoJSON [longitude, latitude] coordinate sequence.
 * @param {readonly (readonly [number, number])[]} coordinates
 * @returns {number}
 */
export function calculateRouteDistanceKm(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return 0;
  }
  let total = 0;
  for (let i = 1; i < coordinates.length; i += 1) {
    total += haversineKm(coordinates[i - 1], coordinates[i]);
  }
  return total;
}

/**
 * Estimates urban driving duration in minutes from route distance.
 * @param {number} distanceKm
 * @param {number} [speedKmh]
 * @param {number} [minMinutes]
 * @returns {number}
 */
export function estimateDrivingMinutes(
  distanceKm,
  speedKmh = 25,
  minMinutes = 5
) {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0 || speedKmh <= 0) {
    return minMinutes;
  }
  return Math.max(minMinutes, Math.round((distanceKm / speedKmh) * 60));
}

/**
 * Formats kilometer distances as meters (< 1 km) or 1-decimal km.
 * @param {number} km
 * @returns {string}
 */
export function formatDistance(km) {
  if (!Number.isFinite(km) || km < 0) {
    return "0 m";
  }
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}
