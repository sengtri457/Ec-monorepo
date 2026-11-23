"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AdminHeader } from "./AdminHeader";
import { AdminBottomNav } from "./AdminBottomNav";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Do not wrap login page with administrative shell or bottom nav
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-neutral-900 flex flex-col relative">
      {/* Top Operations Header */}
      <AdminHeader />

      {/* Main Content Area - Full-width canvas with bottom clearance for floating dock */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-28 sm:pb-32">
        <div className="mx-auto max-w-7xl w-full">
          {children}
        </div>
      </main>

      {/* Floating Glassmorphic Bottom Navigation Dock */}
      <AdminBottomNav />
    </div>
  );
}
