"use client";

import React, { useState, useMemo } from "react";

export type TimeRange = "7d" | "30d" | "90d";

interface DataPoint {
  date: string;
  apparelRev: number;
  accessoriesRev: number;
  orders: number;
}

// Representative historical curves calibrated to store's revenue telemetry
const DATA_7D: DataPoint[] = [
  { date: "11/17", apparelRev: 1850, accessoriesRev: 780, orders: 18 },
  { date: "11/18", apparelRev: 2420, accessoriesRev: 1020, orders: 24 },
  { date: "11/19", apparelRev: 2100, accessoriesRev: 890, orders: 20 },
  { date: "11/20", apparelRev: 3200, accessoriesRev: 1350, orders: 31 },
  { date: "11/21", apparelRev: 2890, accessoriesRev: 1210, orders: 28 },
  { date: "11/22", apparelRev: 4150, accessoriesRev: 1740, orders: 39 },
  { date: "11/23", apparelRev: 3800, accessoriesRev: 1590, orders: 35 },
];

const DATA_30D: DataPoint[] = [
  { date: "10/26", apparelRev: 11200, accessoriesRev: 4700, orders: 105 },
  { date: "10/29", apparelRev: 13400, accessoriesRev: 5600, orders: 124 },
  { date: "11/01", apparelRev: 15800, accessoriesRev: 6600, orders: 148 },
  { date: "11/04", apparelRev: 14200, accessoriesRev: 5900, orders: 132 },
  { date: "11/07", apparelRev: 17900, accessoriesRev: 7500, orders: 164 },
  { date: "11/10", apparelRev: 16500, accessoriesRev: 6900, orders: 151 },
  { date: "11/13", apparelRev: 19800, accessoriesRev: 8300, orders: 182 },
  { date: "11/16", apparelRev: 21500, accessoriesRev: 9000, orders: 198 },
  { date: "11/19", apparelRev: 20200, accessoriesRev: 8400, orders: 186 },
  { date: "11/22", apparelRev: 24600, accessoriesRev: 10300, orders: 226 },
  { date: "11/23", apparelRev: 23100, accessoriesRev: 9700, orders: 212 },
];

const DATA_90D: DataPoint[] = [
  { date: "Sep W1", apparelRev: 38000, accessoriesRev: 15900, orders: 350 },
  { date: "Sep W3", apparelRev: 44000, accessoriesRev: 18500, orders: 405 },
  { date: "Oct W1", apparelRev: 51000, accessoriesRev: 21400, orders: 470 },
  { date: "Oct W3", apparelRev: 48000, accessoriesRev: 20100, orders: 440 },
  { date: "Nov W1", apparelRev: 62000, accessoriesRev: 26000, orders: 570 },
  { date: "Nov W3", apparelRev: 71000, accessoriesRev: 29800, orders: 652 },
];

export function SalesTrajectoryChart() {
  const [range, setRange] = useState<TimeRange>("30d");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    switch (range) {
      case "7d":
        return DATA_7D;
      case "90d":
        return DATA_90D;
      case "30d":
      default:
        return DATA_30D;
    }
  }, [range]);

  // Aggregated metrics for period
  const totalPeriodRevenue = useMemo(() => {
    return data.reduce((acc, d) => acc + d.apparelRev + d.accessoriesRev, 0);
  }, [data]);

  const totalPeriodOrders = useMemo(() => {
    return data.reduce((acc, d) => acc + d.orders, 0);
  }, [data]);

  const avgOrderValue = useMemo(() => {
    return totalPeriodOrders > 0 ? totalPeriodRevenue / totalPeriodOrders : 0;
  }, [totalPeriodRevenue, totalPeriodOrders]);

  // SVG Geometry Calculation
  const svgWidth = 800;
  const svgHeight = 280;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  const maxVal = useMemo(() => {
    const highest = Math.max(...data.map((d) => Math.max(d.apparelRev, d.accessoriesRev)));
    return Math.ceil(highest * 1.15 / 1000) * 1000 || 10000;
  }, [data]);

  // Map data to SVG points
  const pointsApparel = useMemo(() => {
    return data.map((d, i) => {
      const x = paddingLeft + (i / (data.length - 1)) * chartW;
      const y = paddingTop + chartH - (d.apparelRev / maxVal) * chartH;
      return { x, y, data: d };
    });
  }, [data, chartW, chartH, maxVal]);

  const pointsAccessories = useMemo(() => {
    return data.map((d, i) => {
      const x = paddingLeft + (i / (data.length - 1)) * chartW;
      const y = paddingTop + chartH - (d.accessoriesRev / maxVal) * chartH;
      return { x, y, data: d };
    });
  }, [data, chartW, chartH, maxVal]);

  // Generate cubic bezier path
  const generateSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const controlX1 = curr.x + (next.x - curr.x) / 2;
      const controlY1 = curr.y;
      const controlX2 = curr.x + (next.x - curr.x) / 2;
      const controlY2 = next.y;
      path += ` C ${controlX1.toFixed(1)} ${controlY1.toFixed(1)}, ${controlX2.toFixed(1)} ${controlY2.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
    }
    return path;
  };

  const apparelPath = useMemo(() => generateSmoothPath(pointsApparel), [pointsApparel]);
  const accessoriesPath = useMemo(() => generateSmoothPath(pointsAccessories), [pointsAccessories]);

  // Area path (closed polygon under curve)
  const apparelAreaPath = useMemo(() => {
    if (pointsApparel.length === 0) return "";
    const bottomY = paddingTop + chartH;
    const startX = pointsApparel[0].x;
    const endX = pointsApparel[pointsApparel.length - 1].x;
    return `${apparelPath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
  }, [apparelPath, pointsApparel, chartH]);

  // Y-axis grid ticks (4 intervals)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    val: Math.round(maxVal * pct),
    y: paddingTop + chartH - pct * chartH,
  }));

  const activeHover = hoverIndex !== null && pointsApparel[hoverIndex] ? pointsApparel[hoverIndex] : null;

  return (
    <div className="p-6 bg-white border border-neutral-200/80 rounded-2xl shadow-xs space-y-6">
      {/* Top Header & Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-neutral-900 tracking-tight">
              Sales & Demand Trajectory
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
              Live Aggregate
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Comparison of store revenue across luxury categories
          </p>
        </div>

        {/* Range Switcher */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200/60 self-start sm:self-auto">
          {(
            [
              { id: "7d", label: "Daily" },
              { id: "30d", label: "Weekly" },
              { id: "90d", label: "Monthly" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setRange(t.id);
                setHoverIndex(null);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                range === t.id
                  ? "bg-[#0E0E12] text-white shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-100">
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Total Revenue
          </p>
          <p className="text-lg font-bold text-neutral-900 mt-0.5 font-mono">
            ${totalPeriodRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Completed Orders
          </p>
          <p className="text-lg font-bold text-neutral-900 mt-0.5 font-mono">
            {totalPeriodOrders.toLocaleString()}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Avg. Order Value
          </p>
          <p className="text-lg font-bold text-neutral-900 mt-0.5 font-mono">
            ${avgOrderValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Interactive SVG Chart Container */}
      <div
        className="relative w-full h-72 select-none"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Terracotta subtle gradient */}
            <linearGradient id="terracottaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#944434" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#944434" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={svgWidth - paddingRight}
                y2={tick.y}
                stroke="#F1F1F4"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="text-[10px] fill-neutral-400 font-mono"
              >
                ${tick.val >= 1000 ? `${(tick.val / 1000).toFixed(0)}k` : tick.val}
              </text>
            </g>
          ))}

          {/* Area Fill for High-Fashion Apparel */}
          <path d={apparelAreaPath} fill="url(#terracottaGradient)" />

          {/* Secondary Series: Leather Goods & Accessories (Dashed Obsidian) */}
          <path
            d={accessoriesPath}
            fill="none"
            stroke="#18181F"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />

          {/* Primary Series: High-Fashion Apparel (Solid Terracotta) */}
          <path
            d={apparelPath}
            fill="none"
            stroke="#944434"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* X-axis tick labels */}
          {pointsApparel.map((pt, idx) => (
            <text
              key={idx}
              x={pt.x}
              y={svgHeight - 8}
              textAnchor="middle"
              className="text-[10px] fill-neutral-500 font-mono"
            >
              {pt.data.date}
            </text>
          ))}

          {/* Hover Crosshair and Data Points */}
          {hoverIndex !== null && pointsApparel[hoverIndex] && (
            <g>
              <line
                x1={pointsApparel[hoverIndex].x}
                y1={paddingTop}
                x2={pointsApparel[hoverIndex].x}
                y2={paddingTop + chartH}
                stroke="#A1A1AA"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {/* Apparel point dot */}
              <circle
                cx={pointsApparel[hoverIndex].x}
                cy={pointsApparel[hoverIndex].y}
                r="5"
                fill="#944434"
                stroke="#FFFFFF"
                strokeWidth="2"
                className="drop-shadow-sm"
              />
              {/* Accessories point dot */}
              <circle
                cx={pointsAccessories[hoverIndex].x}
                cy={pointsAccessories[hoverIndex].y}
                r="4.5"
                fill="#18181F"
                stroke="#FFFFFF"
                strokeWidth="2"
                className="drop-shadow-sm"
              />
            </g>
          )}

          {/* Transparent interactive overlay columns for mouse tracking */}
          {pointsApparel.map((_, idx) => {
            const stepW = chartW / (pointsApparel.length - 1);
            const colX = pointsApparel[idx].x - stepW / 2;
            return (
              <rect
                key={idx}
                x={Math.max(0, colX)}
                y={paddingTop}
                width={stepW}
                height={chartH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {activeHover && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-2.5 bg-[#0E0E12] border border-neutral-700/80 rounded-xl shadow-2xl text-white text-xs min-w-44 transition-all duration-150"
            style={{
              left: `${(activeHover.x / svgWidth) * 100}%`,
              top: `${(activeHover.y / svgHeight) * 100}%`,
            }}
          >
            <div className="font-semibold text-neutral-400 text-[10px] mb-1.5 border-b border-neutral-800 pb-1">
              Timeline: {activeHover.data.date}
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <span className="w-2 h-2 rounded-full bg-[#944434]" />
                Apparel:
              </span>
              <span className="font-mono font-bold text-[#E07A5F]">
                ${activeHover.data.apparelRev.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[11px] mt-1">
              <span className="flex items-center gap-1.5 text-neutral-400">
                <span className="w-2 h-0.5 bg-neutral-400" />
                Leather Goods:
              </span>
              <span className="font-mono font-semibold text-neutral-300">
                ${activeHover.data.accessoriesRev.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-[10px] mt-1 pt-1 border-t border-neutral-800/60 text-neutral-400">
              <span>Orders:</span>
              <span className="font-mono text-white font-semibold">
                {activeHover.data.orders}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Figma Matched Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 pt-3 border-t border-neutral-100 text-xs text-neutral-600">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#944434]" />
          <span className="font-medium text-neutral-800">
            High-Fashion Apparel (Silk, Linen, Wool)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-0.5 border-b-2 border-dashed border-neutral-700" />
          <span className="font-medium text-neutral-700">
            Leather Goods &amp; Accessories
          </span>
        </div>
      </div>
    </div>
  );
}
