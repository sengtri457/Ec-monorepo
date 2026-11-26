/**
 * Keyless OpenFreeMap vector style presets for light (storefront) and dark (admin) themes.
 * @type {Readonly<Record<"light" | "dark", string>>}
 */
export const OPENFREEMAP_STYLES = Object.freeze({
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
});

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
