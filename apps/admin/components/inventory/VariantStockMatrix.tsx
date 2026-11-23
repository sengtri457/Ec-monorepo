"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { AdminInventoryItem } from "@ec/types";
import { adjustStock } from "@/lib/api/inventoryApi";

interface VariantStockMatrixProps {
  items: AdminInventoryItem[];
  isLoading: boolean;
  onStockSaved: () => void;
  onOpenAdvancedAdjust: (item: AdminInventoryItem) => void;
}

export function VariantStockMatrix({
  items,
  isLoading,
  onStockSaved,
  onOpenAdvancedAdjust,
}: VariantStockMatrixProps) {
  const [savingVariantId, setSavingVariantId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  // Local state for stock inputs so user can edit freely before blur/enter
  const [localStock, setLocalStock] = useState<Record<number, number>>({});

  const getVariantStockValue = (item: AdminInventoryItem) => {
    if (localStock[item.id] !== undefined) {
      return localStock[item.id];
    }
    return item.stock;
  };

  const handleStockInputChange = (variantId: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    setLocalStock((prev) => ({
      ...prev,
      [variantId]: isNaN(val) ? 0 : Math.max(0, val),
    }));
  };

  const commitStockChange = async (item: AdminInventoryItem) => {
    const desiredStock = getVariantStockValue(item);
    const currentStock = item.stock;
    const diff = desiredStock - currentStock;

    if (diff === 0) return; // No change

    setSavingVariantId(item.id);
    setErrorMessage(null);
    setSuccessNote(null);

    try {
      await adjustStock({
        variant_id: item.id,
        quantity_change: diff,
        movement_type: diff > 0 ? "RESTOCK" : "ADJUSTMENT",
        notes: `Inline matrix stock update (${currentStock} -> ${desiredStock})`,
      });

      setSuccessNote(`Updated stock for ${item.sku} to ${desiredStock}`);
      onStockSaved();
    } catch (err: unknown) {
      console.error("Failed to commit stock change:", err);
      const msg = err instanceof Error ? err.message : "Failed to update stock.";
      setErrorMessage(`${item.sku}: ${msg}`);
      // Revert local stock to current
      setLocalStock((prev) => ({
        ...prev,
        [item.id]: currentStock,
      }));
    } finally {
      setSavingVariantId(null);
    }
  };

  const getStockBadge = (stock: number) => {
    if (stock <= 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          Out of Stock
        </span>
      );
    }
    if (stock <= 10) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          Low Stock ({stock})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        Healthy ({stock})
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
    <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-xs">
      {/* Matrix Header Banner */}
      <div className="px-5 py-3.5 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
            Variant Inventory Matrix
          </h4>
          <p className="text-xs text-neutral-500 mt-0.5">
            Edit stock levels inline. Changes commit automatically on Enter or blur.
          </p>
        </div>
        <div className="text-xs text-neutral-600 font-mono font-medium bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200">
          {items.length} Variant{items.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNote && (
        <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNote}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNote(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 font-semibold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th scope="col" className="py-3 px-5">Color & Spec</th>
              <th scope="col" className="py-3 px-4">Size</th>
              <th scope="col" className="py-3 px-4">SKU</th>
              <th scope="col" className="py-3 px-4">Product Title</th>
              <th scope="col" className="py-3 px-4">Price</th>
              <th scope="col" className="py-3 px-4 w-40">Stock Available</th>
              <th scope="col" className="py-3 px-4">Inventory Status</th>
              <th scope="col" className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-neutral-400">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-800" />
                    <span>Loading variant stock matrix...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-neutral-400">
                  <p className="font-semibold text-neutral-700">No variants match criteria</p>
                  <p className="text-[11px] mt-0.5">Try adjusting filters or search query.</p>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const title = item.product_title || item.productTitle || "Product";
                const price = item.effective_price ?? item.effectivePrice ?? 0;
                const currentVal = getVariantStockValue(item);
                const isSaving = savingVariantId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-neutral-50/70 transition-colors">
                    {/* Color swatch + name */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        {item.color_hex ? (
                          <span
                            className="w-4 h-4 rounded-full border border-neutral-300 shadow-2xs shrink-0"
                            style={{ backgroundColor: item.color_hex }}
                            title={`${item.color || "Color"} (${item.color_hex})`}
                          />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-neutral-300 bg-neutral-200 shrink-0" />
                        )}
                        <span className="font-semibold text-neutral-900 text-xs">
                          {item.color || "Standard"}
                        </span>
                      </div>
                    </td>

                    {/* Size */}
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-neutral-800">
                      <span className="bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                        {item.size || "Free"}
                      </span>
                    </td>

                    {/* SKU */}
                    <td className="py-3.5 px-4 text-neutral-600 font-mono text-xs">
                      {item.sku}
                    </td>

                    {/* Product title */}
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <div className="font-semibold text-neutral-900 truncate">{title}</div>
                      <div className="text-[11px] text-neutral-400 capitalize">
                        {item.department || "General"} &bull; {item.category_name || item.categoryName || "Apparel"}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-neutral-900">
                      {formatPrice(price)}
                    </td>

                    {/* Inline Stock input */}
                    <td className="py-3.5 px-4">
                      <div className="relative flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={currentVal}
                          disabled={isSaving}
                          onChange={(e) => handleStockInputChange(item.id, e.target.value)}
                          onBlur={() => commitStockChange(item)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className={`h-8 w-24 rounded-lg border px-2.5 font-mono text-xs text-neutral-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-colors ${
                            currentVal <= 0
                              ? "border-rose-300 bg-rose-50/30"
                              : currentVal <= 10
                              ? "border-amber-300 bg-amber-50/30"
                              : "border-neutral-300"
                          } disabled:opacity-50`}
                          aria-label={`Stock for ${item.sku}`}
                        />
                        {isSaving && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-600 shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {getStockBadge(item.stock)}
                    </td>

                    {/* Advanced Action */}
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenAdvancedAdjust(item)}
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 shadow-2xs transition cursor-pointer"
                        title="Advanced adjustment with movement log"
                      >
                        <SlidersHorizontal className="h-3 w-3 text-neutral-500" />
                        <span>Adjust</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
