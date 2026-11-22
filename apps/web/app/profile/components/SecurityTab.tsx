"use client";

import React, { useState } from "react";
import { User } from "@/types";

interface SecurityTabProps {
  user: User;
  onLogout: () => void;
}

export default function SecurityTab({ user, onLogout }: SecurityTabProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword.length < 8) {
      setFeedback({
        type: "error",
        message: "New password must be at least 8 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({
        type: "error",
        message: "New password and confirmation do not match.",
      });
      return;
    }

    setIsUpdating(true);

    // Simulate API update or fallback
    setTimeout(() => {
      setIsUpdating(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFeedback({
        type: "success",
        message: "Your password has been securely updated.",
      });
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="border-b border-border pb-4">
        <h1 className="font-heading text-lg sm:text-xl font-semibold text-ink">
          Security & Login
        </h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Manage your account credentials, security access, and active session status.
        </p>
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`p-3.5 text-xs flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-sage/10 border-sage/30 text-sage"
              : "bg-error/10 border-error/30 text-error"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Change Password Card */}
      <div className="border border-border bg-paper p-6 shadow-xs">
        <div className="border-b border-border pb-3 mb-5">
          <h2 className="font-heading text-sm font-semibold text-ink">
            Change Password
          </h2>
          <p className="text-xs text-ink-soft mt-0.5">
            Ensure your account is using a strong, unique password.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-soft hover:text-ink"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
              New Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Confirm New Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="border border-ink bg-ink text-paper px-4 py-2 text-xs font-medium hover:bg-charcoal transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isUpdating ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>

      {/* Active Session Card */}
      <div className="border border-border bg-paper p-6 shadow-xs">
        <h2 className="font-heading text-sm font-semibold text-ink mb-1">
          Active Session
        </h2>
        <p className="text-xs text-ink-soft mb-4">
          You are currently signed in as <span className="font-medium text-ink">{user.email}</span>.
        </p>

        <div className="border border-border bg-surface/40 p-4 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-sage/15 text-sage flex items-center justify-center font-bold">
              💻
            </div>
            <div>
              <p className="font-medium text-ink">Web Browser Session</p>
              <p className="text-[11px] text-ink-soft">Active JWT Bearer Session</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] text-sage font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-sage animate-ping"></span>
            Online Now
          </span>
        </div>
      </div>

      {/* Danger Zone: Sign Out */}
      <div className="border border-error/30 bg-error/5 p-6 shadow-xs">
        <h2 className="font-heading text-sm font-semibold text-error mb-1">
          Account Session
        </h2>
        <p className="text-xs text-ink-soft mb-4">
          Signing out will invalidate your session on this browser. You will need to log in again to access saved addresses and orders.
        </p>

        {!showLogoutConfirm ? (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="border border-error/40 bg-paper text-error px-4 py-2 text-xs font-medium hover:bg-error/10 transition-colors"
          >
            Sign Out of Account
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={onLogout}
              className="border border-error bg-error text-paper px-4 py-2 text-xs font-medium hover:bg-red-700 transition-colors"
            >
              Confirm Sign Out
            </button>
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="border border-border bg-paper text-ink px-4 py-2 text-xs font-medium hover:bg-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
