import { getStorageItem, removeStorageItem } from "./storage";

const K8S_NODE_PORTS = new Set(["30000", "30001", "30080"]);

/**
 * Resolves the API gateway base URL dynamically across SSR (cluster DNS),
 * Kubernetes NodePort browser access (:30000/:30001/:30080), and local dev.
 */
export function getApiBase(): string {
  if (typeof window === "undefined") {
    return (
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://127.0.0.1/api/v1"
    );
  }

  const { protocol, hostname, port } = window.location;
  if (K8S_NODE_PORTS.has(port)) {
    return `${protocol}//${hostname}:30080/api/v1`;
  }

  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1/api/v1";
}

/**
 * Resolves the customer storefront base URL matching the active runtime.
 */
export function getStoreUrl(): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    if (K8S_NODE_PORTS.has(port)) {
      return `${protocol}//${hostname}:30000`;
    }
  }
  return process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:3000";
}

export const API_BASE = getApiBase();

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

export async function adminApiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, skipAuth = false, headers = {}, ...rest } = options;

  let url = endpoint.startsWith("http")
    ? endpoint
    : `${getApiBase()}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        searchParams.append(k, String(v));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += `${url.includes("?") ? "&" : "?"}${qs}`;
    }
  }

  const mergedHeaders: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (!skipAuth && typeof window !== "undefined") {
    const token = getStorageItem<string | null>("ec_admin_auth_token", null);
    if (token && !mergedHeaders["Authorization"]) {
      mergedHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    headers: mergedHeaders,
    ...rest,
  });

  if (res.status === 401 && typeof window !== "undefined") {
    removeStorageItem("ec_admin_auth_token");
    removeStorageItem("ec_admin_user");
    window.dispatchEvent(new Event("admin:auth-expired"));
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message =
      errorBody.detail ||
      errorBody.error?.message ||
      errorBody.message ||
      (Array.isArray(errorBody) ? errorBody[0] : null) ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
