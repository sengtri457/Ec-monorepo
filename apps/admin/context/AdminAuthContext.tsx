"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getStorageItem, setStorageItem, removeStorageItem } from "@/lib/storage";
import { adminApiClient } from "@/lib/adminApiClient";

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  is_staff: boolean;
  is_superuser?: boolean;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    removeStorageItem("ec_admin_auth_token");
    removeStorageItem("ec_admin_user");
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    const storedToken = getStorageItem<string | null>("ec_admin_auth_token", null);
    const storedUser = getStorageItem<AdminUser | null>("ec_admin_user", null);

    if (storedToken && storedUser && storedUser.is_staff) {
      setToken(storedToken);
      setUser(storedUser);
    } else {
      logout();
    }
    setIsLoading(false);

    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener("admin:auth-expired", handleAuthExpired);
    return () => {
      window.removeEventListener("admin:auth-expired", handleAuthExpired);
    };
  }, [logout]);

  const login = async (email: string, password: string) => {
    try {
      const data = await adminApiClient<{
        message: string;
        user: AdminUser;
        tokens: { access: string; refresh: string };
      }>("/auth/admin/login/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });

      if (!data.user.is_staff && !data.user.is_superuser) {
        return {
          success: false,
          error: "Access Restricted: You must have administrator or staff privileges.",
        };
      }

      setStorageItem("ec_admin_auth_token", data.tokens.access);
      setStorageItem("ec_admin_user", data.user);
      setToken(data.tokens.access);
      setUser(data.user);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      return { success: false, error: message };
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(user && token && user.is_staff),
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return ctx;
}
