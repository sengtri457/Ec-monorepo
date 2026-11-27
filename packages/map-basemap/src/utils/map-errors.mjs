/**
 * Typed initialization/runtime error codes emitted by pure MapLibre helpers.
 * @typedef {"SSR_ENVIRONMENT" | "MISSING_CONTAINER" | "INVALID_COORDINATE" | "WEBGL_UNAVAILABLE" | "STYLE_LOAD_FAILED"} MapErrorCode
 */

export class MapInitializationError extends Error {
  /**
   * @param {MapErrorCode} code
   * @param {string} message
   * @param {unknown} [cause]
   */
  constructor(code, message, cause) {
    super(message);
    this.name = "MapInitializationError";
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

/**
 * Safely checks whether WebGL (WebGL2 or WebGL1) context creation works in the current DOM.
 * Never throws; returns false during SSR or in environments without WebGL.
 * @param {{ createElement: (tagName: string) => { getContext?: (type: string) => unknown } } | undefined} [doc]
 * @returns {boolean}
 */
export function isWebGLSupported(
  doc = typeof document !== "undefined" ? document : undefined
) {
  if (!doc || typeof doc.createElement !== "function") {
    return false;
  }
  try {
    const canvas = doc.createElement("canvas");
    if (!canvas || typeof canvas.getContext !== "function") {
      return false;
    }
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}
