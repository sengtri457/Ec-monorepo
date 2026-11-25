"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { ShieldCheck } from "lucide-react";

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAdminAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user || !user.is_staff) {
        router.replace("/login");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shadow-sm animate-pulse">
            <ShieldCheck className="h-7 w-7 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 tracking-tight">
              Verifying Administrative Session
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Checking token authorization and staff role privileges...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !user.is_staff) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-amber-600" />
          <span>Redirecting to administrator sign in...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
