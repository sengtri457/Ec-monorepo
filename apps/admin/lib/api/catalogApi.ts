import { adminApiClient } from "../adminApiClient";

export interface AdminProductVariant {
  id?: number;
  sku: string;
  size?: string;
  color?: string;
  color_hex?: string;
  price_override?: number | string | null;
  stock: number;
  is_default?: boolean;
  is_active?: boolean;
}

export interface AdminProductImage {
  id?: number;
  image_url: string;
  alt_text?: string;
  is_primary?: boolean;
  sort_order?: number;
}

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  department?: string;
  description?: string;
}

export interface AdminProduct {
  id: number;
  slug: string;
  title: string;
  description: string;
  base_price: number | string;
  category_id?: number;
  category?: AdminCategory;
  department: string;
  audience: string;
  subcategory?: string;
  fabric?: string;
  thumbnail?: string;
  total_stock?: number;
  is_active: boolean;
  is_featured: boolean;
  variants?: AdminProductVariant[];
  images?: AdminProductImage[];
  created_at?: string;
  updated_at?: string;
}

export interface AdminProductListResponse {
  count: number;
  results: AdminProduct[];
}

export async function fetchAdminProducts(params?: {
  search?: string;
  department?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}): Promise<AdminProductListResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.department && params.department !== "ALL") query.set("department", params.department);
  if (params?.is_active !== undefined) query.set("is_active", String(params.is_active));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  const qs = query.toString();
  return adminApiClient<AdminProductListResponse>(`/catalog/admin/products/${qs ? `?${qs}` : ""}`);
}

export async function fetchAdminProduct(id: number | string): Promise<AdminProduct> {
  return adminApiClient<AdminProduct>(`/catalog/admin/products/${id}/`);
}

export async function createAdminProduct(payload: Partial<AdminProduct>): Promise<AdminProduct> {
  return adminApiClient<AdminProduct>("/catalog/admin/products/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminProduct(
  id: number | string,
  payload: Partial<AdminProduct>
): Promise<AdminProduct> {
  return adminApiClient<AdminProduct>(`/catalog/admin/products/${id}/`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function patchAdminProduct(
  id: number | string,
  payload: Partial<AdminProduct>
): Promise<AdminProduct> {
  return adminApiClient<AdminProduct>(`/catalog/admin/products/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminProduct(id: number | string): Promise<void> {
  return adminApiClient<void>(`/catalog/admin/products/${id}/`, {
    method: "DELETE",
  });
}

export async function fetchCategories(): Promise<AdminCategory[]> {
  try {
    const res = await adminApiClient<{ results: AdminCategory[] } | AdminCategory[]>(
      "/catalog/categories/"
    );
    if (Array.isArray(res)) return res;
    return (res as any).results || [];
  } catch (err) {
    console.error("Failed to fetch categories:", err);
    return [];
  }
}
