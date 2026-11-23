"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingBag,
  PackageCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Boxes,
  PlusCircle,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
} from "lucide-react";
import { adminApiClient } from "@/lib/adminApiClient";
import { AdminDashboardStats, AdminInventoryItem, AdminOrderSummary } from "@ec/types";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [lowStockItems, setLowStockItems] = useState<AdminInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const [statsData, inventoryData] = await Promise.all([
        adminApiClient<AdminDashboardStats>("/orders/admin/stats/"),
        adminApiClient<{ count: number; results: AdminInventoryItem[] }>(
          "/inventory/admin/?status=low&limit=5"
        ),
      ]);

      setStats(statsData);
      setLowStockItems(inventoryData.results || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard metrics.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

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

  const revenue = stats?.total_revenue ?? stats?.totalRevenue ?? 0;
  const totalOrders = stats?.total_orders ?? stats?.totalOrders ?? 0;
  const pendingFulfillment = stats?.pending_fulfillment_count ?? stats?.pendingFulfillmentCount ?? 0;
  const dispatchedCount = stats?.dispatched_count ?? stats?.dispatchedCount ?? 0;
  const recentOrders: AdminOrderSummary[] = stats?.recent_orders || stats?.recentOrders || [];

  return (
    <div className="space-y-8">
      {/* Page Heading & Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Operations Overview
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Real-time aggregate telemetry across orders, fulfillment queue, and inventory stock.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-slate-900" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>New Product</span>
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-800">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>Telemetry Fetch Warning</span>
          </div>
          <p className="mt-1 text-rose-700">{errorMessage}</p>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Revenue */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Gross Paid Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {isLoading ? "..." : formatCurrency(revenue)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Aggregate settled payments across store
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Orders Placed</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {isLoading ? "..." : totalOrders}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Dispatched en route:</span>
              <span className="font-semibold text-slate-700">{dispatchedCount}</span>
            </div>
          </div>
        </div>

        {/* Pending Fulfillment */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Fulfillment</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <PackageCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {isLoading ? "..." : pendingFulfillment}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Confirmed & processing orders waiting delivery
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Low Stock Variants</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {isLoading ? "..." : lowStockItems.length}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Stock &le; 10 units</span>
              <Link
                href="/inventory"
                className="font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-0.5"
              >
                Inspect <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections: Recent Orders & Stock Watchlist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders Queue (2 Columns) */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Customer Orders</h2>
              <p className="text-[11px] text-slate-500">Latest checkout submissions from storefront</p>
            </div>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Order #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                        <span>Loading orders...</span>
                      </div>
                    </td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      No customer orders placed yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => {
                    const orderNum = order.order_number || order.orderNumber || order.id;
                    const custName = order.customer_name || order.customerName || "Customer";
                    const orderDate = new Date(order.created_at || order.createdAt || Date.now()).toLocaleDateString();
                    const itemsCt = order.items_count || order.itemsCount || 1;
                    const total = order.total_usd || order.totalUsd || 0;
                    const payStatus = order.payment_status || order.paymentStatus;
                    const fulfillStatus = order.status;

                    return (
                      <tr key={orderNum} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900">
                          <Link href={`/orders/${orderNum}`} className="hover:underline">
                            {orderNum}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 font-medium">{custName}</td>
                        <td className="px-4 py-3.5 text-slate-500">{orderDate}</td>
                        <td className="px-4 py-3.5 text-slate-600">{itemsCt}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900">
                          {formatCurrency(total)}
                        </td>
                        <td className="px-4 py-3.5">{getPaymentBadge(payStatus)}</td>
                        <td className="px-4 py-3.5">{getStatusBadge(fulfillStatus)}</td>
                        <td className="px-6 py-3.5 text-right">
                          <Link
                            href={`/orders/${orderNum}`}
                            className="font-semibold text-slate-900 hover:text-slate-600 underline text-xs"
                          >
                            Inspect
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Watchlist (1 Column) */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Stock Watchlist</h2>
              <p className="text-[11px] text-slate-500">Items nearing replenishment threshold</p>
            </div>
            <Link
              href="/inventory"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 p-2">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Checking inventory levels...
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="py-12 text-center">
                <Boxes className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Healthy Stock Levels</p>
                <p className="text-[11px] text-slate-400 mt-1">No items currently below threshold.</p>
              </div>
            ) : (
              lowStockItems.map((item) => {
                const title = item.product_title || item.productTitle || "Product";
                const sku = item.sku;
                const stock = item.stock;
                const size = item.size;
                const color = item.color;

                return (
                  <div key={item.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="truncate text-xs font-bold text-slate-900">{title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="font-mono text-slate-600">{sku}</span>
                        {(size || color) && (
                          <span>
                            • {size} {color ? `/ ${color}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                          stock === 0
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {stock} left
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/50 p-3 text-center">
            <Link
              href="/inventory"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              <Boxes className="h-3.5 w-3.5" />
              <span>Full Stock Inventory Table</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
