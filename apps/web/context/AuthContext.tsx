"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "@/types";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";
import { API_BASE } from "@/lib/api";

const AUTH_USER_KEY = "clothes_auth_user";
const AUTH_TOKEN_KEY = "clothes_auth_token";

export const DEMO_USERS: User[] = [
  {
    id: "10",
    name: "Sophea Chan",
    email: "sophea.chan@gmail.com",
    phone: "012889977",
    telegram: "@sopheachan",
    address: {
      cityProvince: "Phnom Penh",
      khanDistrict: "Chamkarmon",
      sangkatCommune: "Boeung Keng Kang 1 (BKK1)",
      streetAddress: "House #42, Street 310",
      landmark: "Near Brown Coffee BKK57",
      country: "Cambodia",
    },
  },
  {
    id: "11",
    name: "Vireak Roth",
    email: "vireak.roth@outlook.com",
    phone: "098554433",
    telegram: "@vireak_sr",
    address: {
      cityProvince: "Siem Reap",
      khanDistrict: "Krong Siem Reap",
      sangkatCommune: "Sala Kamreuk",
      streetAddress: "St. 07, Wat Bo Village",
      landmark: "Behind Wat Bo Temple",
      country: "Cambodia",
    },
  },
];

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoaded: boolean;
  login: (email: string, password?: string, isSignUp?: boolean, name?: string) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: (googlePayload?: {
    code?: string;
    redirect_uri?: string;
    id_token?: string;
    email?: string;
    name?: string;
    avatar?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  loginWithDemo: (demoIndex?: number) => Promise<void>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = getStorageItem<User | null>(AUTH_USER_KEY, null);
    const savedToken = getStorageItem<string | null>(AUTH_TOKEN_KEY, null);
    queueMicrotask(() => {
      if (saved) {
        setUser(saved);
      }
      if (savedToken) {
        setToken(savedToken);
      }
      setIsLoaded(true);
    });

    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
      removeStorageItem(AUTH_USER_KEY);
      removeStorageItem(AUTH_TOKEN_KEY);
    };

    window.addEventListener("clothes:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("clothes:auth-expired", handleAuthExpired);
  }, []);

  const login = async (email: string, password = "Password123!", isSignUp = false, name?: string) => {
    try {
      const endpoint = isSignUp ? `${API_BASE}/auth/register/` : `${API_BASE}/auth/login/`;
      const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_");
      const names = (name || username).split(" ");
      const firstName = names[0] || username;
      const lastName = names.slice(1).join(" ") || "Customer";

      const payload = isSignUp
        ? { username, email: email.trim().toLowerCase(), password, first_name: firstName, last_name: lastName }
        : { email: email.trim().toLowerCase(), password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err.error || err.detail || (err.email ? err.email[0] : null) || (err.password ? err.password[0] : null) || (err.username ? err.username[0] : null) || "Authentication failed.";
        throw new Error(msg);
      }

      const data = await res.json();
      const accessToken = data.tokens?.access || data.access || "";
      const rawUser = data.user || {};
      const defaultAddr = rawUser.addresses?.[0] || {};

      const targetUser: User = {
        id: String(rawUser.id || `usr-${Date.now()}`),
        name: name?.trim() || `${rawUser.first_name || ""} ${rawUser.last_name || ""}`.trim() || rawUser.username || "Customer",
        email: rawUser.email || email,
        phone: rawUser.phone || defaultAddr.phone || "",
        telegram: rawUser.telegram || defaultAddr.telegram || "",
        address: {
          cityProvince: defaultAddr.city_province || "Phnom Penh",
          khanDistrict: defaultAddr.khan_district || "",
          sangkatCommune: defaultAddr.sangkat_commune || "",
          streetAddress: defaultAddr.street_address || "",
          landmark: defaultAddr.landmark || "",
          country: "Cambodia",
        },
      };

      setUser(targetUser);
      setToken(accessToken);
      setStorageItem(AUTH_USER_KEY, targetUser);
      setStorageItem(AUTH_TOKEN_KEY, accessToken);
      return { success: true };
    } catch (err: unknown) {
      console.error("Backend auth error:", err);
      throw err;
    }
  };

  const loginWithGoogle = useCallback(async (googlePayload?: {
    code?: string;
    redirect_uri?: string;
    id_token?: string;
    email?: string;
    name?: string;
    avatar?: string;
  }) => {
    const payload: Record<string, string> = {};
    if (googlePayload?.code) payload.code = googlePayload.code;
    if (googlePayload?.redirect_uri) payload.redirect_uri = googlePayload.redirect_uri;
    if (googlePayload?.id_token) payload.id_token = googlePayload.id_token;
    if (googlePayload?.email) payload.email = googlePayload.email.trim().toLowerCase();
    if (googlePayload?.name) payload.name = googlePayload.name.trim();

    try {
      const endpoint = `${API_BASE}/auth/google/`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          err.error ||
          err.detail ||
          (typeof err === "string" ? err : JSON.stringify(err)) ||
          "Google authentication failed on server.";
        throw new Error(msg);
      }

      const data = await res.json();
      const accessToken = data.tokens?.access || data.access || "";
      const rawUser = data.user || {};
      const defaultAddr = rawUser.addresses?.[0] || {};

      const targetUser: User = {
        id: String(rawUser.id || `google-${Date.now()}`),
        name: rawUser.first_name || rawUser.last_name
          ? `${rawUser.first_name || ""} ${rawUser.last_name || ""}`.trim()
          : payload.name || "Google User",
        email: rawUser.email || payload.email || "google.user@gmail.com",
        phone: rawUser.phone || defaultAddr.phone || "",
        telegram: rawUser.telegram || defaultAddr.telegram || "",
        address: {
          cityProvince: defaultAddr.city_province || "Phnom Penh",
          khanDistrict: defaultAddr.khan_district || "Chamkarmon",
          sangkatCommune: defaultAddr.sangkat_commune || "Boeung Keng Kang 1",
          streetAddress: defaultAddr.street_address || "Preah Norodom Blvd",
          landmark: defaultAddr.landmark || "",
          country: "Cambodia",
        },
      };

      setUser(targetUser);
      setToken(accessToken);
      setStorageItem(AUTH_USER_KEY, targetUser);
      setStorageItem(AUTH_TOKEN_KEY, accessToken);
      return { success: true };
    } catch (err: unknown) {
      // If code or id_token was supplied, this is a real OAuth flow: do NOT swallow error with static fallback!
      if (googlePayload?.code || googlePayload?.id_token) {
        console.error("Google OAuth authentication failed:", err);
        throw err;
      }

      // Offline demo fallback when no code or credentials were provided
      console.warn("Backend Google auth unavailable, falling back to local Google user:", err);
      const fallbackUser: User = {
        id: `google-user-${Date.now()}`,
        name: payload.name || "Alex Morgan",
        email: payload.email || "alex.morgan@gmail.com",
        phone: "012334455",
        telegram: "@alex_pp",
        address: {
          cityProvince: "Phnom Penh",
          khanDistrict: "Chamkarmon",
          sangkatCommune: "Boeung Keng Kang 1 (BKK1)",
          streetAddress: "Preah Norodom Blvd, Building #18",
          landmark: "Near Independence Monument",
          country: "Cambodia",
        },
      };
      const mockToken = `mock-google-jwt-${Date.now()}`;
      setUser(fallbackUser);
      setToken(mockToken);
      setStorageItem(AUTH_USER_KEY, fallbackUser);
      setStorageItem(AUTH_TOKEN_KEY, mockToken);
      return { success: true, message: "Logged in via Google" };
    }
  }, []);

  const loginWithDemo = async (demoIndex = 0) => {
    const target = DEMO_USERS[demoIndex] || DEMO_USERS[0];
    try {
      await login(target.email, "Password123!", false, target.name);
    } catch (err) {
      console.warn("Backend auth error for demo user, falling back to offline state:", err);
      setUser(target);
      setStorageItem(AUTH_USER_KEY, target);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    removeStorageItem(AUTH_USER_KEY);
    removeStorageItem(AUTH_TOKEN_KEY);
  };

  const updateUser = (updatedFields: Partial<User>) => {
    if (!user) return;
    const nextUser = { ...user, ...updatedFields };
    setUser(nextUser);
    setStorageItem(AUTH_USER_KEY, nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoaded,
        login,
        loginWithGoogle,
        loginWithDemo,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
