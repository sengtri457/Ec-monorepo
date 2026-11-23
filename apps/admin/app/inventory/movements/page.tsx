"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowLeftRight,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
import { StockMovement, StockMovementType } from "@ec/types";
import { fetchStockMovements } from "@/lib/api/inventoryApi";

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [movementType, setMovementType] = useState<string>("all");
  const [skuSearch, setSkuSearch] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const pageSize = 30;

  const loadMovements = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchStockMovements({
        movement_type: movementType,
        sku: skuSearch.trim() || undefined,
        limit: pageSize,
        offset,
      });
      setMovements(res.results || []);
      setTotalCount(res.count || 0);
    } catch (err) {
      console.error("Failed to load stock movements:", err);
    } finally {
      setIsLoading(false);
    }
  }, [movementType, skuSearch, offset]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const getMovementBadge = (type?: string) => {
    const t = (type || "").toUpperCase();
    switch (t) {
      case "RESTOCK":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
            <PlusCircle className="h-3 w-3" /> RESTOCK
          </span>
        );
      case "ADJUSTMENT":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-blue-600/20">
            <ArrowLeftRight className="h-3 w-3" /> ADJUSTMENT
          </span>
        );
      case "RETURN":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 ring-1 ring-purple-600/20">
            <RotateCcw className="h-3 w-3" /> RETURN
          </span>
        );
      case "PURCHASE":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-600/20">
            <MinusCircle className="h-3 w-3" /> PURCHASE
          </span>
        );
      case "RESERVATION":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-600/20">
            <MinusCircle className="h-3 w-3" /> RESERVATION
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            {t || "OTHER"}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Stock Inventory</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Stock Movements Audit Ledger
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Historical transaction ledger of inbound shipments, inventory adjustments, and order allocations.
          </p>
        </div>

        <button
          onClick={() => loadMovements()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by SKU..."
            value={skuSearch}
            onChange={(e) => {
              setSkuSearch(e.target.value);
              setOffset(0);
            }}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 text-xs">
          {[
            { id: "all", label: "All Movements" },
            { id: "RESTOCK", label: "Restock" },
            { id: "ADJUSTMENT", label: "Adjustment" },
            { id: "RETURN", label: "Return" },
            { id: "PURCHASE", label: "Purchase" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setMovementType(tab.id);
                setOffset(0);
              }}
              className={`rounded-md px-3 py-1.5 font-semibold transition cursor-pointer whitespace-nowrap ${
                movementType === tab.id
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Movements Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">SKU</th>
                <th className="px-4 py-3.5">Product Title</th>
                <th className="px-4 py-3.5">Movement Type</th>
                <th className="px-4 py-3.5">Quantity Change</th>
                <th className="px-4 py-3.5">Balance After</th>
                <th className="px-6 py-3.5">Reference & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
                      <span>Loading movements ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <ArrowLeftRight className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No stock movements recorded yet</p>
                    <p className="text-[11px] mt-0.5">Movements will appear here once adjustments or restocks occur.</p>
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const dateStr = new Date(m.created_at || m.createdAt || Date.now()).toLocaleString();
                  const qty = m.quantity_change ?? m.quantityChange ?? 0;
                  const balance = m.balance_after ?? m.balanceAfter ?? 0;
                  const type = m.movement_type ?? m.movementType ?? "";
                  const title = m.product_title || m.productTitle || "-";
                  const notes = m.notes || m.reference_id || m.referenceId || "Standard adjustment";

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">{dateStr}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{m.sku}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-800 max-w-xs truncate">{title}</td>
                      <td className="px-4 py-3.5">{getMovementBadge(type)}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`font-mono font-bold text-xs ${
                            qty > 0
                              ? "text-emerald-600"
                              : qty < 0
                              ? "text-rose-600"
                              : "text-slate-600"
                          }`}
                        >
                          {qty > 0 ? `+${qty}` : qty} units
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-slate-900">
                        {balance} units
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 max-w-xs truncate">
                        {notes}
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
            Showing <strong className="text-slate-800">{movements.length}</strong> of{" "}
            <strong className="text-slate-800">{totalCount}</strong> movements
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
