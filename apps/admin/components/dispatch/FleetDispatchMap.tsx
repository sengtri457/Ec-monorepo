"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_MAPLIBRE_WORKER_URL,
  OPENFREEMAP_STYLES,
  PHNOM_PENH_CENTER,
  clearRouteLayer,
  createHtmlMarker,
  createMap,
  destroyMap,
  fromLatLng,
  isWebGLSupported,
  resolveStyleUrl,
  syncCourierMarkers,
  upsertRouteLayer,
  validateTelemetryUpdate,
  type ManagedMarkerEntry,
} from "@ec/map-basemap";
import { CourierData } from "./CourierTelemetryDrawer";

interface FleetDispatchMapProps {
  couriers: CourierData[];
  selectedCourierId: string | null;
  onSelectCourier: (courierId: string) => void;
}

const SELECTED_ROUTE_SOURCE_ID = "selected-courier-route";
const SELECTED_ROUTE_LAYER_ID = "selected-courier-route-line";
const emptySubscribe = () => () => {};

function getWebGLClientSnapshot(): boolean {
  return isWebGLSupported();
}

function getWebGLServerSnapshot(): boolean | null {
  return null;
}

function buildHubMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "custom-hub-marker";
  el.setAttribute("aria-label", "Phnom Penh Flagship Hub");
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
      <div style="background:#944434;color:#fff;font-weight:bold;font-size:11px;padding:3px 8px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.2);white-space:nowrap;">
        🏢 Phnom Penh Hub
      </div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #944434;"></div>
    </div>
  `;
  return el;
}

function buildCourierMarkerElement(
  courier: CourierData,
  isSelected: boolean
): HTMLDivElement {
  const el = document.createElement("div");
  el.className = `custom-courier-${courier.courierId}`;
  el.setAttribute("aria-label", `Courier ${courier.courierId}`);
  updateCourierMarkerElement(el, courier, isSelected);
  return el;
}

function updateCourierMarkerElement(
  el: HTMLElement,
  courier: CourierData,
  isSelected: boolean
): void {
  const iconEmoji = courier.vehicleType === "SCOOTER" ? "🛵" : "🚐";
  const dotColor = courier.speedKmh > 0 ? "#10B981" : "#F59E0B";
  const badgeBg = isSelected ? "#944434" : "#18181F";
  const scale = isSelected ? "1.15" : "1";

  el.dataset.selected = String(isSelected);
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;transform:scale(${scale});transition:transform 0.2s;">
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:7px solid ${badgeBg};margin-bottom:-1px;"></div>
      <div style="position:relative;width:38px;height:38px;border-radius:50%;background:${badgeBg};border:2px solid #ffffff;box-shadow:0 4px 14px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;">
        <span>${iconEmoji}</span>
        <span style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;border-radius:50%;background:${dotColor};border:1.5px solid #ffffff;"></span>
      </div>
      <div style="margin-top:2px;padding:1px 5px;border-radius:4px;background:rgba(14,14,18,0.9);color:#fff;font-size:9px;font-family:monospace;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.4);">
        ${Number.isFinite(courier.speedKmh) ? courier.speedKmh : 0} km/h
      </div>
    </div>
  `;
}

export function FleetDispatchMap({
  couriers,
  selectedCourierId,
  onSelectCourier,
}: FleetDispatchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const hubCleanupRef = useRef<(() => void) | null>(null);
  const markersRef = useRef<Map<string, ManagedMarkerEntry>>(new Map());
  const styleLoadedRef = useRef(false);
  const prevSelectedIdRef = useRef<string | null>(null);
  const onSelectCourierRef = useRef(onSelectCourier);

  useEffect(() => {
    onSelectCourierRef.current = onSelectCourier;
  }, [onSelectCourier]);

  const webglAvailable = useSyncExternalStore(
    emptySubscribe,
    getWebGLClientSnapshot,
    getWebGLServerSnapshot
  );
  const [webglInitFailed, setWebglInitFailed] = useState(false);
  const webglSupported = webglInitFailed ? false : webglAvailable;

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  // 1. Initialize pure MapLibre GL JS Map (Dark basemap)
  useEffect(() => {
    if (webglSupported !== true) return;
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;
    const markerRegistry = markersRef.current;
    styleLoadedRef.current = false;

    const styleUrl =
      resolveStyleUrl("dark", process.env.NEXT_PUBLIC_ADMIN_MAP_STYLE_URL) ||
      OPENFREEMAP_STYLES.dark;

    let map: MapLibreMap;
    try {
      map = createMap({
        container: mapContainerRef.current,
        style: styleUrl,
        center: PHNOM_PENH_CENTER,
        zoom: 13,
        minZoom: 4,
        maxZoom: 19,
        workerUrl: DEFAULT_MAPLIBRE_WORKER_URL,
        setWorkerUrl,
        MapConstructor: MapLibreMap,
        onLoad: () => {
          if (!isMounted) return;
          styleLoadedRef.current = true;
          setMapReady(true);
          setMapError(null);
        },
        onError: () => {
          if (!isMounted || styleLoadedRef.current) return;
          setMapError("Dark basemap tiles failed to load.");
        },
      });
    } catch (err) {
      console.error("[FleetDispatchMap] MapLibre initialization failed:", err);
      queueMicrotask(() => {
        if (!isMounted) return;
        setWebglInitFailed(true);
      });
      return;
    }

    map.addControl(new NavigationControl({ showCompass: true }), "top-right");

    const hub = createHtmlMarker({
      map,
      coordinate: PHNOM_PENH_CENTER,
      element: buildHubMarkerElement(),
      anchor: "bottom",
      popupHtml:
        "<b style='color:#0E0E12'>EC Flagship Logistics Hub</b><br>Phnom Penh Operations Center",
      MarkerConstructor: Marker,
      PopupConstructor: Popup,
    });
    hubCleanupRef.current = hub.cleanup;
    mapInstanceRef.current = map;

    return () => {
      isMounted = false;
      setMapReady(false);
      styleLoadedRef.current = false;
      hubCleanupRef.current?.();
      hubCleanupRef.current = null;
      for (const entry of markerRegistry.values()) {
        entry.cleanup();
      }
      markerRegistry.clear();
      destroyMap(map);
      mapInstanceRef.current = null;
    };
  }, [retryTick, webglSupported]);

  // 2. Synchronize Courier Markers (<50 DOM markers; switch to GeoJSON symbols for 50+) and Selected Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapReady || !map) return;

    const validCouriers = couriers.filter((courier) => {
      const check = validateTelemetryUpdate({
        id: courier.courierId,
        longitude: courier.longitude,
        latitude: courier.latitude,
        heading: courier.bearing,
        speed: courier.speedKmh,
      });
      return check.valid;
    });

    syncCourierMarkers({
      map,
      registry: markersRef.current,
      couriers: validCouriers,
      selectedCourierId,
      createMarkerElement: buildCourierMarkerElement,
      updateMarkerElement: updateCourierMarkerElement,
      onSelect: (courierId) => onSelectCourierRef.current(courierId),
      MarkerConstructor: Marker,
    });

    const active = selectedCourierId
      ? validCouriers.find((c) => c.courierId === selectedCourierId)
      : undefined;

    if (active) {
      upsertRouteLayer(map, {
        sourceId: SELECTED_ROUTE_SOURCE_ID,
        layerId: SELECTED_ROUTE_LAYER_ID,
        coordinates: [
          PHNOM_PENH_CENTER,
          fromLatLng(active.latitude, active.longitude),
        ],
        paint: {
          "line-color": "#944434",
          "line-width": 3,
          "line-opacity": 0.85,
          "line-dasharray": [2, 2],
        },
      });

      if (
        prevSelectedIdRef.current !== selectedCourierId &&
        typeof map.easeTo === "function"
      ) {
        map.easeTo({
          center: fromLatLng(active.latitude, active.longitude),
          duration: 500,
        });
      }
    } else {
      clearRouteLayer(map, SELECTED_ROUTE_SOURCE_ID);
    }

    prevSelectedIdRef.current = selectedCourierId;
  }, [couriers, selectedCourierId, mapReady]);

  const handleResetView = useCallback(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({
      center: [PHNOM_PENH_CENTER[0], PHNOM_PENH_CENTER[1]],
      zoom: 13,
      duration: 600,
    });
  }, []);

  if (webglSupported === false) {
    return (
      <div className="relative z-0 w-full min-h-[520px] rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-950 p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              WebGL Fleet Map Unavailable
            </span>
            <h2 className="mt-1 text-lg font-bold">
              Active Fleet Coordinates ({couriers.length} Couriers)
            </h2>
            <p className="text-xs text-neutral-400">
              Select any courier below to inspect live telemetry and dispatch orders.
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            TELEMETRY ACTIVE
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {couriers.map((courier) => {
            const isSelected = courier.courierId === selectedCourierId;
            return (
              <button
                key={courier.courierId}
                type="button"
                onClick={() => onSelectCourier(courier.courierId)}
                className={`rounded-xl border p-4 text-left transition cursor-pointer ${
                  isSelected
                    ? "border-[#944434] bg-[#944434]/20"
                    : "border-neutral-800 bg-neutral-900/70 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-white">
                    {courier.courierId}
                  </span>
                  <span className="text-xs font-mono text-emerald-400">
                    {courier.speedKmh} km/h
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-300">{courier.name}</p>
                <p className="mt-1 font-mono text-[11px] text-neutral-400">
                  {courier.latitude.toFixed(5)}, {courier.longitude.toFixed(5)}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-0 w-full h-[calc(100vh-14rem)] min-h-[520px] rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-950">
      {/* Pure MapLibre Container (isolated stacking context beneath HUD/drawers) */}
      <div ref={mapContainerRef} className="relative z-0 w-full h-full" />

      {/* Initial Style Loading Indicator */}
      {!mapReady && !mapError && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-neutral-950/60">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/90 px-3.5 py-2 text-xs text-neutral-300 shadow-lg">
            Loading fleet vector map...
          </div>
        </div>
      )}

      {/* Style Error Banner */}
      {mapError && (
        <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between gap-3 rounded-xl border border-amber-700/60 bg-neutral-900/95 px-4 py-2.5 text-xs text-amber-200 shadow-xl">
          <span>{mapError}</span>
          <button
            type="button"
            onClick={() => {
              setMapReady(false);
              setMapError(null);
              setRetryTick((prev) => prev + 1);
            }}
            className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/20 cursor-pointer"
          >
            Retry Map
          </button>
        </div>
      )}

      {/* Floating Telemetry HUD Card */}
      <div className="absolute top-4 left-4 z-20 bg-neutral-900/90 backdrop-blur-md p-4 rounded-xl border border-neutral-700 shadow-2xl text-white min-w-52">
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Dispatch Fleet
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="text-2xl font-bold font-mono tracking-tight">
          {couriers.length}{" "}
          <span className="text-xs font-normal text-neutral-400">
            Couriers Active
          </span>
        </div>
        <div className="text-xs text-neutral-400 mt-2 flex items-center justify-between border-t border-neutral-800 pt-2">
          <span>Phnom Penh Hub</span>
          <button
            type="button"
            onClick={handleResetView}
            className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer underline text-[11px]"
          >
            Reset View
          </button>
        </div>
      </div>
    </div>
  );
}
