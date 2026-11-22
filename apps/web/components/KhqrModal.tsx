"use client";

import React, { useState, useEffect, useRef } from "react";
import { checkPaymentStatus } from "@/lib/api";
import { buildBakongKhqr } from "@/lib/khqr";
import BakongKhqrCard from "@/components/BakongKhqrCard";

interface KhqrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderNumber: string) => void;
  paymentId: string;
  orderNumber: string;
  khqrPayload: string;
  amountUsd: number;
  amountKhr: number;
}

export default function KhqrModal({
  isOpen,
  onClose,
  onSuccess,
  paymentId,
  orderNumber,
  khqrPayload,
  amountUsd,
  amountKhr,
}: KhqrModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 minutes
  const [isPaid, setIsPaid] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Compute active QR payload: uses backend generated payload if present, or builds with configured env
  const activePayload = React.useMemo(() => {
    if (khqrPayload) return khqrPayload;

    const accountId =
      process.env.NEXT_PUBLIC_BAKONG_ACCOUNT_ID ||
      process.env.BAKONG_ACCOUNT_ID ||
      "";
    const merchantName =
      process.env.NEXT_PUBLIC_BAKONG_MERCHANT_NAME ||
      process.env.BAKONG_MERCHANT_NAME ||
      "DevClothes";

    return buildBakongKhqr({
      accountId: accountId || "clothes@abaa",
      merchantName: merchantName,
      merchantCity: "Phnom Penh",
      amount: amountUsd,
      currency: "USD",
      billNumber: orderNumber,
    }).qr;
  }, [khqrPayload, amountUsd, orderNumber]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || isPaid) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isPaid]);

  // Polling loop to check if customer completed payment
  useEffect(() => {
    if (!isOpen || !paymentId || isPaid) return;

    const poll = async () => {
      try {
        const result = await checkPaymentStatus(paymentId);
        if (result.status === "COMPLETED") {
          setIsPaid(true);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setTimeout(() => {
            onSuccess(orderNumber);
          }, 1200);
        }
      } catch {
        // Silent failure during polling to avoid interrupting checkout
      }
    };

    poll();
    pollIntervalRef.current = setInterval(poll, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, paymentId, isPaid, orderNumber, onSuccess]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="khqr-modal-title"
        className="relative z-10 w-full max-w-sm overflow-hidden border border-border bg-paper p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="bg-ctrl-red text-paper font-bold text-[10px] px-2 py-0.5 tracking-wider uppercase">
              KHQR
            </span>
            <span id="khqr-modal-title" className="type-label text-xs uppercase tracking-widest text-ink font-semibold">
              Bakong Dynamic QR
            </span>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-soft hover:text-ink text-sm cursor-pointer p-1"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content State */}
        {isPaid ? (
          <div className="py-12 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest text-paper text-2xl font-bold animate-bounce">
              ✓
            </div>
            <h3 className="type-display text-xl font-bold text-ink">Payment Confirmed!</h3>
            <p className="text-xs text-ink-soft">
              Settled via NBC Bakong Network. Generating official receipt...
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Official NBC Bakong KHQR Standee Card with Dynamic DevClothes & Dynamic Price */}
            <div className="py-1">
              <BakongKhqrCard
                payload={activePayload}
                merchantName={process.env.NEXT_PUBLIC_BAKONG_MERCHANT_NAME || "DevClothes"}
                amount={amountUsd}
                amountKhr={amountKhr}
                currency="USD"
                size={210}
                className="shadow-md"
              />
            </div>

            <div className="text-[11px] text-ink-soft">
              Order Ref: <span className="font-bold text-ink tabular-nums">{orderNumber}</span>
            </div>

            {/* Timer and instructions */}
            <div className="space-y-1 text-xs">
              {secondsRemaining > 0 ? (
                <>
                  <div className="flex items-center justify-center gap-2 text-ink">
                    <span className="h-2 w-2 rounded-full bg-ctrl-red animate-ping" />
                    <span className="font-bold tabular-nums">Awaiting Scan: {timeFormatted}</span>
                  </div>
                  <p className="text-[11px] text-ink-soft leading-tight">
                    Scan with <strong>ABA Mobile</strong>, <strong>Wing</strong>, <strong>ACLEDA</strong>, or any Bakong app.
                  </p>
                </>
              ) : (
                <div className="rounded border border-amber-300 bg-amber-50 p-2.5 text-amber-900">
                  <p className="font-bold">QR Code Expired</p>
                  <p className="text-[11px] mt-0.5">The 5-minute payment session has timed out.</p>
                  <button
                    type="button"
                    onClick={() => setSecondsRemaining(300)}
                    className="mt-2 px-3 py-1 bg-ink text-paper text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-ink-soft transition-colors"
                  >
                    Refresh Payment QR
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
