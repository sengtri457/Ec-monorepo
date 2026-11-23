"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import "leaflet/dist/leaflet.css";
import { CourierData } from "./CourierTelemetryDrawer";

interface FleetDispatchMapProps {
  couriers: CourierData[];
  selectedCourierId: string | null;
  onSelectCourier: (courierId: string) => void;
}

const PHNOM_PENH_HUB: [number, number] = [11.5564, 104.9282];

export function FleetDispatchMap({
  couriers,
  selectedCourierId,
  onSelectCourier,
}: FleetDispatchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const routePolylineRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      try {
        const L = (await import("leaflet")).default;

        if (!isMounted || !mapContainerRef.current) return;

        // Create Leaflet map
        const map = L.map(mapContainerRef.current, {
          center: PHNOM_PENH_HUB,
          zoom: 13,
          zoomControl: false,
        });

        // Add Zoom Control at top right
        L.control.zoom({ position: "topright" }).addTo(map);

        // CartoDB Dark Matter tiles
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
          maxZoom: 19,
          subdomains: "abcd",
        }).addTo(map);

        // Add Flagship Hub Marker
        const hubIcon = L.divIcon({
          className: "custom-hub-marker",
          html: `
            <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
              <div style="background:#944434;color:#fff;font-weight:bold;font-size:11px;padding:3px 8px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.2);white-space:nowrap;">
                🏢 Phnom Penh Hub
              </div>
              <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #944434;"></div>
            </div>
          `,
          iconSize: [120, 36],
          iconAnchor: [60, 36],
        });

        L.marker(PHNOM_PENH_HUB, { icon: hubIcon })
          .addTo(map)
          .bindPopup("<b style='color:#0E0E12'>EC Flagship Logistics Hub</b><br>Phnom Penh Operations Center");

        mapInstanceRef.current = map;
        setMapReady(true);
      } catch (err) {
        console.error("Leaflet initialization failed, fallback active:", err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Courier Markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    import("leaflet").then(({ default: L }) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const currentMarkers = markersRef.current;
      const seenIds = new Set<string>();

      couriers.forEach((courier) => {
        seenIds.add(courier.courierId);
        const isSelected = courier.courierId === selectedCourierId;
        const iconEmoji = courier.vehicleType === "SCOOTER" ? "🛵" : "🚐";
        const dotColor = courier.speedKmh > 0 ? "#10B981" : "#F59E0B";

        const courierHtml = `
          <div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;transform:scale(${isSelected ? 1.15 : 1});transition:transform 0.2s;">
            <!-- Direction Arrow -->
            <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:7px solid ${isSelected ? '#944434' : '#18181F'};margin-bottom:-1px;"></div>
            <!-- Circle Badge -->
            <div style="position:relative;width:38px;height:38px;border-radius:50%;background:${isSelected ? '#944434' : '#18181F'};border:2px solid #ffffff;box-shadow:0 4px 14px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;">
              <span>${iconEmoji}</span>
              <span style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;border-radius:50%;background:${dotColor};border:1.5px solid #ffffff;"></span>
            </div>
            <!-- Speed Label -->
            <div style="margin-top:2px;padding:1px 5px;border-radius:4px;background:rgba(14,14,18,0.9);color:#fff;font-size:9px;font-family:monospace;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.4);">
              ${courier.speedKmh} km/h
            </div>
          </div>
        `;

        const courierIcon = L.divIcon({
          className: `custom-courier-${courier.courierId}`,
          html: courierHtml,
          iconSize: [44, 60],
          iconAnchor: [22, 50],
        });

        if (currentMarkers.has(courier.courierId)) {
          const marker = currentMarkers.get(courier.courierId);
          marker.setLatLng([courier.latitude, courier.longitude]);
          marker.setIcon(courierIcon);
        } else {
          const marker = L.marker([courier.latitude, courier.longitude], {
            icon: courierIcon,
          }).addTo(map);

          marker.on("click", () => {
            onSelectCourier(courier.courierId);
          });

          currentMarkers.set(courier.courierId, marker);
        }
      });

      // Remove vanished markers
      currentMarkers.forEach((marker, id) => {
        if (!seenIds.has(id)) {
          marker.remove();
          currentMarkers.delete(id);
        }
      });

      // Update route polyline if courier is selected
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }

      if (selectedCourierId) {
        const active = couriers.find((c) => c.courierId === selectedCourierId);
        if (active) {
          // Draw route line from Hub to Courier
          const points: [number, number][] = [
            PHNOM_PENH_HUB,
            [active.latitude, active.longitude],
          ];

          routePolylineRef.current = L.polyline(points, {
            color: "#944434",
            weight: 3,
            opacity: 0.8,
            dashArray: "6, 8",
          }).addTo(map);
        }
      }
    });
  }, [couriers, selectedCourierId, mapReady, onSelectCourier]);

  const handleResetView = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(PHNOM_PENH_HUB, 13, { animate: true });
    }
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-14rem)] min-h-[520px] rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-950">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

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
          {couriers.length} <span className="text-xs font-normal text-neutral-400">Couriers Active</span>
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
