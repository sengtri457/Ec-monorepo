"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  Building2,
  Bell,
  Plus,
  LogOut,
} from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";

export function AdminHeader({
  onOpenMobile,
}: {
  onOpenMobile?: () => void;
}) {
  const { user, logout } = useAdminAuth();
  const [gatewayOnline, setGatewayOnline] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;
    const checkGateway = async () => {
      try {
        const res = await fetch("http://localhost/api/v1/health", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (isMounted) {
          setGatewayOnline(res.ok);
        }
      } catch {
        if (isMounted) {
          setGatewayOnline(false);
        }
      }
    };

    checkGateway();
    const interval = setInterval(checkGateway, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-20 bg-white border-b border-neutral-200/70 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Left side: Mobile Toggle & Global Search Bar */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 mr-2 sm:mr-4">
        {onOpenMobile && (
          <button
            type="button"
            onClick={onOpenMobile}
            className="md:hidden p-2 rounded-xl text-neutral-600 hover:bg-neutral-100 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Global Search Bar with ⌘K badge */}
        <div className="relative w-full max-w-[384px] min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search orders, SKU, courier or products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-14 py-2 text-xs bg-neutral-50/80 hover:bg-neutral-50 focus:bg-white text-neutral-800 placeholder-neutral-400 border border-neutral-200/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#944434]/20 focus:border-[#944434] transition-all"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400 bg-white border border-neutral-200 rounded shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right side: Realtime status, Hub location, Notification & Actions */}
      <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
        {/* Realtime Gateway Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FDF2F0] border border-[#FADAD6] text-[11px] font-medium text-[#944434]">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                gatewayOnline ? "animate-ping bg-[#E05238]" : "bg-amber-500"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                gatewayOnline ? "bg-[#E05238]" : "bg-amber-500"
              }`}
            />
          </span>
          <span className="whitespace-nowrap font-sans">
            {gatewayOnline ? "Gateway (Port 80): Connected" : "Gateway Offline"}
          </span>
        </div>

        {/* Store Hub Location Pill */}
        <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100/80 border border-neutral-200/80 text-[11px] font-medium text-neutral-700">
          <Building2 className="w-3.5 h-3.5 text-neutral-500" />
          <span className="whitespace-nowrap">Phnom Penh Flagship Hub</span>
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          className="relative p-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="View notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Primary Action: + ADD PRODUCT */}
        <Link
          href="/products/new"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-2 text-xs font-semibold text-white bg-[#0E0E12] hover:bg-neutral-800 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="tracking-wide uppercase text-[11px] whitespace-nowrap hidden sm:inline">
            Add Product
          </span>
        </Link>

        {/* User initials & Sign Out */}
        <div className="hidden sm:flex items-center gap-2 pl-1 border-l border-neutral-200">
          <div className="w-8 h-8 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-700 font-bold text-xs flex items-center justify-center uppercase">
            {user?.first_name ? user.first_name[0] : user?.username?.[0] || "A"}
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
