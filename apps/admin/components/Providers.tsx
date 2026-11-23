"use client";

import React from "react";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { AdminGuard } from "@/components/AdminGuard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminGuard>{children}</AdminGuard>
    </AdminAuthProvider>
  );
}
