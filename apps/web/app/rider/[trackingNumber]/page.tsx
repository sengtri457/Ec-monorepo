"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import Link from "next/link";
import { DeliveryShipment } from "@/types";
import { fetchDeliveryTracking, updateRiderLocation } from "@/lib/api";

interface RiderTrackingProps {
  params: Promise<{ trackingNumber: string }>;
}

export default function RiderTrackingPage({ params }: RiderTrackingProps) {
  const resolvedParams = use(params);
  const trackingNumber = decodeURIComponent(resolvedParams.trackingNumber);

  const [shipment, setShipment] = useState<DeliveryShipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
  } | null>(null);

  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const watchRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Load initial shipment
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const data = await fetchDeliveryTracking(trackingNumber);
        if (data && isMounted) {
          setShipment(data);
          if (data.currentLat && data.currentLng) {
            setPosition({
              latitude: data.currentLat,
              longitude: data.currentLng,
              heading: data.heading || null,
              speed: data.speed || null,
            });
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [trackingNumber]);

  // Transmit location to Order Service
  const sendLocation = useCallback(async () => {
    const pos = positionRef.current;
    if (!pos) return;

    const ok = await updateRiderLocation(trackingNumber, {
      latitude: pos.latitude,
      longitude: pos.longitude,
      heading: pos.heading,
      speed: pos.speed,
    });

    if (ok) {
      setUpdateCount((c) => c + 1);
      setLastUpdate(new Date().toLocaleTimeString());
    }
  }, [trackingNumber]);

  const stopTracking = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(() => {
    if (isTracking) return;
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your mobile browser.");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : null, // Convert m/s to km/h
        };
        setPosition(p);
        positionRef.current = p;
      },
      (err) => {
        setError(`GPS error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    watchRef.current = id;
    setIsTracking(true);

    // Immediately send and schedule periodic sync
    sendLocation();
    intervalRef.current = setInterval(() => {
      sendLocation();
    }, 5000);
  }, [isTracking, sendLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2 text-ink-soft">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="text-xs uppercase tracking-wider">Loading Courier Dispatch...</p>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="text-sm text-ctrl-red">Shipment record not found.</p>
        <Link href="/" className="mt-4 inline-block text-xs text-ink underline">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      {/* Header */}
      <div className="border border-border bg-paper p-5 shadow-sm text-center">
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-ink mb-1">
          <span>🏍️ Clothes Rider Dispatch</span>
        </div>
        <p className="text-sm font-bold text-ink tabular-nums">{shipment.trackingNumber}</p>
        <p className="text-xs text-ink-soft mt-0.5">Order Ref: {shipment.orderNumber}</p>
      </div>

      {/* Recipient Details Card */}
      <div className="mt-4 border border-border bg-paper p-5 space-y-3">
        <span className="type-label text-[10px] uppercase tracking-wider text-ink-soft block">
          Customer &amp; Dropoff Location
        </span>
        <div>
          <p className="text-sm font-bold text-ink">{shipment.recipientName}</p>
          <p className="text-xs text-ink-soft leading-relaxed mt-0.5">
            {shipment.destinationAddress || shipment.destinationCity}
          </p>
        </div>
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <a
            href={`tel:${shipment.recipientPhone.replace(/\s+/g, "")}`}
            className="type-label inline-flex items-center gap-1.5 bg-forest text-white px-4 py-2 text-xs uppercase tracking-wider font-semibold rounded-sm shadow-xs"
          >
            <span>📞 Call Recipient ({shipment.recipientPhone})</span>
          </a>
        </div>
      </div>

      {/* GPS Streaming Control Card */}
      <div className="mt-4 border border-border bg-paper p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="type-label text-xs uppercase tracking-wider font-semibold text-ink">
            Live GPS Telemetry
          </span>
          <span
            className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase ${
              isTracking ? "text-forest" : "text-ink-soft"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isTracking ? "bg-forest animate-ping" : "bg-ink-soft"
              }`}
            />
            {isTracking ? "Streaming Live" : "Stopped"}
          </span>
        </div>

        {error && <p className="text-xs text-ctrl-red bg-ctrl-red/10 p-2.5 rounded">{error}</p>}

        <div className="grid grid-cols-2 gap-3 text-xs bg-canvas/40 p-3 rounded tabular-nums">
          <div>
            <span className="text-[10px] uppercase text-ink-soft block">Latitude</span>
            <span className="font-semibold text-ink">
              {position ? position.latitude.toFixed(6) : "--"}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-ink-soft block">Longitude</span>
            <span className="font-semibold text-ink">
              {position ? position.longitude.toFixed(6) : "--"}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-ink-soft block">Speed</span>
            <span className="font-semibold text-ink">
              {position?.speed !== null && position?.speed !== undefined
                ? `${position.speed} km/h`
                : "0 km/h"}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-ink-soft block">Updates Sent</span>
            <span className="font-semibold text-ink">{updateCount} pings</span>
          </div>
        </div>

        {lastUpdate && (
          <p className="text-[10px] text-ink-soft text-right tabular-nums">
            Last synced to server: {lastUpdate}
          </p>
        )}

        <div className="pt-2">
          {!isTracking ? (
            <button
              type="button"
              onClick={startTracking}
              className="type-label w-full bg-ink px-4 py-3.5 text-xs uppercase tracking-widest text-paper hover:bg-ink-soft transition-colors font-bold shadow-sm cursor-pointer"
            >
              Start GPS Delivery Route &rarr;
            </button>
          ) : (
            <button
              type="button"
              onClick={stopTracking}
              className="type-label w-full border border-ctrl-red bg-paper px-4 py-3 text-xs uppercase tracking-widest text-ctrl-red hover:bg-ctrl-red/10 transition-colors font-semibold cursor-pointer"
            >
              Pause GPS Streaming
            </button>
          )}
        </div>
      </div>

      {/* Link to Public Customer View */}
      <div className="mt-4 text-center">
        <Link
          href={`/tracking/${encodeURIComponent(shipment.trackingNumber)}`}
          className="text-xs text-ink-soft underline hover:text-ink"
        >
          Inspect Customer Public Tracking Map &rarr;
        </Link>
      </div>
    </div>
  );
}
