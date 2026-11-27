"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { DeliveryShipment } from "@/types";
import DeliveryTimeline from "./DeliveryTimeline";
import { fetchDeliveryTracking } from "@/lib/api";

const DeliveryMapView = dynamic(() => import("./DeliveryMapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 w-full items-center justify-center rounded-md border border-border bg-canvas/40">
      <div className="flex flex-col items-center gap-2 text-ink-soft">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent" />
        <span className="text-xs uppercase tracking-wider">Loading Live Delivery Map...</span>
      </div>
    </div>
  ),
});

interface Props {
  initialShipment: DeliveryShipment;
  showMapByDefault?: boolean;
}

export default function DeliveryTrackingCard({ initialShipment, showMapByDefault = true }: Props) {
  const [shipment, setShipment] = useState<DeliveryShipment>(initialShipment);
  const [isMapOpen, setIsMapOpen] = useState(showMapByDefault);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updated = await fetchDeliveryTracking(shipment.trackingNumber);
      if (updated) {
        setShipment(updated);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Lightweight live location sync while rider is actively out for delivery
  useEffect(() => {
    if (!isMapOpen || shipment.status !== "OUT_FOR_DELIVERY") return;

    let cancelled = false;
    const poll = async () => {
      try {
        const updated = await fetchDeliveryTracking(shipment.trackingNumber);
        if (updated && !cancelled) {
          setShipment(updated);
        }
      } catch {
        // Keep last valid shipment snapshot on transient network errors
      }
    };

    const interval = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isMapOpen, shipment.status, shipment.trackingNumber]);

  // Determine active step index (0 to 3)
  const steps = [
    { label: "Order Confirmed", code: "ORDER_CONFIRMED" },
    { label: "Packed at Hub", code: "PACKED" },
    { label: "Out for Delivery", code: "OUT_FOR_DELIVERY" },
    { label: "Delivered", code: "DELIVERED" },
  ];

  let currentStepIndex = 1;
  if (shipment.status === "DELIVERED") {
    currentStepIndex = 3;
  } else if (shipment.status === "OUT_FOR_DELIVERY") {
    currentStepIndex = 2;
  } else if (shipment.status === "PACKED" || shipment.status === "PICKED_UP") {
    currentStepIndex = 1;
  } else {
    currentStepIndex = 0;
  }

  const isDelivered = shipment.status === "DELIVERED";
  const isEnRoute = shipment.status === "OUT_FOR_DELIVERY";

  return (
    <div className="border border-border bg-paper shadow-sm overflow-hidden mb-6">
      {/* Top Banner Header */}
      <div className="border-b border-border bg-canvas/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              isDelivered
                ? "bg-forest/10 text-forest"
                : isEnRoute
                ? "bg-sky-500/10 text-sky-600 animate-pulse"
                : "bg-ink/5 text-ink"
            }`}
          >
            {isDelivered ? "✓" : isEnRoute ? "🏍️" : "📦"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="type-label text-[10px] uppercase tracking-wider text-ink-soft">
                Live Fulfillment Tracking
              </span>
              <span
                className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                  isDelivered
                    ? "bg-forest/10 text-forest border-forest/30"
                    : isEnRoute
                    ? "bg-sky-500/10 text-sky-700 border-sky-500/30"
                    : "bg-amber-500/10 text-amber-700 border-amber-500/30"
                }`}
              >
                {shipment.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-bold text-ink tabular-nums">
                {shipment.trackingNumber}
              </span>
              <span className="text-ink-soft text-xs">&bull;</span>
              <span className="text-xs text-ink-soft">{shipment.courierName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="type-label inline-flex items-center gap-1 border border-border bg-paper px-3 py-1.5 text-[11px] uppercase tracking-wider text-ink hover:bg-canvas transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className={isRefreshing ? "animate-spin" : ""}>↻</span>
            <span>{isRefreshing ? "Updating..." : "Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMapOpen(!isMapOpen)}
            className={`type-label inline-flex items-center gap-1 border px-3 py-1.5 text-[11px] uppercase tracking-wider transition-colors cursor-pointer ${
              isMapOpen
                ? "border-ink bg-ink text-paper"
                : "border-border bg-paper text-ink hover:bg-canvas"
            }`}
          >
            <span>🗺️</span>
            <span>{isMapOpen ? "Hide Map" : "View Live Map"}</span>
          </button>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="p-4 sm:p-5 border-b border-border bg-paper">
        <div className="grid grid-cols-4 gap-2">
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div key={step.code} className="flex flex-col gap-1.5">
                <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isCompleted ? (isDelivered ? "bg-forest" : "bg-sky-600") : "w-0"
                    }`}
                    style={{ width: isCompleted ? "100%" : "0%" }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] sm:text-[11px] font-medium truncate ${
                      isCurrent
                        ? "text-ink font-semibold"
                        : isCompleted
                        ? "text-ink-soft"
                        : "text-ink-soft/50"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Optional Map View Canvas */}
      {isMapOpen && (
        <div className="p-4 sm:p-5 border-b border-border bg-canvas/20">
          <DeliveryMapView shipment={shipment} height="320px" />
        </div>
      )}

      {/* Driver Contact & Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border bg-paper text-xs">
        <div className="p-4 flex flex-col justify-between">
          <span className="type-label text-[10px] uppercase tracking-wider text-ink-soft">
            Courier &amp; Vehicle
          </span>
          <div className="mt-1">
            <p className="font-semibold text-ink">{shipment.driverName || "Express Courier Rider"}</p>
            <p className="text-[11px] text-ink-soft">{shipment.vehicleInfo || "Honda Dream 125"}</p>
          </div>
          {shipment.driverPhone && (
            <div className="mt-2">
              <a
                href={`tel:${shipment.driverPhone.replace(/\s+/g, "")}`}
                className="type-label inline-flex items-center gap-1.5 text-xs text-ctrl-red font-semibold hover:underline"
              >
                <span>📞 Call Rider</span>
                <span className="tabular-nums">({shipment.driverPhone})</span>
              </a>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="type-label text-[10px] uppercase tracking-wider text-ink-soft">
            Delivery Destination
          </span>
          <div className="mt-1">
            <p className="font-semibold text-ink">{shipment.recipientName}</p>
            <p className="text-[11px] text-ink-soft line-clamp-2">
              {shipment.destinationAddress || shipment.destinationCity}
            </p>
          </div>
          <p className="text-[10px] text-ink-soft mt-1">
            Phone: <strong className="text-ink tabular-nums">{shipment.recipientPhone}</strong>
          </p>
        </div>

        <div className="p-4 flex flex-col justify-between">
          <span className="type-label text-[10px] uppercase tracking-wider text-ink-soft">
            Estimated Delivery
          </span>
          <div className="mt-1">
            <p className="text-sm font-bold text-ink tabular-nums">
              {shipment.estimatedDeliveryAt
                ? new Date(shipment.estimatedDeliveryAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Same Day Delivery"}
            </p>
            <p className="text-[11px] text-forest font-medium mt-0.5">
              {isDelivered ? "Delivered to Doorstep" : "On schedule &middot; Clothes Express"}
            </p>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => setIsTimelineOpen(!isTimelineOpen)}
              className="text-ink underline hover:text-ctrl-red transition-colors cursor-pointer"
            >
              {isTimelineOpen ? "Hide Milestones ↑" : "View Milestones History ↓"}
            </button>
            <Link
              href={`/tracking/${encodeURIComponent(shipment.trackingNumber)}`}
              className="text-ctrl-red font-semibold hover:underline"
            >
              Tracking Portal &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Collapsible Chronological Milestone History */}
      {isTimelineOpen && (
        <div className="p-5 sm:p-6 bg-canvas/30 border-t border-border">
          <span className="type-label text-[10px] uppercase tracking-widest text-ink-soft block mb-4">
            Chronological Delivery Milestones
          </span>
          <DeliveryTimeline events={shipment.timeline} />
        </div>
      )}
    </div>
  );
}
