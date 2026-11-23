"use client";

import React from "react";
import {
  DollarSign,
  ShoppingBag,
  Truck,
  AlertTriangle,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  valueSuffix?: string;
  icon?: "currency" | "orders" | "truck" | "alert";
  trendPercent?: number | string | null;
  trendLabel?: string;
  subtext?: string;
  loading?: boolean;
}

export function StatCard({
  title,
  value,
  valueSuffix,
  icon = "currency",
  trendPercent,
  trendLabel = "vs last month",
  subtext,
  loading = false,
}: StatCardProps) {
  const getIconContainerStyle = () => {
    switch (icon) {
      case "currency":
        return "bg-emerald-50 text-emerald-600";
      case "orders":
        return "bg-blue-50 text-blue-600";
      case "truck":
        return "bg-amber-50 text-amber-600";
      case "alert":
        return "bg-rose-50 text-rose-600";
      default:
        return "bg-neutral-100 text-neutral-600";
    }
  };

  const renderIcon = () => {
    switch (icon) {
      case "currency":
        return <DollarSign className="w-4 h-4" />;
      case "orders":
        return <ShoppingBag className="w-4 h-4" />;
      case "truck":
        return <Truck className="w-4 h-4" />;
      case "alert":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const isPositive =
    typeof trendPercent === "number"
      ? trendPercent >= 0
      : typeof trendPercent === "string"
      ? !trendPercent.startsWith("-")
      : true;

  return (
    <div className="p-5 sm:p-6 bg-white border border-neutral-200/80 rounded-2xl shadow-xs transition-all duration-200 hover:shadow-md hover:border-neutral-300/80 flex flex-col justify-between min-h-[148px]">
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 bg-neutral-200 rounded" />
            <div className="h-8 w-8 bg-neutral-200 rounded-full" />
          </div>
          <div className="h-7 w-32 bg-neutral-200 rounded" />
          <div className="h-3 w-28 bg-neutral-200 rounded" />
        </div>
      ) : (
        <div>
          {/* Top Row: Title & Styled Circular Icon Badge */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 truncate">
              {title}
            </p>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 ${getIconContainerStyle()}`}
            >
              {renderIcon()}
            </div>
          </div>

          {/* Metric Value & Trend Row */}
          <div className="flex items-baseline flex-wrap gap-2 mt-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 font-sans">
              {value}
              {valueSuffix && (
                <span className="text-base font-semibold text-neutral-700 ml-1">
                  {valueSuffix}
                </span>
              )}
            </span>

            {trendPercent !== undefined && trendPercent !== null && (
              <span
                className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
                  isPositive
                    ? "text-emerald-700 bg-emerald-50"
                    : "text-rose-700 bg-rose-50"
                }`}
              >
                {typeof trendPercent === "number" && trendPercent > 0 ? "+" : ""}
                {trendPercent}%
              </span>
            )}
          </div>

          {/* Bottom Subtext / Target Status */}
          <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 font-medium gap-2">
            {subtext && <span className="truncate">{subtext}</span>}
            {trendPercent !== undefined && trendPercent !== null && (
              <span className="text-[10px] text-neutral-400 shrink-0">
                {trendLabel}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
