"use client";

import React from "react";
import { User } from "@/types";

export type ProfileTab = "personal" | "addresses" | "orders" | "security";

interface ProfileSidebarProps {
  activeTab: ProfileTab;
  onSelectTab: (tab: ProfileTab) => void;
  user: User;
  onLogout: () => void;
}

export default function ProfileSidebar({
  activeTab,
  onSelectTab,
  user,
  onLogout,
}: ProfileSidebarProps) {
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || "CU";
  };

  const navItems: { id: ProfileTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: "personal",
      label: "Personal Info",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: "addresses",
      label: "Delivery Addresses",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: "orders",
      label: "Order History",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      id: "security",
      label: "Security & Login",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full space-y-4">
      {/* User Identity Mini-Card */}
      <div className="border border-border bg-paper p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-paper font-heading text-sm font-semibold tracking-wider">
            {getInitials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-semibold text-sm sm:text-base text-ink truncate">
                {user.name}
              </h2>
              <span className="shrink-0 inline-flex items-center rounded-xs bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-soft border border-border">
                Member
              </span>
            </div>
            <p className="text-xs text-ink-soft truncate mt-0.5">{user.email}</p>
            {user.telegram && (
              <p className="text-[11px] text-ctrl-red font-mono truncate mt-0.5">
                {user.telegram}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Pill Scroll */}
      <div className="lg:hidden flex overflow-x-auto gap-2 pb-1 scrollbar-none">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium whitespace-nowrap transition-colors border ${
                isActive
                  ? "bg-ink text-paper border-ink shadow-xs"
                  : "bg-paper text-ink border-border hover:bg-surface"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop Vertical Menu */}
      <div className="hidden lg:block border border-border bg-paper p-2 shadow-xs">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium transition-colors text-left border ${
                  isActive
                    ? "bg-ink text-paper border-ink font-semibold"
                    : "text-ink border-transparent hover:bg-surface hover:text-ink"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-3.5 w-3.5 transition-transform ${
                    isActive ? "text-paper translate-x-0.5" : "text-placeholder opacity-60"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            );
          })}
        </nav>

        <div className="mt-4 pt-3 border-t border-border">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-error hover:bg-error/5 transition-colors border border-transparent text-left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
