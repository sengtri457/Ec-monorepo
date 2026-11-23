"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  X,
  ExternalLink,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  CreditCard,
  MapPin,
  User,
  Package,
  ArrowRight,
  Loader2,
  AlertCircle,
  Phone,
} from "lucide-react";
import { AdminOrderDetail } from "@ec/types";
import { fetchAdminOrderDetail, updateAdminOrderStatus } from "@/lib/api/ordersApi";

interface OrderDrawerProps {
  orderNumber: string | null;
  onClose: () => void;
  onStatusChanged?: (newStatus: string) => void;
}

export function OrderDrawer({ orderNumber, onClose, onStatusChanged }: OrderDrawerProps) {
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const loadOrderDetail = useCallback(async (num: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminOrderDetail(num);
      setOrder(data);
    } catch (err: unknown) {
      console.error("Failed to load order detail:", err);
      const msg = err instanceof Error ? err.message : "Failed to load order details.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orderNumber) {
      loadOrderDetail(orderNumber);
    } else {
      setOrder(null);
    }
  }, [orderNumber, loadOrderDetail]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!orderNumber) return null;

  const handleTransition = async (newStatus: string) => {
    if (!order) return;
    setIsUpdating(true);
    setError(null);
    setSuccessNote(null);
    try {
      const updated = await updateAdminOrderStatus(orderNumber, {
        status: newStatus,
        notes: `Advanced to ${newStatus} via Quick Drawer`,
      });
      setOrder(updated);
      setSuccessNote(`Status transitioned to ${newStatus}`);
      onStatusChanged?.(newStatus);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update order status.";
      setError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!order) return;
    setIsUpdating(true);
    setError(null);
    setSuccessNote(null);
    try {
      const updated = await updateAdminOrderStatus(orderNumber, {
        payment_status: "PAID",
        notes: "Marked payment as PAID via Quick Drawer",
      });
      setOrder(updated);
      setSuccessNote("Payment marked as PAID");
      onStatusChanged?.(order.status || "CONFIRMED");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update payment status.";
      setError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // Field helpers
  const ordNum = order?.orderNumber || order?.order_number || (order as { id?: string })?.id || orderNumber;
  const status = (order?.status || "PENDING").toUpperCase();
  const paymentStatus = (order?.paymentStatus || order?.payment_status || "PENDING").toUpperCase();
  
  const customerName =
    order?.customer?.name ||
    (order as { customer_name?: string })?.customer_name ||
    (order as { customerName?: string })?.customerName ||
    "Customer";

  const customerPhone =
    order?.customer?.phone ||
    (order as { customer_phone?: string })?.customer_phone ||
    (order as { customerPhone?: string })?.customerPhone ||
    "-";

  const customerEmail =
    order?.customer?.email ||
    (order as { customer_email?: string })?.customer_email ||
    (order as { customerEmail?: string })?.customerEmail ||
    "-";

  const deliveryAddress =
    order?.customer?.address ||
    order?.customer?.streetAddress ||
    (order as { shipping_address?: string })?.shipping_address ||
    (order as { deliveryAddress?: string })?.deliveryAddress ||
    "Phnom Penh, Cambodia";

  const city =
    order?.customer?.cityProvince ||
    (order as { city_province?: string })?.city_province ||
    "Phnom Penh";

  const totalAmount =
    order?.total ||
    (order as { total_usd?: number })?.total_usd ||
    (order as { totalUsd?: number })?.totalUsd ||
    (order as { totalAmount?: number })?.totalAmount ||
    0;

  const subtotalAmount =
    order?.subtotal ||
    (order as { subtotal_usd?: number })?.subtotal_usd ||
    totalAmount;

  const shippingCost =
    order?.shippingCost ||
    (order as { shipping_fee_usd?: number })?.shipping_fee_usd ||
    0;

  const rawDate = order?.createdAt || (order as { created_at?: string })?.created_at;
  const dateFormatted = rawDate ? new Date(rawDate).toLocaleString() : "-";

  // Items safe extract
  type RawOrderItem = {
    id?: number | string;
    productTitle?: string;
    product_title?: string;
    title?: string;
    colorName?: string;
    color_name?: string;
    colorHex?: string;
    color_hex?: string;
    size?: string;
    selectedSize?: string;
    quantity?: number;
    unitPrice?: number;
    unit_price?: number;
    price?: number;
    totalPrice?: number;
    total_price?: number;
    thumbnail?: string;
  };
  const items: RawOrderItem[] = (order?.items as unknown as RawOrderItem[]) || [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-drawer-title"
    >
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-neutral-200 flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 id="order-drawer-title" className="text-lg font-bold text-neutral-900 font-mono">
                {ordNum}
              </h2>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  status === "DELIVERED"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                    : status === "SHIPPED"
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20"
                    : status === "PROCESSING"
                    ? "bg-purple-50 text-purple-700 ring-1 ring-purple-600/20"
                    : status === "CONFIRMED"
                    ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20"
                    : status === "CANCELLED"
                    ? "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-neutral-400" />
              <span>Placed {dateFormatted}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/orders/${ordNum}`}
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              title="Open full page"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-800" />
              <span className="text-xs font-medium">Fetching order #{ordNum}...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to display order</p>
                <p className="mt-0.5 text-rose-700">{error}</p>
                <button
                  type="button"
                  onClick={() => loadOrderDetail(ordNum)}
                  className="mt-2 inline-flex items-center gap-1 font-semibold text-rose-900 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Notification banners */}
              {successNote && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successNote}</span>
                  </div>
                  <button
                    onClick={() => setSuccessNote(null)}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Order Actions Lifecycle Bar */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                    Fulfillment Workflow
                  </span>
                  {isUpdating && (
                    <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Updating...
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {status === "PENDING" && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleTransition("CONFIRMED")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Confirm Order
                    </button>
                  )}

                  {status === "CONFIRMED" && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleTransition("PROCESSING")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5 text-amber-400" />
                      Send to Packing (Processing)
                    </button>
                  )}

                  {status === "PROCESSING" && (
                    <>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleTransition("SHIPPED")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5 text-blue-400" />
                        Dispatch Courier (Shipped)
                      </button>
                      <Link
                        href={`/dispatch?orderNumber=${ordNum}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                      >
                        Assign on Map &rarr;
                      </Link>
                    </>
                  )}

                  {status === "SHIPPED" && (
                    <>
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleTransition("DELIVERED")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Delivered
                      </button>
                      <Link
                        href={`/dispatch?orderNumber=${ordNum}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                      >
                        Track Live Courier &rarr;
                      </Link>
                    </>
                  )}

                  {status === "DELIVERED" && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Fulfillment Completed
                    </span>
                  )}

                  {/* Payment settlement button if unpaid */}
                  {paymentStatus !== "PAID" && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={handleMarkPaid}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      Mark as Paid
                    </button>
                  )}

                  {/* Cancel button */}
                  {status !== "DELIVERED" && status !== "CANCELLED" && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => {
                        if (confirm(`Are you sure you want to cancel order #${ordNum}?`)) {
                          handleTransition("CANCELLED");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-50 transition-colors cursor-pointer ml-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>

              {/* Customer & Delivery Information Card */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Customer & Delivery Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs bg-white p-4 rounded-xl border border-neutral-200">
                  <div>
                    <span className="text-[11px] text-neutral-400 block font-medium">Customer Name</span>
                    <span className="font-semibold text-neutral-900 flex items-center gap-1.5 mt-0.5">
                      <User className="w-3.5 h-3.5 text-neutral-400" />
                      {customerName}
                    </span>
                    {customerEmail && customerEmail !== "-" && (
                      <span className="text-[11px] text-neutral-500 block mt-0.5">{customerEmail}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-400 block font-medium">Phone Number</span>
                    <span className="font-semibold text-neutral-900 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      {customerPhone}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-neutral-100">
                    <span className="text-[11px] text-neutral-400 block font-medium">Delivery Address</span>
                    <span className="font-medium text-neutral-800 flex items-start gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                      <span>{deliveryAddress}, {city}</span>
                    </span>
                  </div>
                  {order?.shipment && (
                    <div className="col-span-2 pt-2 border-t border-neutral-100 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-neutral-400 block font-medium">Courier & Vehicle</span>
                        <span className="font-mono text-xs font-semibold text-neutral-900">
                          {order.shipment.driverName || order.shipment.courierName} ({order.shipment.vehicleInfo || "Express"})
                        </span>
                      </div>
                      <Link
                        href={`/dispatch?orderNumber=${ordNum}`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                      >
                        Track Telemetry &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Ordered Items Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Ordered Items ({items.length})
                  </h3>
                </div>

                <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white divide-y divide-neutral-100">
                  {items.length === 0 ? (
                    <div className="p-4 text-center text-xs text-neutral-400">
                      No line items in order
                    </div>
                  ) : (
                    items.map((item, idx) => {
                      const itemTitle = item.productTitle || item.product_title || item.title || "Item";
                      const itemSize = item.size || item.selectedSize || "Standard";
                      const itemColor = item.colorName || item.color_name || "-";
                      const itemHex = item.colorHex || item.color_hex;
                      const itemQty = item.quantity || 1;
                      const itemPrice = item.unitPrice ?? item.unit_price ?? item.price ?? 0;
                      const lineTotal = item.totalPrice ?? item.total_price ?? itemPrice * itemQty;

                      return (
                        <div key={item.id ?? idx} className="p-3.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            {itemHex ? (
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-neutral-300 shrink-0"
                                style={{ backgroundColor: itemHex }}
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-500 shrink-0">
                                <Package className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-neutral-900">{itemTitle}</div>
                              <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                                <span>Size: {itemSize}</span>
                                <span>&bull;</span>
                                <span>Color: {itemColor}</span>
                                <span>&bull;</span>
                                <span>Qty: {itemQty}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-neutral-900">
                              ${Number(lineTotal).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              ${Number(itemPrice).toFixed(2)} ea
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold">${Number(subtotalAmount).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Delivery & Handling</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {shippingCost > 0 ? `$${Number(shippingCost).toFixed(2)}` : "FREE"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Payment Status</span>
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      paymentStatus === "PAID"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {paymentStatus}
                  </span>
                </div>
                <div className="pt-2 border-t border-neutral-200 flex items-center justify-between font-bold text-neutral-900 text-sm">
                  <span>Total Amount (USD)</span>
                  <span className="font-mono font-bold">${Number(totalAmount).toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <Link
            href={`/orders/${ordNum}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900 hover:text-neutral-700 underline"
          >
            <span>Open Dedicated Order Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
