"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  ArrowLeftRight,
  Shirt,
  Truck,
} from "lucide-react";

export interface NavItem {
  label: string;
  shortLabel?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  hasLiveBadge?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Overview",
    shortLabel: "Home",
    href: "/",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Orders",
    shortLabel: "Orders",
    href: "/orders",
    icon: ShoppingBag,
  },
  {
    label: "Products",
    shortLabel: "Products",
    href: "/products",
    icon: Shirt,
  },
  {
    label: "Inventory",
    shortLabel: "Stock",
    href: "/inventory",
    icon: Boxes,
    exact: true,
  },
  {
    label: "Movements",
    shortLabel: "Ledger",
    href: "/inventory/movements",
    icon: ArrowLeftRight,
  },
  {
    label: "Dispatch",
    shortLabel: "Dispatch",
    href: "/dispatch",
    icon: Truck,
    hasLiveBadge: true,
  },
];

export function AdminBottomNav() {
  const pathname = usePathname();

  // If user is on login page, do not render navigation dock
  if (pathname === "/login") {
    return null;
  }

  const isItemActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <nav
      role="navigation"
      aria-label="Admin Navigation Dock"
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1.5rem)] select-none pointer-events-auto"
    >
      <div className="relative flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-2xl sm:rounded-full bg-[#0E0E12]/85 backdrop-blur-xl border border-white/12 shadow-[0_16px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/5 transition-all duration-300">
        {navItems.map((item) => {
          const active = isItemActive(item);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-full text-xs font-medium transition-all duration-200 group cursor-pointer ${
                active
                  ? "bg-[#944434] text-white shadow-sm ring-1 ring-white/20 font-semibold"
                  : "text-neutral-400 hover:text-white hover:bg-white/10 active:scale-95"
              }`}
            >
              {/* Icon with relative container for micro live badge */}
              <div className="relative shrink-0">
                <Icon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    active ? "scale-110 text-white" : "text-neutral-400 group-hover:text-neutral-200"
                  }`}
                />

                {item.hasLiveBadge && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-1 ring-[#0E0E12]" />
                  </span>
                )}
              </div>

              {/* Text label: hidden on very small mobile, visible on sm and up */}
              <span className="hidden md:inline whitespace-nowrap text-xs">
                {item.label}
              </span>

              {/* Compact label for tablet (sm to md) when active or always */}
              <span className={`inline md:hidden whitespace-nowrap text-[11px] ${active ? "inline" : "hidden sm:inline"}`}>
                {item.shortLabel || item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
