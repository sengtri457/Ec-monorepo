"use client";

import React, { useState } from "react";
import { User } from "@/types";

interface PersonalInfoTabProps {
  user: User;
  onUpdateUser: (fields: Partial<User>) => Promise<void> | void;
}

export default function PersonalInfoTab({ user, onUpdateUser }: PersonalInfoTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form state
  const nameParts = (user.name || "").trim().split(" ");
  const [firstName, setFirstName] = useState(nameParts[0] || "");
  const [lastName, setLastName] = useState(nameParts.slice(1).join(" ") || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [telegram, setTelegram] = useState(user.telegram || "");

  const handleCancel = () => {
    const parts = (user.name || "").trim().split(" ");
    setFirstName(parts[0] || "");
    setLastName(parts.slice(1).join(" ") || "");
    setPhone(user.phone || "");
    setTelegram(user.telegram || "");
    setIsEditing(false);
    setFeedback(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim() || user.name;
    const cleanTelegram = telegram.trim()
      ? telegram.trim().startsWith("@")
        ? telegram.trim()
        : `@${telegram.trim()}`
      : "";

    try {
      await onUpdateUser({
        name: fullName,
        phone: phone.trim(),
        telegram: cleanTelegram,
      });

      setFeedback({
        type: "success",
        message: "Your profile information has been successfully updated.",
      });
      setIsEditing(false);
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to update profile. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-lg sm:text-xl font-semibold text-ink">
            Personal Information
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Manage your personal identity, contact numbers, and delivery messenger handles.
          </p>
        </div>

        {!isEditing ? (
          <button
            onClick={() => {
              setIsEditing(true);
              setFeedback(null);
            }}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 border border-ink bg-ink text-paper px-3.5 py-1.5 text-xs font-medium hover:bg-charcoal transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Edit Profile</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="border border-border bg-paper text-ink px-3 py-1.5 text-xs font-medium hover:bg-surface transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 text-xs flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-sage/10 border-sage/30 text-sage"
              : "bg-error/10 border-error/30 text-error"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Form & Card Display */}
      <form onSubmit={handleSave} className="border border-border bg-paper p-6 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* First Name */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
              First Name
            </label>
            {isEditing ? (
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden transition-colors"
              />
            ) : (
              <p className="text-xs font-medium text-ink bg-surface/50 border border-border/60 px-3 py-2">
                {firstName || "—"}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1.5">
              Last Name
            </label>
            {isEditing ? (
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden transition-colors"
              />
            ) : (
              <p className="text-xs font-medium text-ink bg-surface/50 border border-border/60 px-3 py-2">
                {lastName || "—"}
              </p>
            )}
          </div>

          {/* Email Address (Primary Identity) */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Email Address
              </label>
              <span className="inline-flex items-center gap-1 text-[10px] text-sage font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Primary Account ID
              </span>
            </div>
            <div className="flex items-center justify-between border border-border/60 bg-surface/30 px-3 py-2">
              <span className="text-xs text-ink font-mono">{user.email}</span>
              <span className="text-[10px] text-ink-soft">Managed via Auth</span>
            </div>
          </div>

          {/* Primary Phone */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Phone Number (Cambodia)
              </label>
              <span className="text-[10px] text-ink-soft">Courier Dispatch</span>
            </div>
            {isEditing ? (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 012 889 977"
                className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden font-mono transition-colors"
              />
            ) : (
              <p className="text-xs font-mono text-ink bg-surface/50 border border-border/60 px-3 py-2">
                {user.phone || "No phone added"}
              </p>
            )}
            <p className="text-[10px] text-ink-soft mt-1">
              Used by express delivery riders upon arrival.
            </p>
          </div>

          {/* Telegram Handle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Telegram Handle
              </label>
              <span className="text-[10px] text-ctrl-red font-medium">Direct Notification</span>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@username"
                className="w-full border border-border bg-backdrop px-3 py-2 text-xs text-ink focus:border-ink focus:outline-hidden font-mono transition-colors"
              />
            ) : (
              <p className="text-xs font-mono text-ink bg-surface/50 border border-border/60 px-3 py-2">
                {user.telegram || "No Telegram handle set"}
              </p>
            )}
            <p className="text-[10px] text-ink-soft mt-1">
              Instant notification for Bakong KHQR receipt & parcel dispatch.
            </p>
          </div>
        </div>

        {/* Action Buttons in Edit Mode */}
        {isEditing && (
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="border border-border bg-paper text-ink px-4 py-2 text-xs font-medium hover:bg-surface transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="border border-ink bg-ink text-paper px-5 py-2 text-xs font-medium hover:bg-charcoal transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-paper" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
