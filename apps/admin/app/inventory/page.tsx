"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Boxes,
  Search,
  History,
  RefreshCw,
} from "lucide-react";
import { AdminInventoryItem } from "@ec/types";
import { fetchInventory } from "@/lib/api/inventoryApi";
import { RestockModal } from "@/components/inventory/RestockModal";
import { VariantStockMatrix } from "@/components/inventory/VariantStockMatrix";

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

  const tabs = [
    { id: "all", label: "All Variants" },
    { id: "low", label: "Low Stock (<10)" },
    { id: "out", label: "Out of Stock" },
    { id: "healthy", label: "Healthy" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Stock & Inventory Matrix
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Manage variant warehouse stock levels, replenish shortages, and inline-edit allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/inventory/movements"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 transition"
          >
            <History className="h-3.5 w-3.5 text-neutral-500" />
            <span>Audit Movements</span>
          </Link>
          <button
            onClick={() => loadData()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync Matrix</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search SKU or product title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageOffset(0);
              }}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 pl-9 pr-4 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:border-neutral-900 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Boxes className="w-4 h-4 text-neutral-400" />
            <span>Total Catalog SKUs: <strong className="text-neutral-800 font-mono">{totalCount}</strong></span>
          </div>
        </div>

        {/* Clean Underline Status Filter Tabs */}
        <div className="border-b border-neutral-200 -mb-1 pt-1">
          <nav className="flex space-x-2 overflow-x-auto pb-px" aria-label="Stock Status Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPageOffset(0);
                }}
                className={`whitespace-nowrap px-4 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  statusFilter === tab.id
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

      {/* Variant Stock Matrix with Inline Editing */}
      <VariantStockMatrix
        items={items}
        isLoading={isLoading}
        onStockSaved={() => loadData()}
        onOpenAdvancedAdjust={handleOpenRestock}
      />

      {/* Pagination Footer */}
      <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-6 py-3.5 text-xs text-neutral-500 shadow-xs">
        <div>
          Showing <strong className="text-neutral-800">{items.length}</strong> of{" "}
          <strong className="text-neutral-800">{totalCount}</strong> variants
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageOffset(Math.max(0, pageOffset - pageSize))}
            disabled={pageOffset === 0 || isLoading}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1 font-semibold text-neutral-700 disabled:opacity-40 hover:bg-neutral-50 cursor-pointer"
          >
            Previous
          </button>
          <button
            onClick={() => setPageOffset(pageOffset + pageSize)}
            disabled={pageOffset + pageSize >= totalCount || isLoading}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1 font-semibold text-neutral-700 disabled:opacity-40 hover:bg-neutral-50 cursor-pointer"
          >
            Next
          </button>
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
