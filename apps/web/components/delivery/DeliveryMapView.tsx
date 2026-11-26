"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_MAPLIBRE_WORKER_URL,
  OPENFREEMAP_STYLES,
  PHNOM_PENH_CENTER,
  TOUL_KORK_HUB_COORDINATE,
  calculateRouteDistanceKm,
  createHtmlMarker,
  createMap,
  destroyMap,
  estimateDrivingMinutes,
  fitMapToCoordinates,
  formatDistance,
  fromLatLng,
  haversineKm,
  isLocationStale,
  isValidLatLng,
  isWebGLSupported,
  resolveStyleUrl,
  upsertRouteLayer,
  validateTelemetryUpdate,
  type MapCoordinate,
} from "@ec/map-basemap";
import { fetchRoadRouteMetrics } from "@/app/actions/fetch-road-route";
import { DeliveryShipment } from "@/types";

interface Props {
  shipment: DeliveryShipment;
  height?: string;
  className?: string;
}

const ROUTE_SOURCE_ID = "delivery-route";
const ROUTE_LINE_LAYER_ID = "delivery-route-line";
const ROUTE_ARROW_LAYER_ID = "delivery-route-arrows";
const REROUTE_DISTANCE_THRESHOLD_KM = 0.15;
const REROUTE_COOLDOWN_MS = 15_000;

const emptySubscribe = () => () => {};

function getWebGLClientSnapshot(): boolean {
  return isWebGLSupported();
}

function getWebGLServerSnapshot(): boolean | null {
  return null;
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildHubMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-label", "Fulfillment Hub");
  el.style.cssText =
    "width:28px;height:28px;border-radius:50%;background:#059669;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(5,150,105,0.55);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:12px;font-weight:bold;cursor:pointer;";
  el.textContent = "🏢";
  return el;
}

function buildDestinationMarkerElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-label", "Delivery Destination");
  el.style.cssText = "width:28px;height:38px;position:relative;cursor:pointer;";
  el.innerHTML = `<svg width="28" height="38" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.3));">
    <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 38 14 38C14 38 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#DC2626"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
    <circle cx="14" cy="14" r="3" fill="#DC2626"/>
  </svg>`;
  return el;
}

function applyRiderMarkerMarkup(
  el: HTMLDivElement,
  isOutForDelivery: boolean
): void {
  const bg = isOutForDelivery ? "#0284c7" : "#0f766e";
  const pinW = 44;
  const pinH = 52;
  const pulse = isOutForDelivery
    ? `<circle cx="${pinW / 2}" cy="${pinW / 2}" r="${pinW / 2 - 2}" fill="none" stroke="${bg}" stroke-width="2" opacity="0.4">
        <animate attributeName="r" values="${pinW / 4};${pinW / 2 - 1}" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite"/>
       </circle>`
    : "";

  el.dataset.active = String(isOutForDelivery);
  el.style.cssText = `width:${pinW}px;height:${pinH}px;position:relative;cursor:pointer;`;
  el.innerHTML = `<svg width="${pinW}" height="${pinH}" viewBox="0 0 ${pinW} ${pinH}" xmlns="http://www.w3.org/2000/svg"
         style="filter:drop-shadow(0 3px 8px rgba(0,0,0,0.35));">
      ${pulse}
      <path d="M${pinW / 2} ${pinH - 2}
               C${pinW / 2} ${pinH - 2} 2 ${pinW * 0.72}
               2 ${pinW / 2}
               A${pinW / 2 - 2} ${pinW / 2 - 2} 0 1 1 ${pinW - 2} ${pinW / 2}
               C${pinW - 2} ${pinW * 0.72} ${pinW / 2} ${pinH - 2} ${pinW / 2} ${pinH - 2}Z"
            fill="${bg}" stroke="white" stroke-width="2"/>
      <circle cx="${pinW / 2 - 6}" cy="${pinW / 2 + 1}" r="3.5" fill="none" stroke="white" stroke-width="1.5"/>
      <circle cx="${pinW / 2 + 6}" cy="${pinW / 2 + 1}" r="3.5" fill="none" stroke="white" stroke-width="1.5"/>
      <path d="M${pinW / 2 - 6} ${pinW / 2 + 1} L${pinW / 2} ${pinW / 2 - 4} L${pinW / 2 + 6} ${pinW / 2 + 1}" fill="none" stroke="white" stroke-width="1.5"/>
      <path d="M${pinW / 2 - 1} ${pinW / 2 - 4} L${pinW / 2 - 4} ${pinW / 2 - 8} L${pinW / 2 + 2} ${pinW / 2 - 8}" fill="none" stroke="white" stroke-width="1.5"/>
    </svg>`;
}

export default function DeliveryMapView({
  shipment,
  height = "380px",
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const hubCleanupRef = useRef<(() => void) | null>(null);
  const destCleanupRef = useRef<(() => void) | null>(null);
  const riderMarkerRef = useRef<Marker | null>(null);
  const riderCleanupRef = useRef<(() => void) | null>(null);
  const riderElementRef = useRef<HTMLDivElement | null>(null);

  const styleLoadedRef = useRef(false);
  const hasFittedInitialBoundsRef = useRef(false);
  const latestRouteRef = useRef<MapCoordinate[]>([]);
  const lastAcceptedTimestampRef = useRef<number | null>(null);
  const lastRoutedOriginRef = useRef<MapCoordinate | null>(null);
  const lastRoutedDestKeyRef = useRef<string>("");
  const lastRouteFetchedAtRef = useRef<number>(0);
  const routeSeqRef = useRef(0);

  const webglAvailable = useSyncExternalStore(
    emptySubscribe,
    getWebGLClientSnapshot,
    getWebGLServerSnapshot
  );
  const [webglInitFailed, setWebglInitFailed] = useState(false);
  const webglSupported = webglInitFailed ? false : webglAvailable;
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [estimatedMins, setEstimatedMins] = useState<number | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  const originCoord = useMemo<MapCoordinate>(
    () =>
      isValidLatLng(shipment.originLat, shipment.originLng)
        ? fromLatLng(shipment.originLat, shipment.originLng)
        : [TOUL_KORK_HUB_COORDINATE[0], TOUL_KORK_HUB_COORDINATE[1]],
    [shipment.originLat, shipment.originLng]
  );

  const destCoord = useMemo<MapCoordinate>(
    () =>
      isValidLatLng(shipment.destLat, shipment.destLng)
        ? fromLatLng(shipment.destLat, shipment.destLng)
        : [PHNOM_PENH_CENTER[0], PHNOM_PENH_CENTER[1]],
    [shipment.destLat, shipment.destLng]
  );

  const hasLiveGps = isValidLatLng(shipment.currentLat, shipment.currentLng);
  const activeRiderCoord = useMemo<MapCoordinate>(
    () =>
      hasLiveGps
        ? fromLatLng(shipment.currentLat!, shipment.currentLng!)
        : originCoord,
    [hasLiveGps, shipment.currentLat, shipment.currentLng, originCoord]
  );

  const gpsSignalStale =
    shipment.status === "OUT_FOR_DELIVERY" &&
    (!hasLiveGps || isLocationStale(shipment.updatedAt));

  const renderRouteOnMap = useCallback((coords: MapCoordinate[]) => {
    const map = mapRef.current;
    if (!map || !styleLoadedRef.current) return;
    upsertRouteLayer(map, {
      sourceId: ROUTE_SOURCE_ID,
      layerId: ROUTE_LINE_LAYER_ID,
      arrowLayerId: ROUTE_ARROW_LAYER_ID,
      coordinates: coords,
      paint: {
        "line-color": "#2563EB",
        "line-width": 5,
        "line-opacity": 0.85,
      },
      arrowColor: "#1D4ED8",
    });
  }, []);

  // 1. Initialize pure MapLibre GL JS Map (single init per mount/retry)
  useEffect(() => {
    if (webglSupported !== true) return;
    if (!containerRef.current || mapRef.current) return;

    let isMounted = true;
    styleLoadedRef.current = false;
    hasFittedInitialBoundsRef.current = false;
    lastRoutedOriginRef.current = null;
    lastRoutedDestKeyRef.current = "";

    const styleUrl =
      resolveStyleUrl("light", process.env.NEXT_PUBLIC_MAP_STYLE_URL) ||
      OPENFREEMAP_STYLES.light;

    let map: MapLibreMap;
    try {
      map = createMap({
        container: containerRef.current,
        style: styleUrl,
        center: activeRiderCoord,
        zoom: 13,
        minZoom: 4,
        maxZoom: 20,
        workerUrl: DEFAULT_MAPLIBRE_WORKER_URL,
        setWorkerUrl,
        MapConstructor: MapLibreMap,
        onLoad: () => {
          if (!isMounted) return;
          styleLoadedRef.current = true;
          setIsMapLoading(false);
          setMapError(null);
          if (latestRouteRef.current.length >= 2) {
            renderRouteOnMap(latestRouteRef.current);
          }
        },
        onError: () => {
          if (!isMounted || styleLoadedRef.current) return;
          setIsMapLoading(false);
          setMapError(
            "Map basemap tiles could not load. Live delivery details remain active."
          );
        },
      });
    } catch (err) {
      console.error("[DeliveryMapView] Failed to initialize MapLibre:", err);
      queueMicrotask(() => {
        if (!isMounted) return;
        setWebglInitFailed(true);
        setIsMapLoading(false);
      });
      return;
    }

    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new ScaleControl({ unit: "metric" }), "bottom-left");

    const hub = createHtmlMarker({
      map,
      coordinate: originCoord,
      element: buildHubMarkerElement(),
      anchor: "center",
      popupHtml: "<b>Clothes Central Hub</b><br>Toul Kork, Phnom Penh",
      MarkerConstructor: Marker,
      PopupConstructor: Popup,
    });
    hubCleanupRef.current = hub.cleanup;

    const destLabel = escapeHtml(
      shipment.destinationAddress || shipment.destinationCity
    );
    const dest = createHtmlMarker({
      map,
      coordinate: destCoord,
      element: buildDestinationMarkerElement(),
      anchor: "bottom",
      popupHtml: `<b>Delivery Destination</b><br>${destLabel}`,
      MarkerConstructor: Marker,
      PopupConstructor: Popup,
    });
    destCleanupRef.current = dest.cleanup;

    const riderEl = document.createElement("div");
    applyRiderMarkerMarkup(riderEl, shipment.status === "OUT_FOR_DELIVERY");
    riderElementRef.current = riderEl;

    const riderPopupHtml = `<b>${escapeHtml(shipment.courierName)}</b><br>Driver: ${escapeHtml(
      shipment.driverName || "Courier Rider"
    )}<br>Vehicle: ${escapeHtml(shipment.vehicleInfo || "Motorbike")}`;

    const rider = createHtmlMarker({
      map,
      coordinate: activeRiderCoord,
      element: riderEl,
      anchor: "bottom",
      popupHtml: riderPopupHtml,
      MarkerConstructor: Marker,
      PopupConstructor: Popup,
    });
    riderMarkerRef.current = rider.marker;
    riderCleanupRef.current = rider.cleanup;
    mapRef.current = map;

    return () => {
      isMounted = false;
      hubCleanupRef.current?.();
      hubCleanupRef.current = null;
      destCleanupRef.current?.();
      destCleanupRef.current = null;
      riderCleanupRef.current?.();
      riderCleanupRef.current = null;
      riderMarkerRef.current = null;
      riderElementRef.current = null;
      styleLoadedRef.current = false;
      destroyMap(map);
      mapRef.current = null;
    };
  }, [retryTick, webglSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Validate Live Rider Coordinates, Move Marker Without Recreating & Throttle OSRM
  useEffect(() => {
    if (webglSupported !== true || !mapRef.current) {
      return;
    }

    let nextCoord: MapCoordinate = activeRiderCoord;

    if (hasLiveGps) {
      const check = validateTelemetryUpdate(
        {
          id: shipment.trackingNumber,
          longitude: shipment.currentLng!,
          latitude: shipment.currentLat!,
          heading: shipment.heading,
          speed: shipment.speed,
          updatedAt: shipment.updatedAt,
        },
        lastAcceptedTimestampRef.current
      );

      if (!check.valid) {
        return;
      }

      if (check.timestampMs !== null) {
        lastAcceptedTimestampRef.current = check.timestampMs;
      }
      nextCoord = check.coordinate;
    }

    if (riderMarkerRef.current) {
      riderMarkerRef.current.setLngLat(nextCoord);
    }

    if (riderElementRef.current) {
      const nextActive = shipment.status === "OUT_FOR_DELIVERY";
      if (riderElementRef.current.dataset.active !== String(nextActive)) {
        applyRiderMarkerMarkup(riderElementRef.current, nextActive);
      }
    }

    const destKey = `${destCoord[0].toFixed(5)},${destCoord[1].toFixed(5)}`;
    const destChanged = lastRoutedDestKeyRef.current !== destKey;
    const distFromLastRouteKm = lastRoutedOriginRef.current
      ? haversineKm(lastRoutedOriginRef.current, nextCoord)
      : Number.POSITIVE_INFINITY;
    const cooldownElapsed =
      Date.now() - lastRouteFetchedAtRef.current >= REROUTE_COOLDOWN_MS;

    const shouldFetchRoute =
      destChanged ||
      !lastRoutedOriginRef.current ||
      (distFromLastRouteKm >= REROUTE_DISTANCE_THRESHOLD_KM && cooldownElapsed);

    if (!shouldFetchRoute) {
      return;
    }

    const seq = ++routeSeqRef.current;
    let isMounted = true;
    setIsRouting(true);

    async function loadRoute() {
      const result = await fetchRoadRouteMetrics(
        nextCoord[1],
        nextCoord[0],
        destCoord[1],
        destCoord[0]
      );

      if (!isMounted || seq !== routeSeqRef.current) return;
      lastRoutedDestKeyRef.current = destKey;
      lastRoutedOriginRef.current = nextCoord;
      lastRouteFetchedAtRef.current = Date.now();
      setIsRouting(false);

      const pointsToRender: MapCoordinate[] =
        result.coordinates.length >= 2
          ? result.coordinates
          : [nextCoord, destCoord];

      latestRouteRef.current = pointsToRender;
      renderRouteOnMap(pointsToRender);

      const totalDistKm =
        result.distanceMeters !== null
          ? result.distanceMeters / 1000
          : calculateRouteDistanceKm(pointsToRender);
      setRouteDistanceKm(totalDistKm);

      const mins =
        result.durationSeconds !== null
          ? Math.max(5, Math.round(result.durationSeconds / 60))
          : estimateDrivingMinutes(totalDistKm);
      setEstimatedMins(mins);

      if (mapRef.current && (!hasFittedInitialBoundsRef.current || destChanged)) {
        hasFittedInitialBoundsRef.current = true;
        fitMapToCoordinates(
          mapRef.current,
          [originCoord, ...pointsToRender, destCoord],
          { BoundsConstructor: LngLatBounds, padding: 48, maxZoom: 15 }
        );
      }
    }

    loadRoute();

    return () => {
      isMounted = false;
    };
  }, [
    webglSupported,
    hasLiveGps,
    activeRiderCoord,
    originCoord,
    destCoord,
    shipment.trackingNumber,
    shipment.currentLat,
    shipment.currentLng,
    shipment.heading,
    shipment.speed,
    shipment.updatedAt,
    shipment.status,
    renderRouteOnMap,
  ]);

  const handleRecenter = useCallback(() => {
    if (!mapRef.current) return;
    const pts =
      latestRouteRef.current.length >= 2
        ? latestRouteRef.current
        : [originCoord, activeRiderCoord, destCoord];
    fitMapToCoordinates(mapRef.current, [originCoord, ...pts, destCoord], {
      BoundsConstructor: LngLatBounds,
      padding: 48,
      maxZoom: 15,
    });
  }, [originCoord, activeRiderCoord, destCoord]);

  if (webglSupported === false) {
    return (
      <div
        className={`rounded-md border border-border bg-canvas p-5 text-xs text-ink ${className}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <span className="type-label text-[10px] uppercase tracking-wider text-ctrl-red">
              WebGL Map Preview Unavailable
            </span>
            <p className="mt-1 font-semibold text-ink">
              {shipment.status === "OUT_FOR_DELIVERY"
                ? "Rider En Route"
                : shipment.status === "DELIVERED"
                ? "Delivered"
                : "Packaging & Staging"}{" "}
              &bull; {shipment.destinationCity}
            </p>
          </div>
          {routeDistanceKm !== null && (
            <span className="rounded bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-700 tabular-nums">
              {formatDistance(routeDistanceKm)}
              {estimatedMins !== null && shipment.status !== "DELIVERED"
                ? ` · ≈ ${estimatedMins} mins`
                : ""}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-soft block">
              Latest Known Rider Coordinates
            </span>
            <p className="mt-0.5 font-mono font-semibold text-ink tabular-nums">
              {activeRiderCoord[1].toFixed(5)}, {activeRiderCoord[0].toFixed(5)}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-soft">
              {shipment.courierName} ({shipment.driverName || "Courier Rider"})
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-ink-soft block">
              Delivery Destination
            </span>
            <p className="mt-0.5 font-medium text-ink">
              {shipment.destinationAddress || shipment.destinationCity}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-soft">
              Updated:{" "}
              {shipment.updatedAt
                ? new Date(shipment.updatedAt).toLocaleString()
                : "Pending GPS update"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-border bg-canvas ${className}`}
    >
      {/* Pure MapLibre GL JS Canvas */}
      <div ref={containerRef} style={{ height, width: "100%" }} />

      {/* Initial Style Loading Overlay */}
      {isMapLoading && !mapError && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-canvas/70 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded border border-border bg-paper px-3 py-1.5 text-xs text-ink shadow-sm">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink border-t-transparent" />
            <span>Loading vector map...</span>
          </div>
        </div>
      )}

      {/* Style / Tile Failure Banner */}
      {mapError && (
        <div className="absolute bottom-12 left-3 right-3 z-20 flex items-center justify-between gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-sm">
          <span>{mapError}</span>
          <button
            type="button"
            onClick={() => {
              setIsMapLoading(true);
              setMapError(null);
              setRetryTick((prev) => prev + 1);
            }}
            className="shrink-0 rounded border border-amber-400 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
          >
            Retry Map
          </button>
        </div>
      )}

      {/* Floating Info Overlay Strip */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded border border-border/80 bg-paper/95 px-3.5 py-2 text-xs shadow-md backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-sky-500 animate-ping" />
          <span className="font-semibold text-ink">
            {shipment.status === "OUT_FOR_DELIVERY"
              ? "Rider En Route"
              : shipment.status === "DELIVERED"
              ? "Delivered"
              : "Packaging & Staging"}
          </span>
          <span className="text-ink-soft">&bull;</span>
          <span className="text-ink-soft truncate max-w-[180px]">
            {shipment.destinationCity}
          </span>
          {gpsSignalStale && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
              Last known GPS
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 tabular-nums font-medium text-ink">
          {routeDistanceKm !== null && (
            <span>
              Distance: <strong>{formatDistance(routeDistanceKm)}</strong>
            </span>
          )}
          {estimatedMins !== null && shipment.status !== "DELIVERED" && (
            <span className="rounded bg-sky-500/10 px-2 py-0.5 text-sky-700 text-[11px] font-semibold">
              ≈ {estimatedMins} mins away
            </span>
          )}
          {isRouting && (
            <span className="text-[10px] text-ink-soft animate-pulse">
              Calculating roads...
            </span>
          )}
          <button
            type="button"
            onClick={handleRecenter}
            aria-label="Recenter map"
            className="rounded border border-border bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink hover:bg-paper transition-colors cursor-pointer"
          >
            Recenter
          </button>
        </div>
      </div>
    </div>
  );
}
