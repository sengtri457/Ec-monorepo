"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Boxes,
  Truck,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { adminApiClient } from "@/lib/adminApiClient";
import { AdminDashboardStats, AdminInventoryItem, AdminOrderSummary } from "@ec/types";
import { StatCard } from "@/components/dashboard/StatCard";
import { SalesTrajectoryChart } from "@/components/dashboard/SalesTrajectoryChart";
import { ProductThumbnail } from "@/components/ui/ProductThumbnail";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [lowStockItems, setLowStockItems] = useState<AdminInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  const toggleProductExpand = (productKey: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productKey]: !prev[productKey],
    }));
  };

  const groupedCriticalStock = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        productTitle: string;
        thumbnail?: string;
        categoryName?: string;
        totalStock: number;
        outOfStockCount: number;
        variants: AdminInventoryItem[];
      }
    >();

    lowStockItems.forEach((item) => {
      const title = item.product_title || item.productTitle || "Apparel Item";
      const key = String(item.product_id || item.productId || title);

      if (!map.has(key)) {
        map.set(key, {
          key,
          productTitle: title,
          thumbnail: item.thumbnail,
          categoryName: item.category_name || item.categoryName,
          totalStock: 0,
          outOfStockCount: 0,
          variants: [],
        });
      }

      const group = map.get(key)!;
      group.totalStock += item.stock;
      if (item.stock === 0) {
        group.outOfStockCount += 1;
      }
      group.variants.push(item);
    });

    return Array.from(map.values());
  }, [lowStockItems]);

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
          "/inventory/admin/?status=low&limit=20"
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
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <CheckCircle2 className="h-3 w-3" /> Delivered
          </span>
        );
      case "SHIPPED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <Truck className="h-3 w-3" /> Shipped
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
            <Clock className="h-3 w-3" /> Processing
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
            <CheckCircle2 className="h-3 w-3" /> Confirmed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
            <RotateCcw className="h-3 w-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <Clock className="h-3 w-3" /> Pending
          </span>
        );
    }
  };

  const getPaymentBadge = (status?: string) => {
    const s = (status || "PENDING").toUpperCase();
    if (s === "PAID") {
      return (
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
          PAID
        </span>
      );
    }
    if (s === "FAILED") {
      return (
        <span className="inline-flex items-center rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-600/20">
          FAILED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-600/20">
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
    <div className="space-y-8 w-full pb-10">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Operations Control Center
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Real-time revenue telemetry, fulfillment queue, and inventory stock monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            title="Refresh Dashboard Metrics"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-neutral-500 ${
                isRefreshing ? "animate-spin text-neutral-900" : ""
              }`}
            />
            <span>Refresh</span>
          </button>
          <Link
            href="/dispatch"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#944434] hover:bg-[#7E3729] rounded-xl shadow-xs cursor-pointer transition-colors"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Dispatch Hub</span>
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 shadow-xs">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>Telemetry Fetch Warning</span>
          </div>
          <p className="mt-1 text-rose-700">{errorMessage}</p>
        </div>
      )}

      {/* Stat Cards Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Sales (MTD)"
          value={isLoading ? "..." : formatCurrency(revenue)}
          trendPercent={5.8}
          trendLabel="vs last month"
          subtext="Target reached: 92.4% of goal"
          icon="currency"
          loading={isLoading}
        />

        <StatCard
          title="Total Orders Placed"
          value={isLoading ? "..." : totalOrders}
          subtext={`En route dispatched: ${dispatchedCount}`}
          icon="orders"
          loading={isLoading}
        />

        <StatCard
          title="Pending Fulfillment"
          value={isLoading ? "..." : pendingFulfillment}
          trendPercent={pendingFulfillment > 10 ? -pendingFulfillment : null}
          trendLabel="Needs Packing"
          subtext="Confirmed orders ready to ship"
          icon="truck"
          loading={isLoading}
        />

        <StatCard
          title="Low Stock Alerts"
          value={isLoading ? "..." : lowStockItems.length}
          trendPercent={lowStockItems.length > 0 ? lowStockItems.length : null}
          trendLabel="Action Req."
          subtext="Variants with &le; 10 units"
          icon="alert"
          loading={isLoading}
        />
      </div>

      {/* Sales & Demand Trajectory Analytics Chart */}
      <SalesTrajectoryChart />

      {/* Main Grid: Recent Orders Feed & Critical Stock Watchlist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders Queue (2 Columns) */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-xs lg:col-span-2 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-200/70 px-6 py-4 bg-neutral-50/40">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Recent Customer Orders</h2>
              <p className="text-[11px] text-neutral-500">Live checkout telemetry from storefront</p>
            </div>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#944434] hover:text-[#7E3729] transition"
            >
              <span>View All Orders</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="border-b border-neutral-200/70 bg-neutral-50 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-6 py-3.5">Order #</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Items</th>
                  <th className="px-4 py-3.5">Amount</th>
                  <th className="px-4 py-3.5">Payment</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-neutral-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-800" />
                        <span>Loading orders queue...</span>
                      </div>
                    </td>
                  </tr>
                ) : recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-neutral-400">
                      No customer orders placed yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => {
                    const orderNum = order.order_number || order.orderNumber || order.id;
                    const custName = order.customer_name || order.customerName || "Customer";
                    const dateVal = order.created_at || order.createdAt;
                    const orderDate = dateVal ? new Date(dateVal).toLocaleDateString() : "-";
                    const itemsCt = order.items_count || order.itemsCount || 1;
                    const total = order.total_usd || order.totalUsd || 0;
                    const payStatus = order.payment_status || order.paymentStatus;
                    const fulfillStatus = order.status;

                    return (
                      <tr key={orderNum} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="px-6 py-3.5 font-bold font-mono text-neutral-900">
                          <Link href={`/orders/${orderNum}`} className="hover:underline">
                            {orderNum}
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-neutral-700 font-medium">{custName}</td>
                        <td className="px-4 py-3.5 text-neutral-500 whitespace-nowrap">{orderDate}</td>
                        <td className="px-4 py-3.5 text-neutral-600 font-mono">{itemsCt}</td>
                        <td className="px-4 py-3.5 font-semibold text-neutral-900 font-mono">
                          {formatCurrency(total)}
                        </td>
                        <td className="px-4 py-3.5">{getPaymentBadge(payStatus)}</td>
                        <td className="px-4 py-3.5">{getStatusBadge(fulfillStatus)}</td>
                        <td className="px-6 py-3.5 text-right">
                          <Link
                            href={`/orders/${orderNum}`}
                            className="font-semibold text-[#944434] hover:text-[#7E3729] underline text-xs"
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
        <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-xs min-w-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-200/70 px-6 py-4 bg-neutral-50/40">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-neutral-900">Critical Stock</h2>
                  {groupedCriticalStock.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {groupedCriticalStock.length} {groupedCriticalStock.length === 1 ? "Product" : "Products"}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500">Variants nearing replenishment</p>
              </div>
              <div className="flex items-center gap-2.5">
                {groupedCriticalStock.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const allExpanded = groupedCriticalStock.every((g) => expandedProducts[g.key]);
                      const nextState: Record<string, boolean> = {};
                      groupedCriticalStock.forEach((g) => {
                        nextState[g.key] = !allExpanded;
                      });
                      setExpandedProducts(nextState);
                    }}
                    className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 cursor-pointer"
                  >
                    {groupedCriticalStock.every((g) => expandedProducts[g.key]) ? "Collapse All" : "Expand All"}
                  </button>
                )}
                <Link
                  href="/inventory"
                  className="text-xs font-semibold text-[#944434] hover:text-[#7E3729] flex items-center gap-1"
                >
                  <span>Manage</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            <div className="p-3 space-y-2">
              {isLoading ? (
                <div className="py-12 text-center text-xs text-neutral-400">
                  Checking inventory levels...
                </div>
              ) : groupedCriticalStock.length === 0 ? (
                <div className="py-12 text-center">
                  <Boxes className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                  <p className="text-xs font-semibold text-neutral-700">Healthy Stock Levels</p>
                  <p className="text-[11px] text-neutral-400 mt-1">No items currently below threshold.</p>
                </div>
              ) : (
                groupedCriticalStock.map((group) => {
                  const isExpanded = !!expandedProducts[group.key];
                  const variantCount = group.variants.length;

                  return (
                    <div
                      key={group.key}
                      className="overflow-hidden rounded-xl border border-neutral-200/80 bg-white transition-all hover:border-neutral-300"
                    >
                      {/* Product Header (Clickable Accordion) */}
                      <button
                        type="button"
                        onClick={() => toggleProductExpand(group.key)}
                        className="w-full text-left p-3 flex items-center justify-between gap-3 hover:bg-neutral-50/80 transition-colors cursor-pointer select-none"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 transition-colors">
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </div>
                          {group.thumbnail && (
                            <ProductThumbnail
                              src={group.thumbnail}
                              alt={group.productTitle}
                              className="h-7 w-7 rounded-md object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                              fallbackClassName="hidden"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="truncate text-xs font-bold text-neutral-900">
                                {group.productTitle}
                              </p>
                              {group.outOfStockCount > 0 && (
                                <span className="shrink-0 rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 ring-1 ring-rose-600/20">
                                  {group.outOfStockCount} OOS
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-neutral-500">
                              <span className="font-medium text-neutral-600">
                                {variantCount} {variantCount === 1 ? "size/variant" : "sizes/variants"} low
                              </span>
                              {group.categoryName && (
                                <>
                                  <span>•</span>
                                  <span>{group.categoryName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold font-mono ${
                              group.totalStock === 0
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {group.totalStock} units
                          </span>
                        </div>
                      </button>

                      {/* Collapsible Variants List */}
                      {isExpanded && (
                        <div className="border-t border-neutral-100 bg-neutral-50/60 p-2.5 space-y-1.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 px-1">
                            Low Stock Sizes &amp; Variants
                          </div>
                          <div className="divide-y divide-neutral-200/60 rounded-lg border border-neutral-200/70 bg-white overflow-hidden">
                            {group.variants.map((v) => {
                              const sku = v.sku;
                              const size = v.size;
                              const color = v.color;
                              const colorHex = v.color_hex || v.colorHex;
                              const stock = v.stock;

                              return (
                                <div
                                  key={v.id}
                                  className="flex items-center justify-between px-3 py-2 text-xs hover:bg-neutral-50/60 transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    {size ? (
                                      <span className="inline-flex items-center rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-neutral-800 border border-neutral-200">
                                        {size}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-neutral-400">Std</span>
                                    )}

                                    {color && (
                                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 truncate">
                                        {colorHex && (
                                          <span
                                            className="inline-block h-2.5 w-2.5 rounded-full border border-black/10 shrink-0"
                                            style={{ backgroundColor: colorHex }}
                                            title={color}
                                          />
                                        )}
                                        <span className="truncate">{color}</span>
                                      </div>
                                    )}

                                    <span className="font-mono text-[10px] text-neutral-400 truncate">
                                      {sku}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span
                                      className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                                        stock === 0
                                          ? "bg-rose-100 text-rose-800"
                                          : "bg-amber-100 text-amber-800"
                                      }`}
                                    >
                                      {stock} left
                                    </span>
                                    <Link
                                      href={`/inventory?search=${encodeURIComponent(sku)}`}
                                      className="text-[10px] font-semibold text-[#944434] hover:underline"
                                    >
                                      Restock
                                    </Link>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t border-neutral-100 bg-neutral-50/60 p-3 text-center">
            <Link
              href="/inventory"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900"
            >
              <Boxes className="h-3.5 w-3.5 text-neutral-500" />
              <span>Full Stock Inventory Table</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
