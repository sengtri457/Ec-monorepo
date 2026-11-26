import { CAMBODIA_BOUNDS } from "../config/map-config.mjs";
import { toMapCoordinate } from "./coordinates.mjs";

/**
 * Validates that a [longitude, latitude] coordinate is finite and within WGS84 bounds.
 * @param {unknown} coordinate
 * @returns {coordinate is [number, number]}
 */
export function isValidCoordinate(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length !== 2) {
    return false;
  }
  const [longitude, latitude] = coordinate;
  return (
    typeof longitude === "number" &&
    typeof latitude === "number" &&
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

/**
 * Validates scalar latitude and longitude numbers against WGS84 bounds.
 * @param {unknown} latitude
 * @param {unknown} longitude
 * @returns {boolean}
 */
export function isValidLatLng(latitude, longitude) {
  return isValidCoordinate([longitude, latitude]);
}

/**
 * Verifies a [longitude, latitude] coordinate falls inside Cambodia's geographic envelope.
 * Intended for Cambodia-specific test data and sanity assertions, not global rejection.
 * @param {unknown} coordinate
 * @returns {boolean}
 */
export function isWithinCambodiaBounds(coordinate) {
  if (!isValidCoordinate(coordinate)) {
    return false;
  }
  const [longitude, latitude] = coordinate;
  return (
    longitude >= CAMBODIA_BOUNDS.minLng &&
    longitude <= CAMBODIA_BOUNDS.maxLng &&
    latitude >= CAMBODIA_BOUNDS.minLat &&
    latitude <= CAMBODIA_BOUNDS.maxLat
  );
}

/**
 * Parses an ISO string or numeric epoch timestamp into milliseconds, or null if absent/invalid.
 * @param {string | number | null | undefined} value
 * @returns {number | null}
 */
function parseTimestampMs(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Returns true if a GPS timestamp is missing, unparseable, or older than maxAgeMs.
 * @param {string | number | null | undefined} updatedAt
 * @param {number} [nowMs]
 * @param {number} [maxAgeMs]
 * @returns {boolean}
 */
export function isLocationStale(updatedAt, nowMs = Date.now(), maxAgeMs = 120_000) {
  const ts = parseTimestampMs(updatedAt);
  if (ts === null) {
    return true;
  }
  return nowMs - ts > maxAgeMs;
}

/**
 * Validates incoming courier telemetry payloads and prevents out-of-order stale updates.
 * @param {{
 *   id?: string;
 *   courierId?: string;
 *   longitude: number;
 *   latitude: number;
 *   heading?: number | null;
 *   speed?: number | null;
 *   updatedAt?: string | number | null;
 * }} payload
 * @param {number | null} [previousTimestampMs]
 * @returns {{
 *   valid: true;
 *   id: string;
 *   coordinate: [number, number];
 *   timestampMs: number | null;
 *   heading: number | undefined;
 *   speed: number | undefined;
 * } | {
 *   valid: false;
 *   reason: "missing-id" | "invalid-coordinate" | "stale";
 * }}
 */
export function validateTelemetryUpdate(payload, previousTimestampMs = null) {
  const id = String(payload?.id ?? payload?.courierId ?? "").trim();
  if (!id) {
    return { valid: false, reason: "missing-id" };
  }

  const coordinate = toMapCoordinate({
    longitude: payload?.longitude,
    latitude: payload?.latitude,
  });
  if (!isValidCoordinate(coordinate)) {
    return { valid: false, reason: "invalid-coordinate" };
  }

  const timestampMs = parseTimestampMs(payload?.updatedAt);
  if (
    previousTimestampMs !== null &&
    Number.isFinite(previousTimestampMs) &&
    timestampMs !== null &&
    timestampMs < previousTimestampMs
  ) {
    return { valid: false, reason: "stale" };
  }

  const heading =
    typeof payload?.heading === "number" && Number.isFinite(payload.heading)
      ? payload.heading
      : undefined;
  const speed =
    typeof payload?.speed === "number" && Number.isFinite(payload.speed)
      ? payload.speed
      : undefined;

  return {
    valid: true,
    id,
    coordinate,
    timestampMs,
    heading,
    speed,
  };
}
