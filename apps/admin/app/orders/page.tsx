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
  ArrowRight,
} from "lucide-react";
import { AdminOrderSummary } from "@ec/types";
import { fetchAdminOrders } from "@/lib/api/ordersApi";

export default function AdminOrdersQueuePage() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [offset, setOffset] = useState<number>(0);
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
        <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
          PAID
        </span>
      );
    }
    if (s === "FAILED") {
      return (
        <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-600/20">
          FAILED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-600/20">
        PENDING
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Orders & Fulfillment
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Monitor, inspect, and advance customer orders through fulfillment stages.
          </p>
        </div>

        <button
          onClick={() => loadOrders()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Sync Orders</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order #, Customer, Phone, or Email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setOffset(0);
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-slate-800 focus:outline-hidden"
            >
              <option value="ALL">All Payment States</option>
              <option value="PAID">Paid Only</option>
              <option value="PENDING">Pending Payment</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Fulfillment Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-3 text-xs">
          {[
            { id: "ALL", label: "All Orders" },
            { id: "PENDING", label: "Pending" },
            { id: "CONFIRMED", label: "Confirmed" },
            { id: "PROCESSING", label: "Processing" },
            { id: "SHIPPED", label: "Shipped" },
            { id: "DELIVERED", label: "Delivered" },
            { id: "CANCELLED", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusTab(tab.id);
                setOffset(0);
              }}
              className={`rounded-lg px-3 py-1.5 font-semibold transition cursor-pointer whitespace-nowrap ${
                statusTab === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Order Number</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Destination</th>
                <th className="px-4 py-3.5">Items</th>
                <th className="px-4 py-3.5">Total Amount</th>
                <th className="px-4 py-3.5">Payment</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                      <span>Loading orders queue...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    <ShoppingBag className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No orders match filter criteria</p>
                    <p className="text-[11px] mt-0.5">Try resetting search query or status tab.</p>
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
                    <tr key={orderNum} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-3.5 font-bold font-mono text-slate-900">
                        <Link href={`/orders/${orderNum}`} className="hover:underline">
                          {orderNum}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{dateStr}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{custName}</div>
                        <div className="text-[11px] text-slate-400">{phone}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{city}</td>
                      <td className="px-4 py-3.5 text-slate-700 font-medium">{itemsCount}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">{formatCurrency(total)}</td>
                      <td className="px-4 py-3.5">{getPaymentBadge(payStatus)}</td>
                      <td className="px-4 py-3.5">{getStatusBadge(status)}</td>
                      <td className="px-6 py-3.5 text-right">
                        <Link
                          href={`/orders/${orderNum}`}
                          className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-slate-600 underline text-xs"
                        >
                          <span>Manage</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-3 text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{orders.length}</strong> of{" "}
            <strong className="text-slate-800">{totalCount}</strong> orders
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - pageSize))}
              disabled={offset === 0 || isLoading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + pageSize)}
              disabled={offset + pageSize >= totalCount || isLoading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
