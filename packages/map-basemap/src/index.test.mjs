import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OPENFREEMAP_STYLES,
  OSM_FALLBACK_TILE_URL,
  resolveStyleUrl,
  attachBasemapLayer,
} from "./index.mjs";

describe("resolveStyleUrl", () => {
  it("returns OpenFreeMap positron for light theme by default", () => {
    assert.equal(
      resolveStyleUrl("light"),
      "https://tiles.openfreemap.org/styles/positron"
    );
  });

  it("returns OpenFreeMap dark for dark theme by default", () => {
    assert.equal(
      resolveStyleUrl("dark"),
      "https://tiles.openfreemap.org/styles/dark"
    );
  });

  it("prefers trimmed customStyleUrl when provided", () => {
    assert.equal(
      resolveStyleUrl("light", "  https://example.com/custom-style.json  "),
      "https://example.com/custom-style.json"
    );
  });

  it("falls back to theme default when customStyleUrl is blank", () => {
    assert.equal(resolveStyleUrl("dark", "   "), OPENFREEMAP_STYLES.dark);
  });
});

describe("attachBasemapLayer", () => {
  it("attaches OpenFreeMap vector layer when maplibreGL succeeds", () => {
    const fakeMap = { id: "map-1" };
    /** @type {{ style: string; padding?: number } | null} */
    let capturedOptions = null;
    /** @type {unknown} */
    let addedToMap = null;

    const fakeLayer = {
      /** @param {unknown} targetMap */
      addTo(targetMap) {
        addedToMap = targetMap;
        return this;
      },
    };

    const result = attachBasemapLayer({
      L: {
        tileLayer() {
          assert.fail("tileLayer should not be called on vector success");
          return fakeLayer;
        },
      },
      map: fakeMap,
      maplibreGL(opts) {
        capturedOptions = opts;
        return fakeLayer;
      },
      theme: "light",
    });

    assert.equal(result.mode, "vector");
    assert.equal(result.layer, fakeLayer);
    assert.deepEqual(capturedOptions, {
      style: OPENFREEMAP_STYLES.light,
      padding: 0.15,
    });
    assert.equal(addedToMap, fakeMap);
  });

  it("falls back to OSM raster tiles without dark class when light vector init fails", () => {
    const fakeMap = { id: "map-light-fallback" };
    /** @type {string | null} */
    let capturedUrl = null;
    /** @type {Record<string, any> | undefined} */
    let capturedOpts;
    /** @type {unknown} */
    let addedToMap = null;

    const fallbackLayer = {
      /** @param {unknown} targetMap */
      addTo(targetMap) {
        addedToMap = targetMap;
        return this;
      },
    };

    const result = attachBasemapLayer({
      L: {
        tileLayer(url, opts) {
          capturedUrl = url;
          capturedOpts = opts;
          return fallbackLayer;
        },
      },
      map: fakeMap,
      maplibreGL() {
        return {
          addTo() {
            throw new Error("WebGL context creation failed");
          },
        };
      },
      theme: "light",
      maxZoom: 20,
    });

    assert.equal(result.mode, "raster-fallback");
    assert.equal(result.layer, fallbackLayer);
    assert.equal(capturedUrl, OSM_FALLBACK_TILE_URL);
    assert.equal(capturedOpts?.maxZoom, 20);
    assert.equal(capturedOpts?.className, undefined);
    assert.equal(addedToMap, fakeMap);
  });

  it("falls back to OSM raster tiles with dark CSS class when dark vector init fails", () => {
    const fakeMap = { id: "map-dark-fallback" };
    /** @type {Record<string, any> | undefined} */
    let capturedOpts;

    const result = attachBasemapLayer({
      L: {
        tileLayer(_url, opts) {
          capturedOpts = opts;
          return {
            addTo() {
              return this;
            },
          };
        },
      },
      map: fakeMap,
      maplibreGL() {
        throw new Error("WebGL disabled");
      },
      theme: "dark",
      maxZoom: 19,
    });

    assert.equal(result.mode, "raster-fallback");
    assert.equal(capturedOpts?.maxZoom, 19);
    assert.equal(capturedOpts?.className, "ec-osm-dark-fallback");
  });

  it("configures same-origin workerUrl via setWorkerUrl before creating maplibreGL layer", () => {
    /** @type {string[]} */
    const callOrder = [];
    /** @type {string | null} */
    let configuredWorkerUrl = null;
    const fakeLayer = {
      addTo() {
        callOrder.push("addTo");
        return this;
      },
    };

    attachBasemapLayer({
      L: {
        tileLayer() {
          return fakeLayer;
        },
      },
      map: { id: "map-worker" },
      maplibreGL() {
        callOrder.push("maplibreGL");
        return fakeLayer;
      },
      setWorkerUrl(url) {
        callOrder.push("setWorkerUrl");
        configuredWorkerUrl = url;
      },
      theme: "light",
    });

    assert.equal(configuredWorkerUrl, "/maplibre-gl-worker.mjs");
    assert.deepEqual(callOrder, ["setWorkerUrl", "maplibreGL", "addTo"]);
  });
});
