import { adminApiClient } from "../adminApiClient";
import { AdminInventoryItem, StockMovement } from "@ec/types";

export interface InventoryListResponse {
  count: number;
  results: AdminInventoryItem[];
}

export interface StockMovementListResponse {
  count: number;
  results: StockMovement[];
}

export interface StockAdjustmentPayload {
  variant_id: number;
  quantity_change: number;
  movement_type: "RESTOCK" | "ADJUSTMENT" | "RETURN" | "RESERVATION" | "RELEASE";
  notes?: string;
  reference_id?: string;
}

export async function fetchInventory(params?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<InventoryListResponse> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  const qs = query.toString();
  return adminApiClient<InventoryListResponse>(`/inventory/admin/${qs ? `?${qs}` : ""}`);
}

export async function adjustStock(
  payload: StockAdjustmentPayload
): Promise<{ message: string; balance_after: number }> {
  return adminApiClient<{ message: string; balance_after: number }>(
    "/inventory/admin/adjust/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function fetchStockMovements(params?: {
  movement_type?: string;
  sku?: string;
  limit?: number;
  offset?: number;
}): Promise<StockMovementListResponse> {
  const query = new URLSearchParams();
  if (params?.movement_type && params.movement_type !== "all") {
    query.set("movement_type", params.movement_type);
  }
  if (params?.sku) query.set("sku", params.sku);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  const qs = query.toString();
  return adminApiClient<StockMovementListResponse>(
    `/inventory/admin/movements/${qs ? `?${qs}` : ""}`
  );
}
