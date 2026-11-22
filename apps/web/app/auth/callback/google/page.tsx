"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithGoogle } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (hasExchanged.current) return;

    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const destination = searchParams.get("state") || "/profile";

    if (error) {
      hasExchanged.current = true;
      queueMicrotask(() => {
        setErrorMessage(
          error === "access_denied"
            ? "Google Sign-In was cancelled."
            : `Authentication error from Google: ${error}`
        );
      });
      return;
    }

    if (!code) {
      hasExchanged.current = true;
      queueMicrotask(() => {
        setErrorMessage("No authorization code was received from Google.");
      });
      return;
    }

    hasExchanged.current = true;

    async function handleExchange() {
      try {
        const redirectUri = window.location.origin + "/auth/callback/google";
        await loginWithGoogle({ code: code || undefined, redirect_uri: redirectUri });
        // Use window.location.replace to ensure full session hydration and immediate navigation
        window.location.replace(destination);
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to authenticate with Google."
        );
      }
    }

    handleExchange();
  }, [searchParams, loginWithGoogle, router]);

  return (
    <main className="min-h-screen bg-backdrop flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md border border-border bg-paper p-8 text-center shadow-xs">
        {/* Google Multicolor Logo Header */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface mb-4">
          <svg className="h-7 w-7" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
        </div>

        {!errorMessage ? (
          <div className="space-y-3">
            <h1 className="font-heading text-lg font-semibold text-ink">
              Connecting Google Account
            </h1>
            <p className="text-xs text-ink-soft">
              Validating your credentials and syncing your profile...
            </p>
            <div className="pt-4 flex justify-center">
              <svg className="animate-spin h-6 w-6 text-ink" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="font-heading text-lg font-semibold text-ink">
              Authentication Notice
            </h1>
            <div className="border border-ctrl-red/30 bg-ctrl-red/5 p-3 text-xs text-ctrl-red">
              {errorMessage}
            </div>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block w-full border border-ink bg-ink text-paper py-2.5 text-xs font-medium hover:bg-charcoal transition-colors"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-backdrop flex items-center justify-center">
          <div className="text-xs text-ink-soft">Connecting to Google...</div>
        </main>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
