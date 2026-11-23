"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  User,
  MapPin,
  CreditCard,
  AlertCircle,
  FileText,
  Navigation,
  ShieldAlert,
} from "lucide-react";
import { AdminOrderDetail } from "@ec/types";
import { fetchAdminOrderDetail, updateAdminOrderStatus } from "@/lib/api/ordersApi";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const resolvedParams = React.use(params);
  const orderNumber = resolvedParams.orderNumber;

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusNote, setStatusNote] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchAdminOrderDetail(orderNumber);
      setOrder(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load order details.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleStatusTransition = async (newStatus: string) => {
    setIsUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await updateAdminOrderStatus(orderNumber, {
        status: newStatus,
        notes: statusNote.trim() || `Advanced status to ${newStatus}`,
      });
      setOrder(updated);
      setSuccessMessage(`Order fulfillment status updated to ${newStatus}.`);
      setStatusNote("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update order status.";
      setErrorMessage(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePaymentStatusUpdate = async (newPaymentStatus: string) => {
    setIsUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await updateAdminOrderStatus(orderNumber, {
        payment_status: newPaymentStatus,
        notes: `Payment status marked as ${newPaymentStatus}`,
      });
      setOrder(updated);
      setSuccessMessage(`Payment status updated to ${newPaymentStatus}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update payment status.";
      setErrorMessage(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const formatCurrency = (val?: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num || 0);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
          <span>Retrieving order #{orderNumber}...</span>
        </div>
      </div>
    );
  }

  if (errorMessage && !order) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-800">
        <ShieldAlert className="mx-auto h-8 w-8 text-rose-600 mb-2" />
        <h3 className="font-bold text-sm">Failed to load order</h3>
        <p className="mt-1">{errorMessage}</p>
        <Link
          href="/orders"
          className="mt-4 inline-flex items-center gap-1 font-semibold text-slate-900 underline"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Orders Queue
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const currentStatus = (order.status || "PENDING").toUpperCase();
  const paymentStatus = ((order as any).payment_status || order.paymentStatus || "PENDING").toUpperCase();
  const items = (order as any).items || [];
  const statusHistory = (order as any).status_history || order.statusHistory || [];
  const shipment = (order as any).shipment || order.shipment;

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Back to Orders Queue</span>
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-900">
                {order.orderNumber || (order as any).order_number}
              </h1>
              <span className="rounded-md bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white uppercase">
                {currentStatus}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                  paymentStatus === "PAID"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                PAYMENT: {paymentStatus}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Placed on {new Date(order.createdAt || (order as any).created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Fulfillment Status Lifecycle Control Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Fulfillment Stage Progression
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Advance the workflow step for this order.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentStatus === "PENDING" && (
              <button
                onClick={() => handleStatusTransition("CONFIRMED")}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Confirm Order</span>
              </button>
            )}

            {(currentStatus === "PENDING" || currentStatus === "CONFIRMED") && (
              <button
                onClick={() => handleStatusTransition("PROCESSING")}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition cursor-pointer disabled:opacity-50"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Send to Warehouse Packing</span>
              </button>
            )}

            {(currentStatus === "CONFIRMED" || currentStatus === "PROCESSING") && (
              <button
                onClick={() => handleStatusTransition("SHIPPED")}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Dispatch / Hand to Courier</span>
              </button>
            )}

            {currentStatus === "SHIPPED" && (
              <button
                onClick={() => handleStatusTransition("DELIVERED")}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Mark Delivered to Customer</span>
              </button>
            )}

            {paymentStatus !== "PAID" && (
              <button
                onClick={() => handlePaymentStatusUpdate("PAID")}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer disabled:opacity-50"
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Mark Payment Paid</span>
              </button>
            )}

            {currentStatus !== "CANCELLED" && currentStatus !== "DELIVERED" && (
              <button
                onClick={() => handleStatusTransition("CANCELLED")}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Cancel Order</span>
              </button>
            )}
          </div>
        </div>

        {/* Transition Note Input */}
        <div className="mt-3 border-t border-slate-100 pt-3">
          <input
            type="text"
            placeholder="Audit note for this status change (e.g. Courier tracking assigned, inspected in packing)..."
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Main Grid: Order Details & Sidebar Info */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Items & Financials & History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order Items */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-sm font-bold text-slate-900">Order Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3">Product Item</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Variant</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item: any, idx: number) => {
                    const title = item.product_title || item.productTitle || "Product";
                    const sku = item.sku || "-";
                    const size = item.size;
                    const color = item.color;
                    const price = item.unit_price || item.unitPrice || 0;
                    const qty = item.quantity || 1;
                    const lineTotal = item.line_total || item.lineTotal || price * qty;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{title}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-600">{sku}</td>
                        <td className="px-4 py-3.5 text-slate-600">
                          {size && <span className="font-semibold">{size}</span>}
                          {size && color && <span> / </span>}
                          {color && <span>{color}</span>}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-slate-800">
                          {formatCurrency(price)}
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-slate-900">
                          {qty}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                          {formatCurrency(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="border-t border-slate-200 bg-slate-50/50 px-6 py-4">
              <div className="flex flex-col items-end space-y-1.5 text-xs">
                <div className="flex w-64 justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency((order as any).subtotal || (order as any).total_usd)}
                  </span>
                </div>
                <div className="flex w-64 justify-between text-slate-600">
                  <span>Shipping Fee:</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency((order as any).shipping_cost || 0)}
                  </span>
                </div>
                <div className="flex w-64 justify-between text-slate-600">
                  <span>Tax:</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency((order as any).tax || 0)}
                  </span>
                </div>
                <div className="flex w-64 justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
                  <span>Grand Total:</span>
                  <span>{formatCurrency((order as any).total_usd || order.total)}</span>
                </div>
                {(order as any).total_khr && (
                  <div className="flex w-64 justify-between text-[11px] text-slate-500">
                    <span>In Khmer Riel (KHR):</span>
                    <span className="font-mono">
                      {new Intl.NumberFormat("km-KH").format((order as any).total_khr)} KHR
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status Change Audit Trail */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4">
              Status Change History & Audit Trail
            </h3>
            {statusHistory.length === 0 ? (
              <p className="text-xs text-slate-400">No status changes recorded yet.</p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {statusHistory.map((h: any, i: number) => {
                  const date = new Date(h.created_at || h.createdAt).toLocaleString();
                  const from = (h.from_status || h.fromStatus || "START").toUpperCase();
                  const to = (h.to_status || h.toStatus).toUpperCase();
                  const notes = h.notes || "Status updated";

                  return (
                    <div key={i} className="relative">
                      <div className="absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-800 shadow-xs" />
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {from} &rarr; {to}
                          </span>
                          <span className="text-[11px] text-slate-400">{date}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{notes}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Customer & Delivery Info & Shipment Card */}
        <div className="space-y-6">
          {/* Customer Snapshot */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-3 text-sm">
              <User className="h-4 w-4 text-slate-500" />
              <span>Customer Information</span>
            </div>
            <div className="space-y-2 text-slate-700">
              <div>
                <span className="text-slate-400 block text-[11px]">Full Name</span>
                <span className="font-semibold text-slate-900">
                  {(order as any).customer_name || (order as any).customerName || "Customer"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Contact Phone</span>
                <span className="font-mono font-medium">
                  {(order as any).customer_phone || (order as any).customerPhone || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Email Address</span>
                <span className="font-medium">
                  {(order as any).customer_email || (order as any).customerEmail || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery Destination */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-3 text-sm">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span>Delivery Address</span>
            </div>
            <div className="space-y-2 text-slate-700">
              <div>
                <span className="text-slate-400 block text-[11px]">Street & Landmark</span>
                <p className="font-medium text-slate-900">
                  {(order as any).street_address || (order as any).streetAddress || "-"}
                </p>
                {(order as any).landmark && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Near: {(order as any).landmark}
                  </p>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">District / Sangkat</span>
                <p className="font-medium">
                  {[(order as any).khan_district, (order as any).sangkat_commune]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">City / Province</span>
                <p className="font-semibold text-slate-900">
                  {(order as any).city_province || (order as any).cityProvince || "Phnom Penh"}
                </p>
              </div>
              {(order as any).order_notes && (
                <div className="border-t border-slate-100 pt-2">
                  <span className="text-slate-400 block text-[11px]">Customer Notes</span>
                  <p className="italic text-slate-600">{(order as any).order_notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Courier Delivery Shipment Card (if dispatch created) */}
          {shipment && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-xs text-xs">
              <div className="flex items-center gap-2 font-bold text-blue-900 mb-3 text-sm">
                <Truck className="h-4 w-4 text-blue-600" />
                <span>Courier Dispatch Details</span>
              </div>
              <div className="space-y-2.5 text-slate-700">
                <div>
                  <span className="text-blue-700 block text-[11px] font-semibold">
                    Tracking Number
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {shipment.tracking_number || shipment.trackingNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Courier / Service</span>
                  <span className="font-medium">
                    {shipment.courier_name || shipment.courierName} ({shipment.courier_phone || shipment.courierPhone})
                  </span>
                </div>
                {shipment.driver_name && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">Assigned Driver</span>
                    <span className="font-medium">
                      {shipment.driver_name} ({shipment.driver_phone || "No phone"})
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block text-[11px]">Dispatch Status</span>
                  <span className="inline-block rounded bg-blue-100 px-2 py-0.5 font-bold text-blue-800 text-[11px]">
                    {shipment.status}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
