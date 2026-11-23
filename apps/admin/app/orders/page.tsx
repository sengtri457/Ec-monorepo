"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { AdminOrderSummary } from "@ec/types";
import { fetchAdminOrders } from "@/lib/api/ordersApi";
import { OrderDrawer } from "@/components/orders/OrderDrawer";

export default function AdminOrdersQueuePage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [offset, setOffset] = useState<number>(0);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null);
  const pageSize = 25;

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchAdminOrders({
        status: statusTab,
        payment_status: paymentFilter,
        search: search.trim() || undefined,
        limit: pageSize,
        offset,
      });
      setOrders(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      console.error("Failed to fetch admin orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusTab, paymentFilter, search, offset]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || "PENDING").toUpperCase();
    switch (s) {
      case "DELIVERED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <CheckCircle2 className="h-3 w-3" /> Delivered
          </span>
        );
      case "SHIPPED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <Truck className="h-3 w-3" /> Shipped
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
            <Clock className="h-3 w-3" /> Processing
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
            <CheckCircle2 className="h-3 w-3" /> Confirmed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
            <RotateCcw className="h-3 w-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
    }
  };

  const getPaymentBadge = (status?: string) => {
    const s = (status || "PENDING").toUpperCase();
    if (s === "PAID") {
      return (
        <span className="inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
          PAID
        </span>
      );
    }
    if (s === "FAILED") {
      return (
        <span className="inline-flex items-center rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-600/20">
          FAILED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-600/20">
        PENDING
      </span>
    );
  };

  const tabs = [
    { id: "ALL", label: "All Orders" },
    { id: "PENDING", label: "Pending" },
    { id: "CONFIRMED", label: "Confirmed" },
    { id: "PROCESSING", label: "Processing" },
    { id: "SHIPPED", label: "Shipped" },
    { id: "DELIVERED", label: "Delivered" },
    { id: "CANCELLED", label: "Cancelled" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Orders & Fulfillment Queue
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Monitor, inspect, and advance customer orders through fulfillment stages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dispatch"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 transition cursor-pointer"
          >
            <Truck className="h-3.5 w-3.5 text-neutral-500" />
            <span>Fleet Telemetry</span>
          </Link>
          <button
            onClick={() => loadOrders()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync Orders</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by Order #, Customer, Phone, or Email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 pl-9 pr-4 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-500">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setOffset(0);
              }}
              className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-800 focus:border-neutral-900 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">Paid Only</option>
              <option value="PENDING">Pending Payment</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Clean Underline Tabs */}
        <div className="border-b border-neutral-200 -mb-1 pt-1">
          <nav className="flex space-x-2 overflow-x-auto pb-px" aria-label="Order Status Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusTab(tab.id);
                  setOffset(0);
                }}
                className={`whitespace-nowrap px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  statusTab === tab.id
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50/80 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-6 py-3.5">Order Number</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Destination</th>
                <th className="px-4 py-3.5 text-center">Items</th>
                <th className="px-4 py-3.5">Total Amount</th>
                <th className="px-4 py-3.5">Payment</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-neutral-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
                      <span>Loading orders queue...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-neutral-400">
                    <ShoppingBag className="mx-auto h-8 w-8 text-neutral-300 mb-2" />
                    <p className="font-semibold text-neutral-700">No orders match filter criteria</p>
                    <p className="text-[11px] mt-0.5 text-neutral-400">Try resetting search query or status tab.</p>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const orderNum = o.order_number || o.orderNumber || o.id;
                  const custName = o.customer_name || o.customerName || "Customer";
                  const phone = o.customer_phone || o.customerPhone || "-";
                  const dateVal = o.created_at || o.createdAt;
                  const dateStr = dateVal ? new Date(dateVal).toLocaleDateString() : "-";
                  const city = o.city_province || o.cityProvince || "Phnom Penh";
                  const itemsCount = o.items_count || o.itemsCount || 1;
                  const total = o.total_usd || o.totalUsd || 0;
                  const payStatus = o.payment_status || o.paymentStatus;
                  const status = o.status;

                  return (
                    <tr
                      key={orderNum}
                      onClick={() => setSelectedOrderNumber(orderNum)}
                      className="hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-3.5 font-bold font-mono text-neutral-900">
                        <span className="group-hover:text-[#944434] transition-colors">
                          {orderNum}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-neutral-500 whitespace-nowrap">{dateStr}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-neutral-900">{custName}</div>
                        <div className="text-[11px] text-neutral-400">{phone}</div>
                      </td>
                      <td className="px-4 py-3.5 text-neutral-600">{city}</td>
                      <td className="px-4 py-3.5 text-center text-neutral-700 font-medium">
                        <span className="inline-block px-2 py-0.5 bg-neutral-100 rounded-md font-mono text-[11px]">
                          {itemsCount}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold font-mono text-neutral-900">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-4 py-3.5">{getPaymentBadge(payStatus)}</td>
                      <td className="px-4 py-3.5">{getStatusBadge(status)}</td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 group-hover:text-[#944434] transition-colors">
                          <span>Inspect</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50/50 px-6 py-3 text-xs text-neutral-500">
          <div>
            Showing <strong className="text-neutral-800">{orders.length}</strong> of{" "}
            <strong className="text-neutral-800">{totalCount}</strong> orders
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
              disabled={offset === 0 || isLoading}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1 font-semibold text-neutral-700 disabled:opacity-40 hover:bg-neutral-50 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + pageSize)}
              disabled={offset + pageSize >= totalCount || isLoading}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1 font-semibold text-neutral-700 disabled:opacity-40 hover:bg-neutral-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Slide-Over Order Drawer */}
      <OrderDrawer
        orderNumber={selectedOrderNumber}
        onClose={() => setSelectedOrderNumber(null)}
        onStatusChanged={() => loadOrders()}
      />
    </div>
  );
}
