"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Boxes,
  Search,
  Filter,
  ArrowUpDown,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
} from "lucide-react";
import { AdminInventoryItem } from "@ec/types";
import { fetchInventory } from "@/lib/api/inventoryApi";
import { RestockModal } from "@/components/inventory/RestockModal";

export default function InventoryPage() {
  const [items, setItems] = useState<AdminInventoryItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pageOffset, setPageOffset] = useState(0);
  const pageSize = 25;

  const [selectedItem, setSelectedItem] = useState<AdminInventoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchInventory({
        status: statusFilter,
        search: search.trim() || undefined,
        limit: pageSize,
        offset: pageOffset,
      });
      setItems(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search, pageOffset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenRestock = (item: AdminInventoryItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const getStockBadge = (stock: number) => {
    if (stock <= 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20">
          <XCircle className="h-3 w-3" /> Out of Stock
        </span>
      );
    }
    if (stock <= 10) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
          <AlertTriangle className="h-3 w-3" /> Low Stock ({stock})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        <CheckCircle2 className="h-3 w-3" /> Healthy ({stock})
      </span>
    );
  };

  const formatPrice = (p?: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(p || 0);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Stock & Inventory
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Manage variant warehouse stock levels, replenish shortages, and audit item status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/inventory/movements"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <History className="h-3.5 w-3.5 text-slate-500" />
            <span>Audit Movements</span>
          </Link>
          <button
            onClick={() => loadData()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU or product title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPageOffset(0);
            }}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:bg-white focus:outline-hidden"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 text-xs">
          {[
            { id: "all", label: "All Items" },
            { id: "low", label: "Low Stock" },
            { id: "out", label: "Out of Stock" },
            { id: "healthy", label: "Healthy" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPageOffset(0);
              }}
              className={`rounded-md px-3 py-1.5 font-semibold transition cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">SKU</th>
                <th className="px-4 py-3.5">Product</th>
                <th className="px-4 py-3.5">Variant Spec</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5">Price</th>
                <th className="px-4 py-3.5">Stock Status</th>
                <th className="px-6 py-3.5 text-right">Quick Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                      <span>Loading stock records...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Boxes className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No inventory records found</p>
                    <p className="text-[11px] mt-0.5">Try adjusting your search or active filter.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const title = item.product_title || item.productTitle || "Product";
                  const price = item.effective_price ?? item.effectivePrice ?? 0;
                  const stock = item.stock;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-slate-900">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{title}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.category_name || item.categoryName || "Apparel"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 text-slate-700">
                          {item.size && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-[11px]">
                              {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="flex items-center gap-1 text-[11px]">
                              {item.color_hex && (
                                <span
                                  className="h-2.5 w-2.5 rounded-full border border-slate-300 shrink-0"
                                  style={{ backgroundColor: item.color_hex }}
                                />
                              )}
                              <span>{item.color}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 capitalize text-slate-600 font-medium">
                        {item.department || "General"}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">
                        {formatPrice(price)}
                      </td>
                      <td className="px-4 py-3.5">
                        {getStockBadge(stock)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => handleOpenRestock(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Adjust Stock</span>
                        </button>
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
            Showing <strong className="text-slate-800">{items.length}</strong> of{" "}
            <strong className="text-slate-800">{totalCount}</strong> variants
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPageOffset(Math.max(0, pageOffset - pageSize))}
              disabled={pageOffset === 0 || isLoading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setPageOffset(pageOffset + pageSize)}
              disabled={pageOffset + pageSize >= totalCount || isLoading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Restock Adjustment Modal */}
      <RestockModal
        isOpen={isModalOpen}
        item={selectedItem}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
