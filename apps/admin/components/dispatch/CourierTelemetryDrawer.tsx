"use client";

import React from "react";
import Link from "next/link";
import {
  X,
  Compass,
  Battery,
  Zap,
  Phone,
  Navigation,
  CheckCircle2,
} from "lucide-react";
import { AdminOrderSummary } from "@ec/types";

export interface CourierData {
  id: string;
  courierId: string;
  name: string;
  phone: string;
  vehicleType: "SCOOTER" | "VAN";
  plateNumber: string;
  batteryPercent: number;
  speedKmh: number;
  bearing: number;
  latitude: number;
  longitude: number;
  assignedOrderNumber?: string | null;
  assignedCustomer?: string;
  destinationAddress?: string;
}

interface CourierTelemetryDrawerProps {
  courier: CourierData | null;
  pendingOrders?: AdminOrderSummary[];
  onClose: () => void;
  onAssignOrder?: (courierId: string, orderNumber: string) => void;
  onMarkDelivered?: (orderNumber: string) => void;
}

export function CourierTelemetryDrawer({
  courier,
  pendingOrders = [],
  onClose,
  onAssignOrder,
  onMarkDelivered,
}: CourierTelemetryDrawerProps) {
  if (!courier) return null;

  const isAssigned = Boolean(courier.assignedOrderNumber);

  return (
    <div className="absolute top-4 right-4 z-30 w-84 bg-neutral-900/95 backdrop-blur-md rounded-2xl border border-neutral-700 shadow-2xl p-5 text-white animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">
            {courier.vehicleType === "SCOOTER" ? "🛵" : "🚐"}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white font-mono">{courier.courierId}</h3>
              <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded font-mono">
                {courier.plateNumber}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">{courier.name}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Close telemetry drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 py-4 text-xs">
        {/* Speed */}
        <div className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-700/60">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] uppercase font-semibold">Live Speed</span>
            <Navigation className="w-3 h-3 text-neutral-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono text-emerald-400">
              {courier.speedKmh}
            </span>
            <span className="text-[10px] text-neutral-400 font-mono">km/h</span>
          </div>
        </div>

        {/* Battery */}
        <div className="bg-neutral-800/60 p-3 rounded-xl border border-neutral-700/60">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] uppercase font-semibold">Battery</span>
            <Battery className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-xl font-bold font-mono ${
                courier.batteryPercent >= 50
                  ? "text-emerald-400"
                  : courier.batteryPercent >= 20
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {courier.batteryPercent}%
            </span>
          </div>
        </div>

        {/* Bearing & Heading */}
        <div className="col-span-2 bg-neutral-800/60 p-3 rounded-xl border border-neutral-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-neutral-400" />
            <div>
              <span className="text-[10px] uppercase text-neutral-400 block font-semibold">
                Compass Heading
              </span>
              <span className="font-mono text-xs text-neutral-200">
                {courier.bearing}&deg; Vector
              </span>
            </div>
          </div>
          <div
            className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold text-white transition-transform"
            style={{ transform: `rotate(${courier.bearing}deg)` }}
          >
            &uarr;
          </div>
        </div>

        {/* Driver Contact */}
        <div className="col-span-2 bg-neutral-800/60 p-3 rounded-xl border border-neutral-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-neutral-400" />
            <span className="font-mono text-xs text-neutral-300">{courier.phone}</span>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
            Shift Active
          </span>
        </div>
      </div>

      {/* Active Assignment or Dispatch Action */}
      {isAssigned ? (
        <div className="p-3.5 bg-blue-950/60 border border-blue-800/60 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between text-blue-300 font-semibold">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Assigned Delivery</span>
            </div>
            <span className="font-mono">{courier.assignedOrderNumber}</span>
          </div>

          {courier.assignedCustomer && (
            <p className="text-[11px] text-neutral-300">
              Recipient: <strong className="text-white">{courier.assignedCustomer}</strong>
            </p>
          )}

          {courier.destinationAddress && (
            <p className="text-[11px] text-neutral-400 truncate">
              To: {courier.destinationAddress}
            </p>
          )}

          <div className="pt-2 border-t border-blue-900/60 flex items-center justify-between">
            <Link
              href={`/orders/${courier.assignedOrderNumber}`}
              className="text-blue-400 hover:text-blue-300 text-[11px] font-semibold underline"
            >
              View Order Details &rarr;
            </Link>

            {onMarkDelivered && (
              <button
                type="button"
                onClick={() => onMarkDelivered(courier.assignedOrderNumber!)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold transition cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Mark Delivered</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-neutral-800/40 border border-neutral-700/40 rounded-xl text-xs text-neutral-400 text-center">
            Currently available for new dispatch
          </div>

          {pendingOrders.length > 0 && onAssignOrder && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                Assign Pending Order
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                {pendingOrders.slice(0, 5).map((po) => {
                  const num = po.order_number || po.orderNumber || po.id;
                  const name = po.customer_name || po.customerName || "Customer";
                  return (
                    <div
                      key={num}
                      className="p-2 bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 rounded-lg flex items-center justify-between text-xs transition"
                    >
                      <div>
                        <div className="font-mono font-semibold text-white">{num}</div>
                        <div className="text-[10px] text-neutral-400">{name}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAssignOrder(courier.courierId, num)}
                        className="px-2 py-1 bg-[#944434] hover:bg-[#7E3729] text-white rounded text-[10px] font-semibold transition cursor-pointer"
                      >
                        Dispatch
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Telemetric Feed Online
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-white font-medium cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
