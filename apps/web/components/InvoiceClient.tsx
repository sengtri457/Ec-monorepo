"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Order, DeliveryShipment } from "@/types";
import { getOrderById } from "@/lib/orders";
import { fetchOrderDetail, fetchDeliveryTracking } from "@/lib/api";
import { downloadInvoice } from "@/lib/downloadInvoice";
import { toKhr } from "@/lib/cambodiaLocations";
import OrderStepper from "@/components/OrderStepper";
import BakongKhqrCard from "@/components/BakongKhqrCard";
import { buildBakongKhqr } from "@/lib/khqr";
import DeliveryTrackingCard from "@/components/delivery/DeliveryTrackingCard";

interface InvoiceClientProps {
  orderId: string;
  token?: string;
}

export default function InvoiceClient({ orderId, token }: InvoiceClientProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [shipment, setShipment] = useState<DeliveryShipment | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(orderId));

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let isMounted = true;

    async function loadOrder() {
      // 1. Try local storage first for instantaneous preview
      const localFound = getOrderById(orderId);
      if (localFound && isMounted) {
        setOrder(localFound);
        setIsLoading(false);
      }

      // 2. Fetch live official order record from Django backend
      try {
        const remoteOrder = await fetchOrderDetail(orderId, token);
        if (remoteOrder && isMounted) {
          setOrder(remoteOrder);
          setIsLoading(false);

          if (remoteOrder.trackingNumber) {
            try {
              const liveShipment = await fetchDeliveryTracking(remoteOrder.trackingNumber);
              if (liveShipment && isMounted) {
                setShipment(liveShipment);
              }
            } catch {
              // Ignore tracking fetch failure
            }
          }
          return;
        }
      } catch {
        // Fall back to local record
      }

      // 3. Fallback check for local storage
      if (!localFound && isMounted) {
        const retryFound = getOrderById(orderId);
        setOrder(retryFound || null);
        setIsLoading(false);
      }
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, token]);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-4xl items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-3 text-ink-soft">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="text-xs uppercase tracking-wider">Generating invoice...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="border border-border bg-paper p-10 shadow-sm">
          <span className="type-label text-xs uppercase tracking-widest text-ctrl-red">
            Invoice Not Found
          </span>
          <h1 className="type-display mt-3 text-2xl font-bold tracking-tight text-ink">
            Order Reference &ldquo;{orderId}&rdquo; Not Found
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft max-w-sm mx-auto">
            We could not find this order record in your local session.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link
              href="/catalog"
              className="type-label inline-flex items-center gap-2 bg-ink px-6 py-3 text-xs uppercase tracking-widest text-paper hover:bg-ink-soft transition-colors"
            >
              <span>Explore Catalog</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const trackingNumber = order.trackingNumber || `KH-${order.id.slice(-7)}`;
  const shippingCost = typeof order.shippingCost === "number" ? order.shippingCost : 0;
  
  const shippingName = order.customer.shippingMethod === "phnom_penh_express"
    ? "Phnom Penh Express (Same-Day Rider)"
    : order.customer.shippingMethod === "phnom_penh_standard"
    ? "Phnom Penh Standard (Next Day Delivery)"
    : `Provincial Delivery (${order.customer.cityProvince})`;

  const isPaid = order.paymentStatus === "PAID" || order.status === "processing" || order.status === "delivered";

  const paymentBadge = isPaid
    ? { label: "Paid via KHQR", color: "bg-forest/10 text-forest border-forest/30" }
    : order.customer.paymentMethod === "cod"
    ? { label: "Cash on Delivery (Pending)", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" }
    : order.customer.paymentMethod === "card"
    ? { label: "Card Payment (Pending)", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" }
    : { label: "Awaiting KHQR Payment", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* 3-Step Stepper (Hidden on Print) */}
      <div className="no-print">
        <OrderStepper currentStep={3} />
      </div>

      {/* Confirmation & Action Top Bar (Hidden on Print) */}
      <div className="no-print mb-6 border border-border bg-paper p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest text-xs font-bold">
            ✓
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="type-label text-xs uppercase tracking-wider text-ink font-semibold">
                Order Confirmed
              </h2>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-medium uppercase ${paymentBadge.color}`}>
                {paymentBadge.label}
              </span>
            </div>
            <p className="text-xs text-ink-soft mt-0.5">
              Receipt reference <strong className="text-ink tabular-nums">{order.id}</strong> dispatched to {order.customer.phone}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {trackingNumber && (
            <Link
              href={`/tracking/${trackingNumber}`}
              className="type-label inline-flex items-center justify-center gap-1.5 border border-ctrl-red/30 bg-ctrl-red/10 px-4 py-2 text-xs uppercase tracking-wider text-ctrl-red hover:bg-ctrl-red hover:text-paper transition-all cursor-pointer font-semibold shadow-xs"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-ctrl-red animate-ping" />
              <span>Live Tracking Map &rarr;</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="type-label inline-flex items-center justify-center border border-border bg-canvas px-4 py-2 text-xs uppercase tracking-wider text-ink hover:border-ink hover:bg-paper transition-colors cursor-pointer"
          >
            <svg
              className="mr-1.5 h-3.5 w-3.5 text-ink-soft"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Invoice Only
          </button>

          <button
            type="button"
            onClick={() => downloadInvoice(order)}
            className="type-label inline-flex items-center justify-center gap-1.5 bg-ink px-4 py-2 text-xs uppercase tracking-wider text-paper hover:bg-ink-soft transition-colors cursor-pointer font-semibold shadow-xs"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Download Invoice (.html)</span>
          </button>
        </div>
      </div>

      {/* Live Delivery & Fulfillment Tracking Card (Hidden on Print) */}
      {shipment && (
        <div className="no-print">
          <DeliveryTrackingCard initialShipment={shipment} />
        </div>
      )}

      {/* ISOLATED PRINTABLE INVOICE CARD (Only this card prints!) */}
      <div className="printable-invoice-card border border-border bg-paper shadow-sm overflow-hidden">
        {/* Brand Header with Logo */}
        <div className="border-b-2 border-ink p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-paper">
          <div className="flex items-center gap-4">
            {/* Prominent Official Logo */}
            <div className="relative h-12 w-14 shrink-0 bg-canvas/60 p-1 border border-border flex items-center justify-center">
              <Image
                src="/images/logoDevs.png"
                alt="Clothes Brand Logo"
                fill
                sizes="56px"
                className="object-contain p-1"
                priority
              />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="type-display text-2xl font-bold tracking-tight text-ink">
                  Clothes<span className="text-xs align-super font-sans text-ink-soft">™</span>
                </span>
                <span className="text-xs font-semibold tracking-widest text-ink-soft uppercase">
                  Apparel Co.
                </span>
              </div>
              <p className="text-xs text-ink-soft tracking-wide mt-0.5">
                Official Commercial Invoice &bull; Phnom Penh, Cambodia
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs">
            <span className="text-[10px] uppercase tracking-widest text-ink-soft block font-medium">
              Invoice Reference
            </span>
            <span className="text-sm font-bold text-ink mt-0.5 block tabular-nums">{order.id}</span>
            <span className="text-ink-soft mt-1 block">{formattedDate}</span>
          </div>
        </div>

        {/* Key Info Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border bg-canvas/30 divide-y md:divide-y-0 divide-x divide-border">
          <div className="p-4">
            <span className="type-label text-[10px] uppercase tracking-wider text-ink-soft block">
              Courier Tracking
            </span>
            <Link
              href={`/tracking/${trackingNumber}`}
              className="text-xs font-semibold tabular-nums text-ctrl-red hover:underline mt-0.5 inline-flex items-center gap-1 group"
            >
              <span>{trackingNumber}</span>
              <span className="text-[10px] group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>
          <div className="p-4">
            <span className="type-label text-[10px] uppercase tracking-wider text-ink-soft block">
              Delivery Method
            </span>
            <span className="text-xs font-medium text-ink mt-0.5 block truncate">
              {shippingName.split("(")[0]}
            </span>
          </div>
          <div className="p-4">
            <span className="type-label text-[10px] uppercase tracking-wider text-ink-soft block">
              Payment Method
            </span>
            <span className="text-xs font-medium text-ink mt-0.5 block uppercase">
              {order.customer.paymentMethod === "khqr"
                ? "KHQR (Bakong / ABA)"
                : order.customer.paymentMethod === "cod"
                ? "Cash on Delivery"
                : "Card Payment"}
            </span>
          </div>
          <div className="p-4">
            <span className="type-label text-[10px] uppercase tracking-wider text-ink-soft block">
              Payment Status
            </span>
            <span className="text-xs font-semibold text-forest mt-0.5 inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-forest" />
              {order.customer.paymentMethod === "cod" ? "Due at Delivery" : "Paid"}
            </span>
          </div>
        </div>

        {/* Customer & Delivery Address Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-border divide-y md:divide-y-0 md:divide-x divide-border p-6 sm:p-8 gap-6 md:gap-8">
          <div>
            <span className="type-label text-[10px] uppercase tracking-widest text-ink-soft block mb-2">
              Deliver To (Recipient)
            </span>
            <p className="text-sm font-bold text-ink">{order.customer.name}</p>
            <p className="text-xs text-ink-soft mt-1 leading-relaxed">
              {order.customer.streetAddress || order.customer.address}
            </p>
            {order.customer.sangkatCommune && (
              <p className="text-xs text-ink-soft">
                Sangkat {order.customer.sangkatCommune}
                {order.customer.khanDistrict ? `, Khan ${order.customer.khanDistrict}` : ""}
              </p>
            )}
            <p className="text-xs text-ink-soft">
              {order.customer.cityProvince || "Phnom Penh"}, Cambodia
            </p>
            {order.customer.landmark && (
              <p className="text-[11px] text-ink-soft mt-1 italic">
                Landmark: &ldquo;{order.customer.landmark}&rdquo;
              </p>
            )}
          </div>

          <div>
            <span className="type-label text-[10px] uppercase tracking-widest text-ink-soft block mb-2">
              Courier Contact &amp; Coordination
            </span>
            <p className="text-xs text-ink tabular-nums">
              Phone: <strong>{order.customer.phone}</strong>
            </p>
            {order.customer.telegram && (
              <p className="text-xs text-ink mt-1">
                Telegram: <strong className="text-ctrl-red">{order.customer.telegram}</strong>
              </p>
            )}
            {order.customer.email && (
              <p className="text-xs text-ink-soft mt-1">
                Email: {order.customer.email}
              </p>
            )}
            {order.customer.orderNotes && (
              <div className="mt-3 border border-border bg-canvas p-2.5 text-[11px] text-ink-soft">
                <span className="font-semibold text-ink">Customer Notes:</span> &ldquo;
                {order.customer.orderNotes}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Itemized Table (NO ITEM IMAGES, CLEAN TYPOGRAPHY) */}
        <div className="p-6 sm:p-8">
          <span className="type-label text-[10px] uppercase tracking-widest text-ink-soft block mb-3">
            Itemized Order Slip
          </span>

          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-left text-xs min-w-[460px]">
              <thead className="border-b border-border text-[10px] uppercase tracking-wider text-ink-soft bg-canvas/30">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">SKU</th>
                  <th className="py-2.5 px-4 font-semibold">Item Description</th>
                  <th className="py-2.5 px-4 text-center font-semibold">Qty</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Unit Price</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {order.items.map((item) => {
                  const itemKey = item.id || `${item.productId}-${item.selectedSize || ''}-${item.selectedColor || ''}`;
                  return (
                    <tr key={itemKey} className="hover:bg-canvas/20 transition-colors">
                      <td className="py-3 px-4 text-ink-soft text-[11px] tabular-nums">
                        {item.sku || `CLO-${item.productId.toString().padStart(4, "0")}`}
                      </td>
                      <td className="py-3 px-4 font-medium text-ink">
                        <div>{item.title}</div>
                        {(item.selectedSize || item.selectedColor) && (
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-ink-soft">
                            {item.selectedSize && (
                              <span>
                                Size: <strong className="text-ink font-semibold">{item.selectedSize}</strong>
                              </span>
                            )}
                            {item.selectedSize && item.selectedColor && <span>&bull;</span>}
                            {item.selectedColor && (
                              <span>
                                Color: <strong className="text-ink font-semibold">{item.selectedColor}</strong>
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-ink-soft tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-right text-ink-soft tabular-nums">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-ink tabular-nums">
                        ${(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Section with Dual Currency (USD & KHR) */}
          <div className="mt-6 border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div className="text-xs text-ink-soft max-w-sm space-y-2">
              <p className="font-semibold text-ink text-[11px] uppercase tracking-wider">
                Certified Store Invoice
              </p>
              <p className="text-[11px] leading-relaxed">
                Thank you for your order. For assistance or exchange inquiries, reach our team via Telegram or telephone.
              </p>
              <p className="text-[10px] text-ink-soft pt-0.5">
                Clothes™ Cambodia &bull; Contact: 012 345 678 &bull; Telegram: @clothescambodia
              </p>

              {/* Official NBC Bakong KHQR Card on Invoice */}
              {order.customer.paymentMethod === "khqr" && (
                <div className="mt-4 flex flex-col sm:flex-row items-center sm:items-start gap-3.5 border border-border bg-canvas/40 p-3">
                  <div className="shrink-0">
                    <BakongKhqrCard
                      payload={buildBakongKhqr({
                        accountId: process.env.NEXT_PUBLIC_BAKONG_ACCOUNT_ID || "clothes@abaa",
                        merchantName: process.env.NEXT_PUBLIC_BAKONG_MERCHANT_NAME || "DevClothes",
                        merchantCity: "Phnom Penh",
                        amount: order.total > 0 ? order.total : 1,
                        currency: "USD",
                        billNumber: order.id,
                      }).qr}
                      merchantName={process.env.NEXT_PUBLIC_BAKONG_MERCHANT_NAME || "DevClothes"}
                      amount={order.total}
                      amountKhr={order.totalKhr}
                      currency="USD"
                      size={130}
                      className="shadow-xs"
                    />
                  </div>
                  <div className="text-[11px] text-ink-soft leading-tight space-y-1">
                    <span className="font-bold text-ink block uppercase text-[11px] text-ctrl-red">
                      Official Bakong KHQR
                    </span>
                    <span className="block text-[10px]">
                      National Bank of Cambodia EMVCo Standard
                    </span>
                    <span className="block text-ink font-semibold text-[11px] tabular-nums">
                      Ref: {order.id}
                    </span>
                    <span className="block text-forest font-medium text-[10px]">
                      Scan with ABA, Wing, ACLEDA, or Bakong
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span className="text-ink font-medium tabular-nums">${order.subtotal.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Delivery Fee</span>
                <span className="text-ink font-medium tabular-nums">
                  {shippingCost === 0 ? "FREE" : `$${shippingCost.toFixed(2)} USD`}
                </span>
              </div>
              <div className="border-t-2 border-ink pt-3 flex justify-between items-baseline">
                <div>
                  <span className="font-sans font-bold uppercase tracking-wider text-ink text-xs block">
                    Total Amount
                  </span>
                  <span className="text-[11px] text-ink-soft tabular-nums">
                    ≈ {toKhr(order.total)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="type-display text-2xl font-bold text-ink tabular-nums">
                    ${order.total.toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-ink-soft">USD</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation bar (Hidden on Print) */}
        <div className="no-print border-t border-border bg-canvas/30 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/catalog"
            className="type-label inline-flex items-center gap-1.5 text-xs text-ink hover:text-ctrl-red transition-colors underline underline-offset-4"
          >
            &larr; Continue Shopping
          </Link>

          <div className="text-[11px] text-ink-soft">
            Clothes™ Apparel Co. &bull; Phnom Penh, Cambodia
          </div>
        </div>
      </div>
    </div>
  );
}
