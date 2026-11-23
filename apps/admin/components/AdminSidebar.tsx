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
  LogOut,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { name: "Overview", href: "/", icon: LayoutDashboard, exact: true },
  { name: "Orders", href: "/orders", icon: ShoppingBag },
  { name: "Stock Inventory", href: "/inventory", icon: Boxes, exact: true },
  { name: "Movements Ledger", href: "/inventory/movements", icon: ArrowLeftRight },
  { name: "Product Catalog", href: "/products", icon: Shirt },
];

export function AdminSidebar({
  onCloseMobile,
}: {
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
        <Link
          href="/"
          onClick={onCloseMobile}
          className="flex items-center gap-3 transition hover:opacity-85"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
            <span className="font-bold tracking-tight text-sm">EC</span>
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm tracking-tight leading-none">
              Clothes EC
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
              Admin Portal
            </div>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Management
        </div>
        {navItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  active ? "text-white" : "text-slate-400 group-hover:text-slate-700"
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          External
        </div>
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          className="group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all"
        >
          <span className="flex items-center gap-3">
            <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-slate-700" />
            <span>Storefront Web</span>
          </span>
          <span className="text-[10px] font-medium text-slate-400">:3000</span>
        </a>
      </nav>

      {/* Footer Profile & Logout */}
      <div className="border-t border-slate-200 p-4 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-xs uppercase">
            {user?.first_name ? user.first_name[0] : user?.username?.[0] || "A"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-bold text-slate-900">
              {user?.first_name
                ? `${user.first_name} ${user.last_name || ""}`.trim()
                : user?.username || "Admin"}
            </p>
            <p className="truncate text-[11px] text-slate-500">
              {user?.email || "admin@clothes.ec"}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <ShieldCheck className="h-3 w-3" />
            Staff
          </span>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-xs cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
