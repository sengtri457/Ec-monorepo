/**
 * Converts a { longitude, latitude } object into MapLibre/GeoJSON [longitude, latitude] order.
 * @param {{ longitude: number; latitude: number }} location
 * @returns {[number, number]}
 */
export function toMapCoordinate(location) {
  return [location.longitude, location.latitude];
}

/**
 * Explicitly converts latitude/longitude scalars (e.g. backend fields) into [longitude, latitude].
 * Never invoke silently on already-ordered coordinates.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {[number, number]}
 */
export function fromLatLng(latitude, longitude) {
  return [longitude, latitude];
}
