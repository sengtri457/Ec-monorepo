"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAdminAuth();

  const [email, setEmail] = useState("admin@clothes.ec");
  const [password, setPassword] = useState("AdminPassword123!");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      router.push("/");
    } else {
      setError(result.error || "Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-xl">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-900/40">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-white">
            Clothes EC Console
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Authorized administrator access for inventory & orders
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Admin Email
            </label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@clothes.ec"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">
              Password
            </label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/90 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 transition focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-amber-500 disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Signing in...
              </span>
            ) : (
              <>
                Sign in to Console
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-900 pt-4 text-center">
          <p className="text-[11px] text-slate-500">
            Clothes EC Monorepo • Next.js 16 App Router
          </p>
        </div>
      </div>
    </div>
  );
}
