"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Order } from "@/types";
import { getOrders } from "@/lib/orders";
import { fetchCustomerOrders } from "@/lib/api";
import { toKhr } from "@/lib/cambodiaLocations";

// Fallback demo orders for initial presentation if no orders have been placed locally
const DEMO_ORDERS: Order[] = [
  {
    id: "ORD-20261122-8492",
    createdAt: new Date().toISOString(),
    customer: {
      name: "Sophea Chan",
      email: "sophea.chan@gmail.com",
      phone: "012889977",
      telegram: "@sopheachan",
      address: "House #42, Street 310, Boeung Keng Kang 1",
      cityProvince: "Phnom Penh",
      khanDistrict: "Chamkarmon",
      sangkatCommune: "Boeung Keng Kang 1 (BKK1)",
      streetAddress: "House #42, Street 310",
      landmark: "Near Brown Coffee BKK57",
      shippingMethod: "phnom_penh_express",
      paymentMethod: "khqr",
    },
    items: [
      {
        productId: 1,
        title: "Boxy Heavyweight Tee - Vintage Wash",
        price: 38,
        selectedSize: "L",
        selectedColor: "Washed Black",
        quantity: 2,
        thumbnail: "/collection/ctrl-tee.webp",
      },
    ],
    subtotal: 76,
    shippingCost: 2.5,
    tax: 0,
    total: 78.5,
    totalKhr: 321850,
    status: "out_for_delivery",
    paymentStatus: "PAID",
    trackingNumber: "EXP-PP-8492",
  },
  {
    id: "ORD-20261118-2910",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    customer: {
      name: "Sophea Chan",
      email: "sophea.chan@gmail.com",
      phone: "012889977",
      telegram: "@sopheachan",
      address: "House #42, Street 310, Boeung Keng Kang 1",
      cityProvince: "Phnom Penh",
      khanDistrict: "Chamkarmon",
      sangkatCommune: "Boeung Keng Kang 1 (BKK1)",
      streetAddress: "House #42, Street 310",
      landmark: "Near Brown Coffee BKK57",
      shippingMethod: "phnom_penh_standard",
      paymentMethod: "cod",
    },
    items: [
      {
        productId: 2,
        title: "Pleated Wide-Leg Trousers",
        price: 65,
        selectedSize: "32",
        selectedColor: "Charcoal",
        quantity: 1,
        thumbnail: "/collection/ctrl-trouser.webp",
      },
    ],
    subtotal: 65,
    shippingCost: 0,
    tax: 0,
    total: 65,
    totalKhr: 266500,
    status: "delivered",
    paymentStatus: "PAID",
    trackingNumber: "STD-PP-2910",
  },
];

export default function OrderHistoryTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadOrders() {
      setIsLoading(true);
      try {
        const backendOrders = await fetchCustomerOrders();
        if (isMounted && backendOrders && backendOrders.length > 0) {
          setOrders(backendOrders);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Backend orders fetch error, falling back to local:", e);
      }

      // Fallback to local storage
      const localOrders = getOrders();
      if (isMounted) {
        if (localOrders && localOrders.length > 0) {
          setOrders(localOrders);
        } else {
          setOrders(DEMO_ORDERS);
        }
        setIsLoading(false);
      }
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const getStatusBadge = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 bg-sage/10 text-sage border border-sage/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-sage"></span>
            Delivered
          </span>
        );
      case "out_for_delivery":
        return (
          <span className="inline-flex items-center gap-1 bg-ctrl-red/10 text-ctrl-red border border-ctrl-red/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-ctrl-red animate-pulse"></span>
            Out for Delivery
          </span>
        );
      case "processing":
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 bg-ink/10 text-ink border border-ink/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-ink"></span>
            Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-surface text-ink-soft border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
            Pending
          </span>
        );
    }
  };

  const getPaymentBadge = (paymentMethod?: string, paymentStatus?: string) => {
    const isPaid = paymentStatus?.toUpperCase() === "PAID";
    if (paymentMethod === "khqr") {
      return (
        <span className="inline-flex items-center gap-1 border border-ctrl-red/40 bg-ctrl-red/5 px-2 py-0.5 text-[10px] font-medium text-ctrl-red">
          <span className="font-semibold">KHQR</span>
          <span>{isPaid ? "Paid" : "Pending"}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-soft">
        <span>COD</span>
        <span>(Cash on Delivery)</span>
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-lg sm:text-xl font-semibold text-ink">
            Order History
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Review past orders, track live Cambodia courier dispatch, and access official invoices.
          </p>
        </div>

        <Link
          href="/catalog"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 border border-border bg-paper text-ink px-3 py-1.5 text-xs font-medium hover:border-ink hover:bg-surface transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="border border-border bg-paper p-6 animate-pulse space-y-4">
              <div className="h-4 bg-surface rounded w-1/3" />
              <div className="h-12 bg-surface/60 rounded" />
              <div className="h-4 bg-surface rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="border border-border bg-paper p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-soft mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="font-heading text-sm font-semibold text-ink">No orders yet</h3>
          <p className="text-xs text-ink-soft max-w-sm mx-auto mt-1 mb-5">
            When you purchase items from our curated collections, your receipts and tracking will appear here.
          </p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 border border-ink bg-ink text-paper px-4 py-2 text-xs font-medium hover:bg-charcoal transition-colors"
          >
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border border-border bg-paper shadow-xs overflow-hidden transition-all hover:border-border-strong"
            >
              {/* Card Header */}
              <div className="border-b border-border bg-surface/40 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-soft block">
                      Order Reference
                    </span>
                    <span className="font-mono font-semibold text-ink">
                      {order.id}
                    </span>
                  </div>
                  <span className="text-border-strong">·</span>
                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-soft block">
                      Date Placed
                    </span>
                    <span className="text-ink">{formatDate(order.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getPaymentBadge(order.customer?.paymentMethod, order.paymentStatus)}
                  {getStatusBadge(order.status)}
                </div>
              </div>

              {/* Items List */}
              <div className="p-4 sm:p-6 divide-y divide-border/60">
                {order.items.map((item, idx) => (
                  <div
                    key={`${order.id}-${item.productId}-${idx}`}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-14 w-12 shrink-0 bg-surface border border-border overflow-hidden">
                        {item.thumbnail ? (
                          <Image
                            src={item.thumbnail}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-soft">
                            Item
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-xs text-ink truncate">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-ink-soft mt-0.5">
                          {item.selectedSize && `Size: ${item.selectedSize}`}
                          {item.selectedSize && item.selectedColor && " · "}
                          {item.selectedColor && `Color: ${item.selectedColor}`}
                          {" · "}
                          <span>Qty: {item.quantity}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-ink font-mono">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-ink-soft font-mono">
                        {toKhr(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Footer */}
              <div className="border-t border-border bg-paper px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-ink-soft">Total:</span>
                  <span className="font-heading font-semibold text-sm text-ink font-mono">
                    ${order.total.toFixed(2)} USD
                  </span>
                  <span className="text-[11px] text-ink-soft font-mono">
                    ({toKhr(order.total)})
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Link
                    href={`/tracking/${order.trackingNumber || order.id}`}
                    className="border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-ink hover:bg-paper transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-ctrl-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Track Delivery</span>
                  </Link>

                  <Link
                    href={`/invoice/${order.id}`}
                    className="border border-ink bg-ink text-paper px-3.5 py-1.5 text-xs font-medium hover:bg-charcoal transition-colors inline-flex items-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>View Invoice</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
