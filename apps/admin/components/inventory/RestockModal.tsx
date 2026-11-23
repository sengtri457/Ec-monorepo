"use client";

import React, { useState, useEffect } from "react";
import { X, Boxes, AlertCircle, ArrowRight } from "lucide-react";
import { AdminInventoryItem } from "@ec/types";
import { adjustStock, StockAdjustmentPayload } from "@/lib/api/inventoryApi";

interface RestockModalProps {
  item: AdminInventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RestockModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: RestockModalProps) {
  const [movementType, setMovementType] = useState<StockAdjustmentPayload["movement_type"]>("RESTOCK");
  const [quantity, setQuantity] = useState<number>(10);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setMovementType("RESTOCK");
      setQuantity(10);
      setNotes("");
      setErrorMessage(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const currentStock = item.stock;
  // Calculate delta: RESTOCK/RETURN/RELEASE add, RESERVATION removes, ADJUSTMENT can be + or -
  const delta = movementType === "RESERVATION" ? -Math.abs(quantity) : quantity;
  const projectedBalance = currentStock + delta;

  const handleQuickAdd = (amt: number) => {
    setQuantity(amt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity === 0) {
      setErrorMessage("Quantity change cannot be zero.");
      return;
    }
    if (projectedBalance < 0) {
      setErrorMessage("Adjusted balance cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await adjustStock({
        variant_id: item.id,
        quantity_change: delta,
        movement_type: movementType,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record stock movement.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-900/10">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Adjust Inventory Stock</h3>
              <p className="text-xs text-slate-500">
                SKU: <span className="font-mono font-semibold text-slate-700">{item.sku}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Target Variant Banner */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="font-bold text-slate-800 text-sm">{item.product_title || item.productTitle}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-slate-500">
              {item.size && <span>Size: <strong>{item.size}</strong></span>}
              {item.color && (
                <span className="flex items-center gap-1">
                  Color: <strong>{item.color}</strong>
                  {item.color_hex && (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full border border-slate-300"
                      style={{ backgroundColor: item.color_hex }}
                    />
                  )}
                </span>
              )}
              <span>• Current Units: <strong className="text-slate-900">{currentStock}</strong></span>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Movement Type */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Movement Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: "RESTOCK", label: "Restock (+)", desc: "Warehouse Delivery" },
                { type: "ADJUSTMENT", label: "Adjustment (±)", desc: "Audit Recount" },
                { type: "RETURN", label: "Return (+)", desc: "Customer Return" },
              ].map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setMovementType(opt.type as any)}
                  className={`rounded-lg border p-2 text-left transition cursor-pointer ${
                    movementType === opt.type
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold text-xs">{opt.label}</div>
                  <div className={`text-[10px] ${movementType === opt.type ? "text-slate-300" : "text-slate-400"}`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Change Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700">Quantity Delta</label>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400">Quick:</span>
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAdd(amt)}
                    className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="number"
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-slate-800 focus:outline-hidden"
              required
            />
          </div>

          {/* Audit Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Audit Note / Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Supplier invoice PO-9284 / physical recount"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-slate-800 focus:outline-hidden"
            />
          </div>

          {/* Stock Preview Balance */}
          <div className="flex items-center justify-between rounded-xl bg-slate-100/80 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Current: {currentStock}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-bold text-slate-900">
                Projected Balance: {projectedBalance} units
              </span>
            </div>
            <span
              className={`rounded px-2 py-0.5 font-bold text-[11px] ${
                delta >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}
            >
              {delta >= 0 ? `+${delta}` : delta}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 font-semibold text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  <span>Committing...</span>
                </>
              ) : (
                <span>Save Stock Movement</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
