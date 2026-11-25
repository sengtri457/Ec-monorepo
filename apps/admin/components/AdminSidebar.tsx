"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  ArrowLeftRight,
  Shirt,
  LogOut,
  ChevronLeft,
  X,
  Truck,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { getStoreUrl } from "@/lib/adminApiClient";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: {
    text: string;
    variant: "live" | "alert" | "count";
  };
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "Operations",
    items: [
      { label: "Overview", href: "/", icon: LayoutDashboard, exact: true },
      {
        label: "Live Dispatch",
        href: "/dispatch",
        icon: Truck,
        badge: { text: "LIVE", variant: "live" },
      },
    ],
  },
  {
    title: "Catalog & Stock",
    items: [
      { label: "Stock Inventory", href: "/inventory", icon: Boxes, exact: true },
      { label: "Movements Ledger", href: "/inventory/movements", icon: ArrowLeftRight },
      { label: "Product Catalog", href: "/products", icon: Shirt },
    ],
  },
  {
    title: "Fulfillment",
    items: [
      { label: "Customer Orders", href: "/orders", icon: ShoppingBag },
    ],
  },
];

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
}

export function AdminSidebar({
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();
  const [storeUrl, setStoreUrl] = useState(
    process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3000"
  );

  useEffect(() => {
    setStoreUrl(getStoreUrl());
  }, []);

  const isItemActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 h-screen flex flex-col bg-[#0E0E12] text-neutral-200 border-r border-neutral-800/80 transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div
        className={`h-20 shrink-0 px-4 flex items-center border-b border-neutral-800/70 ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        <Link
          href="/"
          onClick={onCloseMobile}
          className="flex items-center gap-3 overflow-hidden cursor-pointer"
        >
          <div
            className="w-10 h-10 rounded-xl bg-black border border-white/15 text-white font-bold flex items-center justify-center text-xs tracking-widest shadow-inner shrink-0"
            title="Clothes EC Admin"
          >
            EC
          </div>
          {!isCollapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-wider text-white truncate">
                  CLOTHES EC
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-semibold text-neutral-400 bg-neutral-800/90 rounded border border-neutral-700/50">
                  v2.4
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 tracking-wide mt-0.5 truncate">
                Admin Portal
              </p>
            </div>
          )}
        </Link>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Desktop collapse toggle button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/80 cursor-pointer transition-colors ${
              isCollapsed ? "hidden" : ""
            }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform duration-300 ${
                isCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>

      {/* Navigation Groups List */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto overflow-x-hidden">
        {navGroups.map((group) => (
          <div key={group.title}>
            {!isCollapsed ? (
              <div className="px-3 pb-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest truncate">
                {group.title}
              </div>
            ) : (
              <div className="h-px bg-neutral-800/80 mx-2 my-2" />
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isItemActive(item);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    title={item.label}
                    className={`group relative flex items-center rounded-xl text-xs transition-all duration-150 cursor-pointer ${
                      isCollapsed
                        ? "p-2.5 justify-center"
                        : "px-3 py-2.5 justify-between"
                    } ${
                      active
                        ? "bg-[#944434] text-white font-medium shadow-sm"
                        : "text-neutral-300 hover:text-white hover:bg-neutral-800/70"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-4 h-4 relative flex items-center justify-center text-neutral-400 group-hover:text-white transition-colors shrink-0">
                        <Icon className={`h-4 w-4 ${active ? "text-white" : ""}`} />

                        {isCollapsed && item.badge?.variant === "live" && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0E0E12] animate-pulse" />
                        )}
                      </span>

                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/20 text-white tracking-wide uppercase">
                        {item.badge.text}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* External Storefront Link */}
        <div className="pt-2">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              Storefront
            </div>
          )}
          <a
            href={storeUrl}
            target="_blank"
            rel="noreferrer"
            className={`group flex items-center rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-all ${
              isCollapsed ? "p-2.5 justify-center" : "px-3 py-2.5 justify-between"
            }`}
            title="Open Storefront Web"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="h-4 w-4 shrink-0 text-neutral-400 group-hover:text-white" />
              {!isCollapsed && <span>Public Web</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-mono text-neutral-500">
                {storeUrl.replace(/^https?:\/\/[^/:]+/, "") || ":3000"}
              </span>
            )}
          </a>
        </div>
      </nav>

      {/* Expand Button for Collapsed Mode */}
      {isCollapsed && onToggleCollapse && (
        <div className="p-3 border-t border-neutral-800/80 flex justify-center">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            title="Expand sidebar"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        </div>
      )}

      {/* Profile & Logout Footer */}
      <div className="p-3 border-t border-neutral-800/80 bg-neutral-950/60 shrink-0">
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "justify-between gap-3"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700/60 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs uppercase">
              {user?.first_name ? user.first_name[0] : user?.username?.[0] || "A"}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">
                  {user?.first_name
                    ? `${user.first_name} ${user.last_name || ""}`.trim()
                    : user?.username || "Admin"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded">
                    <ShieldCheck className="h-2.5 w-2.5" /> Staff
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={logout}
            className={`text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg p-2 transition cursor-pointer shrink-0 ${
              isCollapsed ? "hidden" : "block"
            }`}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
