"use client";

import React, { useState } from "react";
import { Plus, Trash2, Wand2, Layers } from "lucide-react";
import { AdminProductVariant } from "@/lib/api/catalogApi";

interface VariantMatrixEditorProps {
  variants: AdminProductVariant[];
  onChange: (variants: AdminProductVariant[]) => void;
  basePrice?: number | string;
}

const COMMON_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free Size"];

export function VariantMatrixEditor({
  variants,
  onChange,
  basePrice,
}: VariantMatrixEditorProps) {
  const [showGenerator, setShowGenerator] = useState(false);
  const [genColor, setGenColor] = useState("Black");
  const [genColorHex, setGenColorHex] = useState("#000000");
  const [genSizes, setGenSizes] = useState<string[]>(["S", "M", "L", "XL"]);
  const [genStock, setGenStock] = useState<number>(25);
  const [genPrefix, setGenPrefix] = useState<string>("SKU");

  const handleAddRow = () => {
    const nextIndex = variants.length + 1;
    const newVariant: AdminProductVariant = {
      sku: `PROD-VAR-${nextIndex}`,
      size: "M",
      color: "Black",
      color_hex: "#000000",
      stock: 20,
      price_override: null,
      is_default: variants.length === 0,
      is_active: true,
    };
    onChange([...variants, newVariant]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = variants.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((v) => v.is_default)) {
      updated[0].is_default = true;
    }
    onChange(updated);
  };

  const handleUpdateRow = (index: number, field: keyof AdminProductVariant, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };

    // If making this row default, unmark others
    if (field === "is_default" && value === true) {
      updated.forEach((v, i) => {
        if (i !== index) v.is_default = false;
      });
    }

    onChange(updated);
  };

  const handleRunGenerator = () => {
    const generated: AdminProductVariant[] = genSizes.map((size) => {
      const sku = `${genPrefix.toUpperCase()}-${genColor.toUpperCase().slice(0, 3)}-${size}`;
      return {
        sku,
        size,
        color: genColor,
        color_hex: genColorHex,
        stock: genStock,
        price_override: null,
        is_default: false,
        is_active: true,
      };
    });

    const combined = [...variants, ...generated];
    if (combined.length > 0 && !combined.some((v) => v.is_default)) {
      combined[0].is_default = true;
    }
    onChange(combined);
    setShowGenerator(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-bold text-neutral-900">Variant Matrix</h4>
          <p className="text-xs text-neutral-500">
            Define SKU, sizing, color variants, stock allocations, and price overrides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGenerator(!showGenerator)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 transition cursor-pointer"
          >
            <Wand2 className="h-3.5 w-3.5 text-indigo-500" />
            <span>Generate Sizes</span>
          </button>
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-[#944434] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Variant</span>
          </button>
        </div>
      </div>

      {/* Quick Generator Drawer */}
      {showGenerator && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 text-xs space-y-3">
          <div className="font-bold text-indigo-950 flex items-center gap-1.5">
            <Wand2 className="h-4 w-4 text-indigo-600" />
            <span>Batch Variant Generator</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Color Name</label>
              <input
                type="text"
                value={genColor}
                onChange={(e) => setGenColor(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Color Hex</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={genColorHex}
                  onChange={(e) => setGenColorHex(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-slate-300"
                />
                <input
                  type="text"
                  value={genColorHex}
                  onChange={(e) => setGenColorHex(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs uppercase text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SKU Prefix</label>
              <input
                type="text"
                value={genPrefix}
                onChange={(e) => setGenPrefix(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Units per Size</label>
              <input
                type="number"
                value={genStock}
                onChange={(e) => setGenStock(parseInt(e.target.value) || 0)}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Included Sizes</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SIZES.map((sz) => {
                const checked = genSizes.includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      if (checked) {
                        setGenSizes(genSizes.filter((s) => s !== sz));
                      } else {
                        setGenSizes([...genSizes, sz]);
                      }
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                      checked
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-slate-700 border border-slate-200"
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-indigo-100">
            <button
              type="button"
              onClick={() => setShowGenerator(false)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleRunGenerator}
              disabled={genSizes.length === 0}
              className="rounded-md bg-indigo-600 px-4 py-1 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Generate {genSizes.length} Rows
            </button>
          </div>
        </div>
      )}

      {/* Variant Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs min-w-[700px]">
          <thead className="border-b border-neutral-200 bg-neutral-50/80 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-3 py-3">Size</th>
              <th className="px-3 py-3">Color</th>
              <th className="px-3 py-3">Hex</th>
              <th className="px-3 py-3">Stock Units</th>
              <th className="px-3 py-3">Price Override</th>
              <th className="px-3 py-3 text-center">Default</th>
              <th className="px-3 py-3 text-center">Active</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {variants.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-neutral-400">
                  <Layers className="mx-auto h-6 w-6 text-neutral-300 mb-1" />
                  <span>No variants defined. Click "Add Variant" or "Generate Sizes".</span>
                </td>
              </tr>
            ) : (
              variants.map((v, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={v.sku}
                      onChange={(e) => handleUpdateRow(idx, "sku", e.target.value)}
                      className="w-32 rounded border border-slate-200 px-2 py-1 font-mono text-xs font-semibold text-slate-900 focus:border-slate-800 focus:outline-hidden"
                      required
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={v.size || ""}
                      onChange={(e) => handleUpdateRow(idx, "size", e.target.value)}
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800"
                    >
                      <option value="">-</option>
                      {COMMON_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={v.color || ""}
                      placeholder="e.g. Black"
                      onChange={(e) => handleUpdateRow(idx, "color", e.target.value)}
                      className="w-24 rounded border border-slate-200 px-2 py-1 text-xs text-slate-800"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={v.color_hex || "#000000"}
                        onChange={(e) => handleUpdateRow(idx, "color_hex", e.target.value)}
                        className="h-6 w-7 cursor-pointer rounded border border-slate-200"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={v.stock}
                      onChange={(e) =>
                        handleUpdateRow(idx, "stock", parseInt(e.target.value) || 0)
                      }
                      className="w-20 rounded border border-slate-200 px-2 py-1 font-mono text-xs text-slate-900"
                      required
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder={basePrice ? String(basePrice) : "Base"}
                      value={v.price_override ?? ""}
                      onChange={(e) =>
                        handleUpdateRow(
                          idx,
                          "price_override",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      className="w-24 rounded border border-slate-200 px-2 py-1 text-xs text-slate-800 placeholder-slate-400"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="radio"
                      name="default_variant"
                      checked={Boolean(v.is_default)}
                      onChange={() => handleUpdateRow(idx, "is_default", true)}
                      className="h-4 w-4 cursor-pointer text-slate-900"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={v.is_active !== false}
                      onChange={(e) => handleUpdateRow(idx, "is_active", e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded text-slate-900"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
