import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OPENFREEMAP_STYLES,
  DEFAULT_MAPLIBRE_WORKER_URL,
  PHNOM_PENH_CENTER,
  TOUL_KORK_HUB_COORDINATE,
  CAMBODIA_BOUNDS,
  CAMBODIA_TEST_LOCATIONS,
  resolveStyleUrl,
  createDefaultMapConfig,
  toMapCoordinate,
  fromLatLng,
  isValidCoordinate,
  isValidLatLng,
  isWithinCambodiaBounds,
  validateTelemetryUpdate,
  isLocationStale,
  haversineKm,
  calculateRouteDistanceKm,
  estimateDrivingMinutes,
  formatDistance,
  MapInitializationError,
  isWebGLSupported,
  createMap,
  destroyMap,
  fitMapToCoordinates,
  createHtmlMarker,
  syncCourierMarkers,
  buildRouteFeature,
  upsertRouteLayer,
  clearRouteLayer,
} from "./index.mjs";

describe("map styles & configuration", () => {
  it("returns OpenFreeMap positron for light theme and dark for dark theme", () => {
    assert.equal(
      resolveStyleUrl("light"),
      "https://tiles.openfreemap.org/styles/positron"
    );
    assert.equal(
      resolveStyleUrl("dark"),
      "https://tiles.openfreemap.org/styles/dark"
    );
    assert.equal(DEFAULT_MAPLIBRE_WORKER_URL, "/maplibre-gl-worker.mjs");
  });

  it("prefers trimmed customStyleUrl and falls back when blank", () => {
    assert.equal(
      resolveStyleUrl("light", "  https://example.com/custom-style.json  "),
      "https://example.com/custom-style.json"
    );
    assert.equal(resolveStyleUrl("dark", "   "), OPENFREEMAP_STYLES.dark);
  });

  it("exposes Cambodia coordinate constants in [longitude, latitude] order", () => {
    assert.deepEqual(PHNOM_PENH_CENTER, [104.9282, 11.5564]);
    assert.deepEqual(TOUL_KORK_HUB_COORDINATE, [104.8988, 11.5761]);
    assert.ok(CAMBODIA_BOUNDS.minLng < CAMBODIA_BOUNDS.maxLng);
    assert.ok(CAMBODIA_BOUNDS.minLat < CAMBODIA_BOUNDS.maxLat);
    assert.ok(CAMBODIA_TEST_LOCATIONS.length >= 8);
    for (const loc of CAMBODIA_TEST_LOCATIONS) {
      assert.equal(isValidCoordinate(loc.coordinate), true, loc.name);
      assert.equal(isWithinCambodiaBounds(loc.coordinate), true, loc.name);
    }
  });

  it("creates default map config for light and dark themes", () => {
    const cfg = createDefaultMapConfig({ theme: "dark", zoom: 14 });
    assert.equal(cfg.style, OPENFREEMAP_STYLES.dark);
    assert.deepEqual(cfg.center, PHNOM_PENH_CENTER);
    assert.equal(cfg.zoom, 14);
  });
});

describe("coordinate conversion, validation & telemetry guards", () => {
  it("converts GeoLocation and lat/lng explicitly to [lng, lat]", () => {
    assert.deepEqual(
      toMapCoordinate({ longitude: 104.9282, latitude: 11.5564 }),
      [104.9282, 11.5564]
    );
    assert.deepEqual(fromLatLng(11.5564, 104.9282), [104.9282, 11.5564]);
  });

  it("validates global WGS84 coordinates and rejects malformed inputs", () => {
    assert.equal(isValidCoordinate([104.9282, 11.5564]), true);
    assert.equal(isValidCoordinate([-180, -90]), true);
    assert.equal(isValidCoordinate([180, 90]), true);
    assert.equal(isValidCoordinate([180.1, 11.5]), false);
    assert.equal(isValidCoordinate([104.9, -90.1]), false);
    assert.equal(isValidCoordinate([Number.NaN, 11.5]), false);
    assert.equal(isValidCoordinate([104.9, Number.POSITIVE_INFINITY]), false);
    assert.equal(isValidLatLng(11.5564, 104.9282), true);
    assert.equal(isValidLatLng(91, 104.9282), false);
  });

  it("detects swapped Cambodia [lat, lng] coordinates via Cambodia bounds check", () => {
    assert.equal(isWithinCambodiaBounds([104.9282, 11.5564]), true);
    assert.equal(isWithinCambodiaBounds([11.5564, 104.9282]), false);
  });

  it("validates courier telemetry updates and rejects stale timestamps", () => {
    const accepted = validateTelemetryUpdate(
      {
        id: "CR-082",
        longitude: 104.9255,
        latitude: 11.5585,
        heading: 45,
        speed: 34,
        updatedAt: "2026-11-26T15:00:10Z",
      },
      Date.parse("2026-11-26T15:00:05Z")
    );
    assert.equal(accepted.valid, true);
    assert.deepEqual(accepted.coordinate, [104.9255, 11.5585]);

    const stale = validateTelemetryUpdate(
      {
        id: "CR-082",
        longitude: 104.9255,
        latitude: 11.5585,
        updatedAt: "2026-11-26T15:00:01Z",
      },
      Date.parse("2026-11-26T15:00:05Z")
    );
    assert.equal(stale.valid, false);
    assert.equal(stale.reason, "stale");

    const invalid = validateTelemetryUpdate({
      id: "CR-082",
      longitude: 999,
      latitude: 11.5585,
    });
    assert.equal(invalid.valid, false);
    assert.equal(invalid.reason, "invalid-coordinate");
  });

  it("identifies stale GPS timestamps", () => {
    const now = Date.parse("2026-11-26T15:05:00Z");
    assert.equal(isLocationStale("2026-11-26T15:04:30Z", now, 120_000), false);
    assert.equal(isLocationStale("2026-11-26T15:00:00Z", now, 120_000), true);
    assert.equal(isLocationStale(undefined, now, 120_000), true);
  });
});

describe("distance and ETA calculations", () => {
  it("computes haversine distance, polyline distance, ETA, and formatted text", () => {
    const directKm = haversineKm(TOUL_KORK_HUB_COORDINATE, PHNOM_PENH_CENTER);
    assert.ok(directKm > 3.5 && directKm < 4.5, `unexpected km: ${directKm}`);

    const routeKm = calculateRouteDistanceKm([
      TOUL_KORK_HUB_COORDINATE,
      [104.91, 11.565],
      PHNOM_PENH_CENTER,
    ]);
    assert.ok(routeKm >= directKm);

    assert.equal(estimateDrivingMinutes(0.5, 25, 5), 5);
    assert.equal(estimateDrivingMinutes(12.5, 25, 5), 30);
    assert.equal(formatDistance(0.456), "456 m");
    assert.equal(formatDistance(3.84), "3.8 km");
  });
});

describe("WebGL detection and MapLibre lifecycle", () => {
  it("detects WebGL availability safely without throwing", () => {
    assert.equal(isWebGLSupported(undefined), false);

    const fakeDocWithWebGL = {
      createElement() {
        return {
          /** @param {string} kind */
          getContext(kind) {
            return kind === "webgl2" ? {} : null;
          },
        };
      },
    };
    assert.equal(isWebGLSupported(fakeDocWithWebGL), true);

    const fakeDocWithoutWebGL = {
      createElement() {
        return {
          getContext() {
            return null;
          },
        };
      },
    };
    assert.equal(isWebGLSupported(fakeDocWithoutWebGL), false);
  });

  it("guards SSR, missing container, invalid coordinates, and WebGL failure in createMap", () => {
    assert.throws(
      () =>
        createMap({
          container: /** @type {any} */ ({}),
          style: OPENFREEMAP_STYLES.light,
          center: PHNOM_PENH_CENTER,
          zoom: 13,
          isBrowserEnvironment: () => false,
        }),
      (err) => err instanceof MapInitializationError && err.code === "SSR_ENVIRONMENT"
    );

    assert.throws(
      () =>
        createMap({
          container: /** @type {any} */ (null),
          style: OPENFREEMAP_STYLES.light,
          center: PHNOM_PENH_CENTER,
          zoom: 13,
          isBrowserEnvironment: () => true,
          checkWebGL: () => true,
        }),
      (err) => err instanceof MapInitializationError && err.code === "MISSING_CONTAINER"
    );

    assert.throws(
      () =>
        createMap({
          container: /** @type {any} */ ({}),
          style: OPENFREEMAP_STYLES.light,
          center: [999, 11],
          zoom: 13,
          isBrowserEnvironment: () => true,
          checkWebGL: () => true,
        }),
      (err) => err instanceof MapInitializationError && err.code === "INVALID_COORDINATE"
    );

    assert.throws(
      () =>
        createMap({
          container: /** @type {any} */ ({}),
          style: OPENFREEMAP_STYLES.light,
          center: PHNOM_PENH_CENTER,
          zoom: 13,
          isBrowserEnvironment: () => true,
          checkWebGL: () => false,
        }),
      (err) => err instanceof MapInitializationError && err.code === "WEBGL_UNAVAILABLE"
    );
  });

  it("calls setWorkerUrl before instantiating MapLibre Map and destroys cleanly", () => {
    /** @type {string[]} */
    const callOrder = [];
    /** @type {Record<string, any> | null} */
    let capturedOptions = null;
    let removed = false;

    class FakeMap {
      /** @param {Record<string, any>} opts */
      constructor(opts) {
        callOrder.push("Map");
        capturedOptions = opts;
      }
      on() {
        return this;
      }
      remove() {
        removed = true;
      }
    }

    const map = createMap({
      container: /** @type {any} */ ({ id: "map-el" }),
      style: OPENFREEMAP_STYLES.light,
      center: PHNOM_PENH_CENTER,
      zoom: 13,
      isBrowserEnvironment: () => true,
      checkWebGL: () => true,
      setWorkerUrl(url) {
        callOrder.push(`setWorkerUrl:${url}`);
      },
      MapConstructor: /** @type {any} */ (FakeMap),
    });

    assert.deepEqual(callOrder, ["setWorkerUrl:/maplibre-gl-worker.mjs", "Map"]);
    assert.deepEqual(/** @type {any} */ (capturedOptions)?.attributionControl, {
      compact: true,
    });
    assert.deepEqual(
      /** @type {any} */ (capturedOptions)?.center,
      PHNOM_PENH_CENTER
    );

    destroyMap(map);
    assert.equal(removed, true);
  });

  it("fits bounds over valid [lng, lat] coordinates", () => {
    /** @type {any[]} */
    const extended = [];
    /** @type {{ bounds: any; options: any } | null} */
    let fitCall = null;

    class FakeBounds {
      /** @param {[number, number]} coord */
      extend(coord) {
        extended.push(coord);
        return this;
      }
    }

    const fakeMap = {
      /** @param {any} bounds @param {any} options */
      fitBounds(bounds, options) {
        fitCall = { bounds, options };
      },
    };

    const didFit = fitMapToCoordinates(
      /** @type {any} */ (fakeMap),
      [TOUL_KORK_HUB_COORDINATE, [Number.NaN, 11], PHNOM_PENH_CENTER],
      { BoundsConstructor: /** @type {any} */ (FakeBounds), padding: 48, maxZoom: 15 }
    );

    assert.equal(didFit, true);
    assert.deepEqual(extended, [TOUL_KORK_HUB_COORDINATE, PHNOM_PENH_CENTER]);
    assert.deepEqual(/** @type {any} */ (fitCall)?.options, {
      padding: 48,
      maxZoom: 15,
      duration: 600,
    });
  });
});

describe("marker management and GeoJSON route layers", () => {
  it("syncs courier markers by ID without creating duplicates", () => {
    let createdCount = 0;
    /** @type {string[]} */
    const removedIds = [];

    class FakeMarker {
      /** @param {{ element?: any }} opts */
      constructor(opts) {
        createdCount += 1;
        this.element = opts.element;
        this.lngLat = null;
        this.handlers = new Map();
      }
      /** @param {[number, number]} lngLat */
      setLngLat(lngLat) {
        this.lngLat = lngLat;
        return this;
      }
      addTo() {
        return this;
      }
      /** @param {string} evt @param {Function} fn */
      on(evt, fn) {
        this.handlers.set(evt, fn);
        return this;
      }
      remove() {
        removedIds.push(this.element?.id || "unknown");
      }
    }

    const registry = new Map();
    const fakeMap = {};

    // First sync: add 2 couriers
    syncCourierMarkers({
      map: /** @type {any} */ (fakeMap),
      registry,
      couriers: [
        { courierId: "CR-1", longitude: 104.92, latitude: 11.55, speedKmh: 20 },
        { courierId: "CR-2", longitude: 104.93, latitude: 11.56, speedKmh: 30 },
      ],
      selectedCourierId: "CR-1",
      MarkerConstructor: /** @type {any} */ (FakeMarker),
      createMarkerElement: (c) => /** @type {any} */ ({ id: c.courierId }),
      updateMarkerElement: (el, c, isSelected) => {
        /** @type {any} */ (el).selected = isSelected;
        /** @type {any} */ (el).speed = c.speedKmh;
      },
    });
    assert.equal(createdCount, 2);
    assert.equal(registry.size, 2);

    // Second sync: CR-1 moves, CR-2 removed, CR-3 added -> should only construct 1 new marker
    syncCourierMarkers({
      map: /** @type {any} */ (fakeMap),
      registry,
      couriers: [
        { courierId: "CR-1", longitude: 104.921, latitude: 11.552, speedKmh: 25 },
        { courierId: "CR-3", longitude: 104.94, latitude: 11.57, speedKmh: 15 },
      ],
      selectedCourierId: "CR-3",
      MarkerConstructor: /** @type {any} */ (FakeMarker),
      createMarkerElement: (c) => /** @type {any} */ ({ id: c.courierId }),
      updateMarkerElement: (el, c, isSelected) => {
        /** @type {any} */ (el).selected = isSelected;
        /** @type {any} */ (el).speed = c.speedKmh;
      },
    });

    assert.equal(createdCount, 3);
    assert.equal(registry.size, 2);
    assert.deepEqual(removedIds, ["CR-2"]);
    assert.deepEqual(registry.get("CR-1")?.marker.lngLat, [104.921, 11.552]);
    assert.equal(/** @type {any} */ (registry.get("CR-1")?.element).selected, false);
    assert.equal(/** @type {any} */ (registry.get("CR-3")?.element).selected, true);
  });

  it("creates single GeoJSON route source/layer and updates via setData", () => {
    const sources = new Map();
    const layers = new Map();
    let addSourceCalls = 0;
    let addLayerCalls = 0;
    let setDataCalls = 0;

    const fakeMap = {
      isStyleLoaded: () => true,
      /** @param {string} id */
      getSource: (id) => sources.get(id),
      /** @param {string} id */
      getLayer: (id) => layers.get(id),
      /** @param {string} id @param {any} spec */
      addSource(id, spec) {
        addSourceCalls += 1;
        sources.set(id, {
          data: spec.data,
          /** @param {any} next */
          setData(next) {
            setDataCalls += 1;
            this.data = next;
          },
        });
      },
      /** @param {any} spec */
      addLayer(spec) {
        addLayerCalls += 1;
        layers.set(spec.id, spec);
      },
    };

    const route1 = [TOUL_KORK_HUB_COORDINATE, PHNOM_PENH_CENTER];
    const route2 = [
      TOUL_KORK_HUB_COORDINATE,
      /** @type {const} */ ([104.915, 11.562]),
      PHNOM_PENH_CENTER,
    ];

    upsertRouteLayer(/** @type {any} */ (fakeMap), {
      sourceId: "delivery-route",
      layerId: "delivery-route-line",
      coordinates: route1,
    });
    assert.equal(addSourceCalls, 1);
    assert.equal(addLayerCalls, 1);
    assert.equal(setDataCalls, 0);

    upsertRouteLayer(/** @type {any} */ (fakeMap), {
      sourceId: "delivery-route",
      layerId: "delivery-route-line",
      coordinates: route2,
    });
    assert.equal(addSourceCalls, 1);
    assert.equal(addLayerCalls, 1);
    assert.equal(setDataCalls, 1);
    assert.deepEqual(sources.get("delivery-route").data.geometry.coordinates, route2);

    clearRouteLayer(/** @type {any} */ (fakeMap), "delivery-route");
    assert.equal(setDataCalls, 2);
    assert.equal(sources.get("delivery-route").data.type, "FeatureCollection");
  });

  it("builds valid GeoJSON LineString feature filtering invalid points", () => {
    const feature = buildRouteFeature([
      TOUL_KORK_HUB_COORDINATE,
      /** @type {[number, number]} */ ([Number.NaN, 11]),
      PHNOM_PENH_CENTER,
    ]);
    assert.equal(feature.type, "Feature");
    assert.equal(feature.geometry.type, "LineString");
    assert.deepEqual(feature.geometry.coordinates, [
      TOUL_KORK_HUB_COORDINATE,
      PHNOM_PENH_CENTER,
    ]);
  });

  it("creates HTML marker with popup and click handler", () => {
    let clicked = false;
    let boundPopup = false;

    class FakePopup {
      /** @param {string} html */
      setHTML(html) {
        this.html = html;
        return this;
      }
    }

    class FakeMarker {
      addTo() {
        return this;
      }
      setLngLat() {
        return this;
      }
      setPopup() {
        boundPopup = true;
        return this;
      }
      /** @param {string} evt @param {Function} fn */
      on(evt, fn) {
        if (evt === "click") this.onClick = fn;
        return this;
      }
      remove() {}
    }

    const created = createHtmlMarker({
      map: /** @type {any} */ ({}),
      coordinate: PHNOM_PENH_CENTER,
      element: /** @type {any} */ ({}),
      popupHtml: "<b>Hub</b>",
      onClick: () => {
        clicked = true;
      },
      MarkerConstructor: /** @type {any} */ (FakeMarker),
      PopupConstructor: /** @type {any} */ (FakePopup),
    });

    assert.equal(boundPopup, true);
    /** @type {any} */ (created.marker).onClick();
    assert.equal(clicked, true);
  });
});
