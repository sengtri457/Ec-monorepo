"use client";

import React, { useState, useEffect } from "react";
import { Menu, Radio } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";

export function AdminHeader({
  onOpenMobile,
}: {
  onOpenMobile?: () => void;
}) {
  const { user } = useAdminAuth();
  const [gatewayOnline, setGatewayOnline] = useState(true);

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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 md:px-8 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {onOpenMobile && (
          <button
            onClick={onOpenMobile}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-800">Admin Console</span>
          <span>/</span>
          <span>Microservices Fabric</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Gateway Health Indicator */}
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
          <Radio
            className={`h-3 w-3 ${
              gatewayOnline ? "text-emerald-500 animate-pulse" : "text-amber-500"
            }`}
          />
          <span className="font-medium text-slate-600">
            {gatewayOnline ? "Gateway (Port 80): Active" : "Gateway Offline"}
          </span>
        </div>

        {/* User preview */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <span className="hidden md:inline">Signed in as</span>
          <span className="font-bold text-slate-900 truncate max-w-[140px]">
            {user?.email || "admin@clothes.ec"}
          </span>
        </div>
      </div>
    </header>
  );
}
