"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/profile";

  const { user, login, loginWithGoogle, logout } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    setError(null);

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientId && typeof window !== "undefined") {
      const redirectUri = `${window.location.origin}/auth/callback/google`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        prompt: "select_account",
        access_type: "offline",
        state: redirectUrl,
      });
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      return;
    }

    // Graceful offline/demo fallback when client ID is not yet provided
    (async () => {
      try {
        await loginWithGoogle();
        router.push(redirectUrl);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Google authentication failed.");
      } finally {
        setIsGoogleLoading(false);
      }
    })();
  };

  // Optional real Google Identity Services callback if client ID configured
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || typeof window === "undefined") return;

    const handleCredentialResponse = async (response: { credential?: string }) => {
      if (response.credential) {
        setIsGoogleLoading(true);
        try {
          await loginWithGoogle({ id_token: response.credential });
          router.push(redirectUrl);
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Google Sign-In failed.");
        } finally {
          setIsGoogleLoading(false);
        }
      }
    };

    const google = (window as unknown as { google?: { accounts?: { id?: { initialize: (opts: unknown) => void } } } }).google;
    if (google?.accounts?.id) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });
    }
  }, [loginWithGoogle, redirectUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }

    if (isSignUp && (!name.trim() || name.trim().length < 2)) {
      setError("Please enter your full name.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password, isSignUp, isSignUp ? name : undefined);
      router.push(redirectUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to authenticate. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="border border-border bg-paper p-8 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper text-sm font-semibold mb-4">
            {user.name.charAt(0)}
          </div>
          <span className="type-label text-[10px] uppercase tracking-widest text-ink-soft">
            Active Account
          </span>
          <h2 className="type-display mt-2 text-2xl font-bold text-ink">{user.name}</h2>
          <p className="mt-1 text-xs text-ink-soft">{user.email}</p>
          {user.phone && <p className="text-xs text-ink-soft">Tel: {user.phone}</p>}

          {user.address && (
            <div className="mt-4 border-t border-border pt-4 text-xs text-ink-soft text-left bg-canvas/40 p-3">
              <span className="block text-[10px] uppercase tracking-wider text-ink font-semibold mb-1">
                Saved Delivery Location:
              </span>
              <p>{user.address.streetAddress || user.address.street}</p>
              <p>
                {user.address.sangkatCommune ? `Sangkat ${user.address.sangkatCommune}, ` : ""}
                {user.address.khanDistrict ? `Khan ${user.address.khanDistrict}, ` : ""}
                {user.address.cityProvince || user.address.city}
              </p>
              {user.address.landmark && (
                <p className="italic text-ink-soft/80 mt-0.5">Landmark: {user.address.landmark}</p>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href={redirectUrl}
              className="type-label inline-flex items-center justify-center bg-ink py-3 text-xs uppercase tracking-widest text-paper hover:bg-ink-soft transition-colors"
            >
              Continue to {redirectUrl.includes("checkout") ? "Checkout" : "Catalog"}
            </Link>
            <button
              onClick={logout}
              className="type-label inline-flex items-center justify-center border border-border py-2.5 text-xs uppercase tracking-widest text-ink hover:text-ctrl-red hover:border-ctrl-red transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="text-center mb-8">
        <span className="type-label text-xs uppercase tracking-widest text-ink-soft">
          Member Access
        </span>
        <h1 className="type-display mt-2 text-3xl font-normal text-ink sm:text-4xl">
          {isSignUp ? "Create an Account" : "Welcome Back"}
        </h1>
        <p className="mt-2 text-xs text-ink-soft">
          Sign in for faster checkout, order tracking, and receipt access.
        </p>
      </div>

      <div className="border border-border bg-paper p-6 sm:p-8 shadow-sm">
        {/* Tab switch */}
        <div className="grid grid-cols-2 border-b border-border pb-4 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`text-xs uppercase tracking-wider pb-2 border-b-2 transition-colors cursor-pointer ${
              !isSignUp ? "border-ink text-ink font-semibold" : "border-transparent text-ink-soft hover:text-ink font-medium"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
            className={`text-xs uppercase tracking-wider pb-2 border-b-2 transition-colors cursor-pointer ${
              isSignUp ? "border-ink text-ink font-semibold" : "border-transparent text-ink-soft hover:text-ink font-medium"
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-5 border border-ctrl-red/30 bg-ctrl-red/5 p-3 text-xs text-ctrl-red">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="type-label block text-xs uppercase tracking-wider text-ink mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sophea Chan"
                className="w-full border border-border bg-canvas px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-soft/50 focus:border-ink focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="type-label block text-xs uppercase tracking-wider text-ink mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sophea.chan@gmail.com"
              className="w-full border border-border bg-canvas px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-soft/50 focus:border-ink focus:outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="type-label text-xs uppercase tracking-wider text-ink">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-ink-soft hover:text-ink underline cursor-pointer"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-border bg-canvas px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-soft/50 focus:border-ink focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="type-label mt-2 w-full bg-ink py-3 text-xs uppercase tracking-widest text-paper hover:bg-ink-soft transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLoading ? "Validating..." : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
            <span className="bg-paper px-3 text-ink-soft">or continue with</span>
          </div>
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
          className="w-full flex items-center justify-center gap-3 border border-border bg-paper py-3 px-4 text-xs font-medium text-ink hover:border-ink hover:bg-surface transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
        >
          {isGoogleLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-ink" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Guest checkout fallback */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <Link
            href={redirectUrl}
            className="text-xs font-medium text-ink-soft hover:text-ink underline underline-offset-4"
          >
            Continue as Guest without signing in →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <Suspense
        fallback={
          <div className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center">
            <p className="text-xs uppercase tracking-wider text-ink-soft">
              Loading...
            </p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </>
  );
}
