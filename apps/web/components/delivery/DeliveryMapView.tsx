"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchRoadRoute } from "@/app/actions/fetch-road-route";
import { DeliveryShipment } from "@/types";

interface Props {
  shipment: DeliveryShipment;
  height?: string;
  className?: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// ── Motorbike Rider Marker Icon (Clean SVG) ──────────────────────────────────
function makeRiderIcon(isOutForDelivery: boolean) {
  const bg = isOutForDelivery ? "#0284c7" : "#0f766e";
  const pinW = 44;
  const pinH = 52;
  const pulse = isOutForDelivery
    ? `<circle cx="${pinW / 2}" cy="${pinW / 2}" r="${pinW / 2 - 2}" fill="none" stroke="${bg}" stroke-width="2" opacity="0.4">
        <animate attributeName="r" values="${pinW / 4};${pinW / 2 - 1}" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite"/>
       </circle>`
    : "";

  return L.divIcon({
    className: "",
    html: `
      <div style="width:${pinW}px;height:${pinH}px;position:relative;">
        <svg width="${pinW}" height="${pinH}" viewBox="0 0 ${pinW} ${pinH}" xmlns="http://www.w3.org/2000/svg"
             style="filter:drop-shadow(0 3px 8px rgba(0,0,0,0.35));">
          ${pulse}
          <path d="M${pinW / 2} ${pinH - 2}
                   C${pinW / 2} ${pinH - 2} 2 ${pinW * 0.72}
                   2 ${pinW / 2}
                   A${pinW / 2 - 2} ${pinW / 2 - 2} 0 1 1 ${pinW - 2} ${pinW / 2}
                   C${pinW - 2} ${pinW * 0.72} ${pinW / 2} ${pinH - 2} ${pinW / 2} ${pinH - 2}Z"
                fill="${bg}" stroke="white" stroke-width="2"/>
          <!-- Motorbike / Courier Icon Silhouette -->
          <circle cx="${pinW / 2 - 6}" cy="${pinW / 2 + 1}" r="3.5" fill="none" stroke="white" stroke-width="1.5"/>
          <circle cx="${pinW / 2 + 6}" cy="${pinW / 2 + 1}" r="3.5" fill="none" stroke="white" stroke-width="1.5"/>
          <path d="M${pinW / 2 - 6} ${pinW / 2 + 1} L${pinW / 2} ${pinW / 2 - 4} L${pinW / 2 + 6} ${pinW / 2 + 1}" fill="none" stroke="white" stroke-width="1.5"/>
          <path d="M${pinW / 2 - 1} ${pinW / 2 - 4} L${pinW / 2 - 4} ${pinW / 2 - 8} L${pinW / 2 + 2} ${pinW / 2 - 8}" fill="none" stroke="white" stroke-width="1.5"/>
        </svg>
      </div>`,
    iconSize: [pinW, pinH],
    iconAnchor: [pinW / 2, pinH - 2],
  });
}

// ── Store / Hub Origin Icon ──────────────────────────────────────────────────
const originHubIcon = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50%;background:#059669;border:3px solid white;box-shadow:0 2px 8px rgba(5,150,105,0.6);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;">
    🏢
  </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// ── Customer Destination Doorstep Icon ───────────────────────────────────────
const customerDestIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:38px;position:relative;">
    <svg width="28" height="38" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.3));">
      <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 38 14 38C14 38 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#DC2626"/>
      <circle cx="14" cy="14" r="6" fill="white"/>
      <circle cx="14" cy="14" r="3" fill="#DC2626"/>
    </svg>
  </div>`,
  iconSize: [28, 38],
  iconAnchor: [14, 38],
});

export default function DeliveryMapView({ shipment, height = "380px", className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const arrowsRef = useRef<L.Marker[]>([]);

  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [estimatedMins, setEstimatedMins] = useState<number | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  const originLat = shipment.originLat || 11.5761;
  const originLng = shipment.originLng || 104.8988;
  const destLat = shipment.destLat || 11.5564;
  const destLng = shipment.destLng || 104.9282;
  const currentLat = shipment.currentLat || originLat;
  const currentLng = shipment.currentLng || originLng;

  // 1. Initialise Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [currentLat, currentLng],
      zoom: 13,
      zoomControl: false,
    });

    // Carto Voyager — High aesthetic, clean tiles
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.control.scale({ position: "bottomleft", imperial: false }).addTo(map);

    // Add Origin Hub Marker
    L.marker([originLat, originLng], { icon: originHubIcon })
      .bindPopup("<b>Clothes Central Hub</b><br>Toul Kork, Phnom Penh")
      .addTo(map);

    // Add Customer Destination Marker
    L.marker([destLat, destLng], { icon: customerDestIcon })
      .bindPopup(`<b>Delivery Destination</b><br>${shipment.destinationAddress || shipment.destinationCity}`)
      .addTo(map);

    // Add Rider Marker
    const rider = L.marker([currentLat, currentLng], {
      icon: makeRiderIcon(shipment.status === "OUT_FOR_DELIVERY"),
      zIndexOffset: 500,
    })
      .bindPopup(
        `<b>${shipment.courierName}</b><br>Driver: ${shipment.driverName || "Courier Rider"}<br>Vehicle: ${shipment.vehicleInfo || "Motorbike"}`
      )
      .addTo(map);

    riderMarkerRef.current = rider;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Fetch True Road Route via OSRM Server Action and Render Polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let isMounted = true;
    setIsRouting(true);

    async function loadRoute() {
      // Calculate from current location (or origin) to destination
      const startLat = shipment.currentLat || originLat;
      const startLng = shipment.currentLng || originLng;

      const roadPoints = await fetchRoadRoute(startLat, startLng, destLat, destLng);

      if (!isMounted || !map) return;
      setIsRouting(false);

      // Remove prior route and arrows
      if (routeLineRef.current) {
        map.removeLayer(routeLineRef.current);
      }
      arrowsRef.current.forEach((a) => map.removeLayer(a));
      arrowsRef.current = [];

      let pointsToRender: [number, number][] = roadPoints;
      if (!pointsToRender.length) {
        // Fallback straight line if OSRM unavailable
        pointsToRender = [
          [startLat, startLng],
          [destLat, destLng],
        ];
      }

      // Draw road route line
      const poly = L.polyline(pointsToRender, {
        color: "#2563EB",
        weight: 5,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      routeLineRef.current = poly;

      // Add directional arrows
      const step = Math.max(1, Math.floor(pointsToRender.length / 5));
      for (let i = step; i < pointsToRender.length; i += step) {
        const [lat1, lng1] = pointsToRender[i - 1];
        const [lat2, lng2] = pointsToRender[i];
        const angle = (Math.atan2(lng2 - lng1, lat2 - lat1) * 180) / Math.PI;
        const arrow = L.marker([lat2, lng2], {
          icon: L.divIcon({
            className: "",
            html: `<div style="transform:rotate(${angle}deg);color:#2563EB;font-size:13px;line-height:1;opacity:0.95;text-shadow:0 1px 2px white;">▶</div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
          interactive: false,
        }).addTo(map);
        arrowsRef.current.push(arrow);
      }

      // Calculate total road distance & estimated driving time
      let totalDist = 0;
      for (let i = 1; i < pointsToRender.length; i++) {
        totalDist += haversineKm(
          pointsToRender[i - 1][0],
          pointsToRender[i - 1][1],
          pointsToRender[i][0],
          pointsToRender[i][1]
        );
      }
      setRouteDistanceKm(totalDist);

      // Average urban speed ~25 km/h for Phnom Penh traffic
      const minutes = Math.max(5, Math.round((totalDist / 25) * 60));
      setEstimatedMins(minutes);

      // Fit map bounds to encompass the entire route
      const bounds = L.latLngBounds(pointsToRender);
      bounds.extend([originLat, originLng]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    loadRoute();

    return () => {
      isMounted = false;
    };
  }, [currentLat, currentLng, destLat, destLng, originLat, originLng]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Update Rider Marker Live Position
  useEffect(() => {
    if (!riderMarkerRef.current || !shipment.currentLat || !shipment.currentLng) return;
    riderMarkerRef.current.setLatLng([shipment.currentLat, shipment.currentLng]);
  }, [shipment.currentLat, shipment.currentLng]);

  return (
    <div className={`relative overflow-hidden rounded-md border border-border bg-canvas ${className}`}>
      {/* Map Canvas */}
      <div ref={containerRef} style={{ height, width: "100%" }} />

      {/* Floating Info Overlay Strip */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 rounded border border-border/80 bg-paper/95 px-3.5 py-2 text-xs shadow-md backdrop-blur-sm">
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
          <span className="text-ink-soft truncate max-w-[200px]">{shipment.destinationCity}</span>
        </div>

        <div className="flex items-center gap-3 tabular-nums font-medium text-ink">
          {routeDistanceKm !== null && (
            <span>
              Distance: <strong>{formatKm(routeDistanceKm)}</strong>
            </span>
          )}
          {estimatedMins !== null && shipment.status !== "DELIVERED" && (
            <span className="rounded bg-sky-500/10 px-2 py-0.5 text-sky-700 text-[11px] font-semibold">
              ≈ {estimatedMins} mins away
            </span>
          )}
          {isRouting && (
            <span className="text-[10px] text-ink-soft animate-pulse">Calculating roads...</span>
          )}
        </div>
      </div>
    </div>
  );
}
