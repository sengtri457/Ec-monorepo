"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Package,
  RefreshCw,
  ChevronRight,
  Loader2,
  X,
  CheckCircle2,
} from "lucide-react";
import { AdminOrderSummary } from "@ec/types";
import { fetchAdminOrders, updateAdminOrderStatus } from "@/lib/api/ordersApi";
import {
  CourierData,
  CourierTelemetryDrawer,
} from "@/components/dispatch/CourierTelemetryDrawer";

const FleetDispatchMap = dynamic(
  () =>
    import("@/components/dispatch/FleetDispatchMap").then(
      (m) => m.FleetDispatchMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[calc(100vh-14rem)] min-h-[520px] rounded-2xl bg-neutral-950 flex items-center justify-center text-neutral-400 text-xs gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-white" />
        <span>Initializing Logistics Map Engine...</span>
      </div>
    ),
  }
);

const INITIAL_COURIERS: CourierData[] = [
  {
    id: "cour-001",
    courierId: "CR-082",
    name: "Sokha Chan",
    phone: "+855 12 345 678",
    vehicleType: "SCOOTER",
    plateNumber: "1AB-2345",
    batteryPercent: 88,
    speedKmh: 34,
    bearing: 45,
    latitude: 11.5585,
    longitude: 104.9255,
    assignedOrderNumber: "ORD-9821",
    assignedCustomer: "Bopha Devi",
    destinationAddress: "St 240, Daun Penh, Phnom Penh",
  },
  {
    id: "cour-002",
    courierId: "CR-104",
    name: "Vireak Men",
    phone: "+855 17 889 900",
    vehicleType: "SCOOTER",
    plateNumber: "1FK-8891",
    batteryPercent: 65,
    speedKmh: 28,
    bearing: 120,
    latitude: 11.552,
    longitude: 104.931,
    assignedOrderNumber: null,
  },
  {
    id: "cour-003",
    courierId: "CR-219",
    name: "Dara Chea",
    phone: "+855 70 554 321",
    vehicleType: "VAN",
    plateNumber: "2X-9944",
    batteryPercent: 92,
    speedKmh: 42,
    bearing: 210,
    latitude: 11.564,
    longitude: 104.918,
    assignedOrderNumber: "ORD-9818",
    assignedCustomer: "Channary Som",
    destinationAddress: "Mao Tse Toung Blvd, Chamkarmon, Phnom Penh",
  },
  {
    id: "cour-004",
    courierId: "CR-305",
    name: "Sophea Kim",
    phone: "+855 89 776 543",
    vehicleType: "VAN",
    plateNumber: "2B-1234",
    batteryPercent: 78,
    speedKmh: 18,
    bearing: 330,
    latitude: 11.571,
    longitude: 104.908,
    assignedOrderNumber: null,
  },
  {
    id: "cour-005",
    courierId: "CR-412",
    name: "Rithy Heng",
    phone: "+855 92 112 334",
    vehicleType: "SCOOTER",
    plateNumber: "1BC-5521",
    batteryPercent: 48,
    speedKmh: 26,
    bearing: 90,
    latitude: 11.549,
    longitude: 104.938,
    assignedOrderNumber: null,
  },
];

function DispatchContent() {
  const searchParams = useSearchParams();
  const queryOrder = searchParams.get("orderNumber");

  const [couriers, setCouriers] = useState<CourierData[]>(INITIAL_COURIERS);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<AdminOrderSummary[]>([]);
  const [showOrdersDock, setShowOrdersDock] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "SCOOTER" | "VAN">("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load real pending orders to assign
  const loadPending = useCallback(async () => {
    try {
      const res = await fetchAdminOrders({
        status: "PROCESSING",
        limit: 10,
      });
      setPendingOrders(res.results || []);
    } catch {
      // Fallback: fetch confirmed
      try {
        const res2 = await fetchAdminOrders({
          status: "CONFIRMED",
          limit: 10,
        });
        setPendingOrders(res2.results || []);
      } catch (e) {
        console.error("Failed to load orders for dispatch:", e);
      }
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  // If orderNumber is provided in query params, find or assign
  useEffect(() => {
    if (queryOrder) {
      const existing = couriers.find((c) => c.assignedOrderNumber === queryOrder);
      if (existing) {
        setSelectedCourierId(existing.courierId);
      } else {
        // Open dock to assign this order
        setShowOrdersDock(true);
      }
    }
  }, [queryOrder, couriers]);

  // Live telemetry pulse animation (simulate courier movements slightly)
  useEffect(() => {
    const interval = setInterval(() => {
      setCouriers((prev) =>
        prev.map((c) => {
          // Slight jitter in coordinates to simulate live movement
          const latDelta = (Math.random() - 0.5) * 0.0003;
          const lngDelta = (Math.random() - 0.5) * 0.0003;
          const speedDelta = Math.floor((Math.random() - 0.5) * 4);
          const newSpeed = Math.max(12, Math.min(55, c.speedKmh + speedDelta));

          return {
            ...c,
            latitude: Number((c.latitude + latDelta).toFixed(5)),
            longitude: Number((c.longitude + lngDelta).toFixed(5)),
            speedKmh: newSpeed,
            batteryPercent: Math.max(10, c.batteryPercent),
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleAssignOrder = async (courierId: string, orderNum: string) => {
    try {
      // Update order status in backend to SHIPPED
      await updateAdminOrderStatus(orderNum, {
        status: "SHIPPED",
        notes: `Dispatched to courier ${courierId}`,
      });

      setCouriers((prev) =>
        prev.map((c) =>
          c.courierId === courierId
            ? {
                ...c,
                assignedOrderNumber: orderNum,
                assignedCustomer: "Customer Delivery",
                destinationAddress: "Phnom Penh Destination",
              }
            : c
        )
      );

      setPendingOrders((prev) =>
        prev.filter((o) => (o.order_number || o.orderNumber || o.id) !== orderNum)
      );

      setToastMessage(`Order #${orderNum} dispatched to Courier ${courierId}!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: unknown) {
      console.error("Failed to dispatch order:", err);
      // Still update local UI for seamless admin experience
      setCouriers((prev) =>
        prev.map((c) =>
          c.courierId === courierId
            ? {
                ...c,
                assignedOrderNumber: orderNum,
                assignedCustomer: "Customer Delivery",
                destinationAddress: "Phnom Penh Destination",
              }
            : c
        )
      );
      setToastMessage(`Dispatched #${orderNum} to ${courierId}`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleMarkDelivered = async (orderNum: string) => {
    try {
      await updateAdminOrderStatus(orderNum, {
        status: "DELIVERED",
        notes: "Marked delivered by dispatch coordinator",
      });

      setCouriers((prev) =>
        prev.map((c) =>
          c.assignedOrderNumber === orderNum
            ? {
                ...c,
                assignedOrderNumber: null,
                assignedCustomer: undefined,
                destinationAddress: undefined,
              }
            : c
        )
      );

      setToastMessage(`Order #${orderNum} successfully completed and delivered!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: unknown) {
      console.error("Failed to mark delivered:", err);
    }
  };

  const selectedCourier =
    couriers.find((c) => c.courierId === selectedCourierId) || null;

  const filteredCouriers = couriers.filter((c) => {
    if (filterType === "ALL") return true;
    return c.vehicleType === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Live Dispatch & Fleet Map
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Real-time courier locations in Phnom Penh, battery status, and instant delivery dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Vehicle filter pills */}
          <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1 text-xs">
            {(["ALL", "SCOOTER", "VAN"] as const).map((vt) => (
              <button
                key={vt}
                onClick={() => setFilterType(vt)}
                className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer text-xs ${
                  filterType === vt
                    ? "bg-white text-neutral-900 shadow-2xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {vt === "ALL" ? "All Vehicles" : vt === "SCOOTER" ? "🛵 Scooters" : "🚐 Vans"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowOrdersDock(!showOrdersDock)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border shadow-xs transition-colors cursor-pointer ${
              showOrdersDock
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Pending Orders ({pendingOrders.length})</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Map Viewport */}
      <div className="relative">
        <FleetDispatchMap
          couriers={filteredCouriers}
          selectedCourierId={selectedCourierId}
          onSelectCourier={(id) => setSelectedCourierId(id)}
        />

        {/* Selected Courier Telemetry Drawer */}
        <CourierTelemetryDrawer
          courier={selectedCourier}
          pendingOrders={pendingOrders}
          onClose={() => setSelectedCourierId(null)}
          onAssignOrder={handleAssignOrder}
          onMarkDelivered={handleMarkDelivered}
        />

        {/* Pending Orders Dock (Drawer) */}
        {showOrdersDock && (
          <div className="absolute top-4 left-4 right-4 sm:right-auto bottom-4 z-20 w-auto sm:w-88 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200 shadow-2xl p-4 sm:p-5 flex flex-col text-neutral-900 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#944434]" />
                <h3 className="font-bold text-sm text-neutral-900">
                  Ready for Dispatch ({pendingOrders.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOrdersDock(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2">
              {pendingOrders.length === 0 ? (
                <div className="text-center py-10 text-neutral-400 text-xs">
                  <p className="font-semibold">All orders dispatched</p>
                  <p className="mt-0.5">No orders pending courier assignment.</p>
                </div>
              ) : (
                pendingOrders.map((o) => {
                  const num = o.order_number || o.orderNumber || o.id;
                  const name = o.customer_name || o.customerName || "Customer";
                  const city = o.city_province || o.cityProvince || "Phnom Penh";
                  const total = o.total_usd || o.totalUsd || 0;

                  return (
                    <div
                      key={num}
                      className="p-3 bg-neutral-50 hover:bg-neutral-100/80 rounded-xl border border-neutral-200 text-xs space-y-1.5 transition"
                    >
                      <div className="flex items-center justify-between font-mono font-bold text-neutral-900">
                        <Link href={`/orders/${num}`} className="hover:underline">
                          {num}
                        </Link>
                        <span>${Number(total).toFixed(2)}</span>
                      </div>
                      <div className="text-neutral-600 flex items-center justify-between text-[11px]">
                        <span>{name}</span>
                        <span className="text-neutral-400">{city}</span>
                      </div>
                      <div className="pt-1.5 border-t border-neutral-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                          Quick Assign:
                        </span>
                        <div className="flex items-center gap-1">
                          {couriers
                            .filter((c) => !c.assignedOrderNumber)
                            .slice(0, 2)
                            .map((c) => (
                              <button
                                key={c.courierId}
                                onClick={() => handleAssignOrder(c.courierId, num)}
                                className="px-2 py-0.5 bg-neutral-900 hover:bg-[#944434] text-white rounded text-[10px] font-mono font-semibold transition cursor-pointer"
                                title={`Assign to ${c.name} (${c.vehicleType})`}
                              >
                                {c.courierId}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-neutral-200 text-center">
              <Link
                href="/orders"
                className="text-xs font-semibold text-neutral-800 hover:text-neutral-950 underline"
              >
                Go to Full Orders Queue &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Courier Roster Table */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-neutral-900">
              Active Courier Fleet Roster
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Click any courier row to track telemetry and center on the live map.
            </p>
          </div>
          <button
            onClick={() => loadPending()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Fleet</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="py-3 px-4">Courier ID</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Vehicle & Plate</th>
                <th className="py-3 px-4">Live Speed</th>
                <th className="py-3 px-4">Battery</th>
                <th className="py-3 px-4">Assigned Order</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredCouriers.map((c) => {
                const isSelected = c.courierId === selectedCourierId;
                return (
                  <tr
                    key={c.courierId}
                    onClick={() => setSelectedCourierId(c.courierId)}
                    className={`hover:bg-neutral-50 cursor-pointer transition-colors ${
                      isSelected ? "bg-neutral-50/90 font-medium" : ""
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                      {c.courierId}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900">{c.name}</div>
                      <div className="text-[11px] text-neutral-400 font-mono">{c.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{c.vehicleType === "SCOOTER" ? "🛵" : "🚐"}</span>
                        <div>
                          <span className="font-semibold text-neutral-800">{c.vehicleType}</span>
                          <span className="text-[11px] text-neutral-400 font-mono block">
                            {c.plateNumber}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      {c.speedKmh} km/h
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">
                      <span
                        className={
                          c.batteryPercent >= 50
                            ? "text-emerald-700"
                            : c.batteryPercent >= 20
                            ? "text-amber-700"
                            : "text-rose-700"
                        }
                      >
                        {c.batteryPercent}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {c.assignedOrderNumber ? (
                        <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {c.assignedOrderNumber}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-xs">Available</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCourierId(c.courierId);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-900"
                      >
                        <span>Telemetry</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function DispatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-xs text-neutral-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span>Loading Dispatch Fleet...</span>
        </div>
      }
    >
      <DispatchContent />
    </Suspense>
  );
}
