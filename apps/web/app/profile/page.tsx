"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ProfileSidebar, { ProfileTab } from "./components/ProfileSidebar";
import PersonalInfoTab from "./components/PersonalInfoTab";
import AddressBookTab from "./components/AddressBookTab";
import OrderHistoryTab from "./components/OrderHistoryTab";
import SecurityTab from "./components/SecurityTab";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded, logout, updateUser, loginWithDemo } = useAuth();

  const queryTab = searchParams.get("tab") as ProfileTab | null;
  const activeTab: ProfileTab =
    queryTab && ["personal", "addresses", "orders", "security"].includes(queryTab)
      ? queryTab
      : "personal";

  const handleSelectTab = (tab: ProfileTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/profile?${params.toString()}`, { scroll: false });
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // 1. Loading Skeleton State
  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-backdrop py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="h-4 w-32 bg-border animate-pulse mb-6"></div>
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <div className="h-28 border border-border bg-paper p-5 animate-pulse"></div>
              <div className="h-48 border border-border bg-paper p-2 animate-pulse hidden lg:block"></div>
            </div>
            <div className="col-span-12 lg:col-span-8">
              <div className="h-96 border border-border bg-paper p-6 animate-pulse"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 2. Unauthenticated State (Prompt Sign In or Demo Login)
  if (!user) {
    return (
      <main className="min-h-screen bg-backdrop py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-md border border-border bg-paper p-8 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface text-ink-soft mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>

          <h1 className="font-heading text-lg font-semibold text-ink">
            Customer Account
          </h1>
          <p className="text-xs text-ink-soft mt-1.5 mb-6">
            Sign in to view your orders, delivery address book, and Cambodia courier updates.
          </p>

          <div className="space-y-3">
            <Link
              href="/login?redirect=/profile"
              className="w-full block border border-ink bg-ink text-paper py-2.5 text-xs font-medium hover:bg-charcoal transition-colors text-center"
            >
              Sign In to Your Account
            </Link>

            <button
              onClick={() => loginWithDemo(0)}
              className="w-full border border-border bg-paper text-ink py-2.5 text-xs font-medium hover:bg-surface hover:border-ink transition-colors"
            >
              Quick Test: Sign in as Sophea Chan (Demo)
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <Link href="/" className="text-xs text-ink-soft hover:text-ink underline">
              Return to Storefront
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // 3. Authenticated Customer Profile Hub
  const tabTitles: Record<ProfileTab, string> = {
    personal: "Personal Information",
    addresses: "Delivery Addresses",
    orders: "Order History",
    security: "Security & Login",
  };

  return (
    <main className="min-h-screen bg-backdrop py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-ink-soft">
          <Link href="/" className="hover:text-ink transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/profile" className="hover:text-ink transition-colors">
            Account
          </Link>
          <span>/</span>
          <span className="text-ink font-medium">{tabTitles[activeTab]}</span>
        </nav>

        {/* 12-Column Responsive Layout */}
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left Sidebar */}
          <aside className="col-span-12 lg:col-span-4 sticky top-20">
            <ProfileSidebar
              activeTab={activeTab}
              onSelectTab={handleSelectTab}
              user={user}
              onLogout={handleLogout}
            />
          </aside>

          {/* Right Main Content Panel */}
          <section className="col-span-12 lg:col-span-8 min-h-[420px]">
            {activeTab === "personal" && (
              <PersonalInfoTab user={user} onUpdateUser={updateUser} />
            )}
            {activeTab === "addresses" && (
              <AddressBookTab user={user} onUpdateUser={updateUser} />
            )}
            {activeTab === "orders" && <OrderHistoryTab />}
            {activeTab === "security" && (
              <SecurityTab user={user} onLogout={handleLogout} />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-backdrop py-12 px-4 flex items-center justify-center">
          <div className="text-xs text-ink-soft">Loading customer profile...</div>
        </main>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
