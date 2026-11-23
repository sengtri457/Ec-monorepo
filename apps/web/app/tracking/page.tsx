"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function TrackingSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError("Please enter a valid tracking number or order number.");
      return;
    }
    setError(null);
    router.push(`/tracking/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="min-h-[70vh] bg-canvas/30 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="relative mx-auto h-12 w-14 mb-4">
            <Image
              src="/images/logoDevs.png"
              alt="Clothes Brand Logo"
              fill
              sizes="56px"
              className="object-contain"
              priority
            />
          </div>
          <span className="type-label text-xs uppercase tracking-widest text-ctrl-red">
            Cambodia Delivery Concierge
          </span>
          <h1 className="type-display mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Track Your Parcel
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft max-w-md mx-auto">
            Enter your Clothes™ tracking number (e.g., <code className="text-ink font-semibold">KH-20261123-XXXX</code>) or order reference to inspect real-time road coordinates and courier status.
          </p>
        </div>

        {/* Search Card */}
        <div className="border border-border bg-paper p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="tracking-input"
                className="type-label block text-xs uppercase tracking-wider text-ink font-semibold mb-2"
              >
                Tracking or Order Reference Number
              </label>
              <div className="relative">
                <input
                  id="tracking-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. KH-20261123-A1B2 or ORD-20261123-999"
                  className="w-full border border-border bg-canvas px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink tabular-nums uppercase"
                  autoFocus
                />
                <button
                  type="submit"
                  className="type-label absolute right-1.5 top-1.5 bottom-1.5 bg-ink px-5 text-xs uppercase tracking-wider text-paper hover:bg-ink-soft transition-colors cursor-pointer font-semibold"
                >
                  Track &rarr;
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-ctrl-red">{error}</p>}
            </div>

            <div className="border-t border-border pt-4 text-[11px] text-ink-soft flex items-center justify-between">
              <span>Need help finding your tracking number?</span>
              <Link href="/profile" className="text-ink underline hover:text-ctrl-red">
                Check Order History
              </Link>
            </div>
          </form>
        </div>

        {/* Logistics Information Strip */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="border border-border bg-paper p-4">
            <h4 className="font-semibold text-ink text-[11px] uppercase tracking-wider">
              Phnom Penh Same-Day
            </h4>
            <p className="mt-1 text-ink-soft text-[11px] leading-relaxed">
              Express motorbike couriers deliver within 2-4 hours across all central khans with real-time GPS tracking.
            </p>
          </div>
          <div className="border border-border bg-paper p-4">
            <h4 className="font-semibold text-ink text-[11px] uppercase tracking-wider">
              24 Provincial Coverage
            </h4>
            <p className="mt-1 text-ink-soft text-[11px] leading-relaxed">
              Virak Buntham Logistics (VET) express cargo routes dispatch daily to Siem Reap, Battambang, and coastal hubs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
