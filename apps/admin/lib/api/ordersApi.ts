import { adminApiClient } from "../adminApiClient";
import { AdminOrderSummary, AdminOrderDetail } from "@ec/types";

export interface AdminOrderListResponse {
  count: number;
  results: AdminOrderSummary[];
}

export interface OrderStatusUpdatePayload {
  status?: string;
  payment_status?: string;
  notes?: string;
}

export async function fetchAdminOrders(params?: {
  status?: string;
  payment_status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminOrderListResponse> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "ALL") query.set("status", params.status);
  if (params?.payment_status && params.payment_status !== "ALL") {
    query.set("payment_status", params.payment_status);
  }
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  const qs = query.toString();
  return adminApiClient<AdminOrderListResponse>(`/orders/admin/${qs ? `?${qs}` : ""}`);
}

export async function fetchAdminOrderDetail(orderNumber: string): Promise<AdminOrderDetail> {
  return adminApiClient<AdminOrderDetail>(`/orders/admin/${orderNumber}/`);
}

export async function updateAdminOrderStatus(
  orderNumber: string,
  payload: OrderStatusUpdatePayload
): Promise<AdminOrderDetail> {
  return adminApiClient<AdminOrderDetail>(`/orders/admin/${orderNumber}/status/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
