"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth, DEMO_USERS } from "@/context/AuthContext";
import { Customer, Order, ShippingMethod } from "@/types";
import { validateCustomer, ValidationErrors, CheckoutFormState } from "@/lib/validation";
import { saveOrder } from "@/lib/orders";
import { CAMBODIA_PROVINCES, PHNOM_PENH_KHANS, toKhr, KHR_RATE } from "@/lib/cambodiaLocations";
import OrderStepper from "@/components/OrderStepper";
import { submitOrderCheckout } from "@/lib/api";
import KhqrModal from "@/components/KhqrModal";
import { buildBakongKhqr } from "@/lib/khqr";

export default function CheckoutPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { isLoaded, selectedItems: items, selectedItemCount: itemCount, selectedSubtotal: subtotal, removeSelectedItems } = useCart();
  const { isLoaded: isAuthLoaded, user, loginWithDemo } = useAuth();

  const [formData, setFormData] = useState<CheckoutFormState>({
    name: "",
    email: "",
    phone: "",
    telegram: "",
    address: "",
    cityProvince: "Phnom Penh",
    khanDistrict: "Boeng Keng Kang (BKK)",
    sangkatCommune: "Boeung Keng Kang 1",
    streetAddress: "",
    landmark: "",
    shippingMethod: "phnom_penh_express",
    paymentMethod: "khqr",
    cardNumber: "4242 •••• •••• 4242",
    cardExpiry: "12/28",
    cardCvc: "888",
    orderNotes: "",
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmittingServer, setIsSubmittingServer] = useState(false);
  const [khqrData, setKhqrData] = useState<{
    isOpen: boolean;
    paymentId: string;
    orderNumber: string;
    payload: string;
    amountUsd: number;
    amountKhr: number;
  }>({
    isOpen: false,
    paymentId: "",
    orderNumber: "",
    payload: "",
    amountUsd: 0,
    amountKhr: 0,
  });

  // Auto-fill from logged-in user
  useEffect(() => {
    if (user) {
      queueMicrotask(() => {
        setFormData((prev) => ({
          ...prev,
          name: prev.name || user.name,
          email: prev.email || user.email,
          phone: prev.phone || user.phone || "",
          telegram: prev.telegram || user.telegram || "",
          cityProvince: user.address?.cityProvince || prev.cityProvince || "Phnom Penh",
          khanDistrict: user.address?.khanDistrict || prev.khanDistrict || "Boeng Keng Kang (BKK)",
          sangkatCommune: user.address?.sangkatCommune || prev.sangkatCommune || "",
          streetAddress: user.address?.streetAddress || user.address?.street || prev.streetAddress || "",
          landmark: user.address?.landmark || prev.landmark || "",
        }));
      });
    }
  }, [user]);

  // Guard 1: Redirect to login if user is not authenticated
  useEffect(() => {
    if (isAuthLoaded && !user) {
      router.replace("/login?redirect=/checkout");
    }
  }, [isAuthLoaded, user, router]);

  // Guard 2: Redirect to cart if empty
  useEffect(() => {
    if (!isSubmitted && isLoaded && items.length === 0) {
      router.replace("/cart");
    }
  }, [isLoaded, items.length, isSubmitted, router]);

  // Cambodia shipping rates (aligned with Order Service database)
  const getShippingCost = (method: ShippingMethod) => {
    if (subtotal >= 100) return 0;
    if (method === "phnom_penh_standard") {
      return 0; // Phnom Penh Standard is Free Delivery
    }
    if (method === "provincial") {
      return 3.0;
    }
    return 2.5;
  };

  const currentShippingCost = getShippingCost(formData.shippingMethod || "phnom_penh_express");
  const calculatedTotal = Number((subtotal + currentShippingCost).toFixed(2));
  const calculatedTotalKhr = Math.round(calculatedTotal * KHR_RATE);

  const checkoutKhqrPreview = (function() {
    return buildBakongKhqr({
      accountId: process.env.NEXT_PUBLIC_BAKONG_ACCOUNT_ID || "clothes@abaa",
      merchantName: process.env.NEXT_PUBLIC_BAKONG_MERCHANT_NAME || "DevClothes",
      merchantCity: "Phnom Penh",
      amount: calculatedTotal > 0 ? calculatedTotal : 1,
      currency: "USD",
      billNumber: "PREVIEW",
    }).qr;
  })();

  const handleChange = (field: keyof CheckoutFormState, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "cityProvince") {
        if (value !== "Phnom Penh") {
          next.shippingMethod = "provincial";
        } else if (prev.shippingMethod === "provincial") {
          next.shippingMethod = "phnom_penh_express";
        }
      }
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof CheckoutFormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const result = validateCustomer(formData);
    if (result.errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: result.errors[field] }));
    }
  };

  const handleApplyDemoProfile = (demoIndex: number) => {
    const demo = DEMO_USERS[demoIndex];
    if (!demo) return;
    loginWithDemo(demoIndex);
    setFormData((prev) => ({
      ...prev,
      name: demo.name,
      email: demo.email,
      phone: demo.phone || "",
      telegram: demo.telegram || "",
      cityProvince: demo.address?.cityProvince || "Phnom Penh",
      khanDistrict: demo.address?.khanDistrict || "",
      sangkatCommune: demo.address?.sangkatCommune || "",
      streetAddress: demo.address?.streetAddress || "",
      landmark: demo.address?.landmark || "",
      shippingMethod: demo.address?.cityProvince === "Phnom Penh" ? "phnom_penh_express" : "provincial",
    }));
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const allTouched: Record<string, boolean> = {
      name: true,
      phone: true,
      cityProvince: true,
      streetAddress: true,
    };
    if (formData.cityProvince === "Phnom Penh") {
      allTouched.khanDistrict = true;
    }
    setTouched(allTouched);

    const validation = validateCustomer(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstErrorKey = Object.keys(validation.errors)[0];
      const elem = document.getElementById(`field-${firstErrorKey}`);
      if (elem) elem.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const trackingNumber = `KH-${Math.floor(1000000 + Math.random() * 9000000)}`;

    const fullAddressParts = [
      formData.streetAddress?.trim(),
      formData.sangkatCommune ? `Sangkat ${formData.sangkatCommune.trim()}` : null,
      formData.khanDistrict ? `Khan ${formData.khanDistrict.trim()}` : null,
      formData.cityProvince,
      formData.landmark ? `(Landmark: ${formData.landmark.trim()})` : null,
      "Cambodia",
    ].filter(Boolean);

    const fullAddressString = fullAddressParts.join(", ");

    const newCustomer: Customer = {
      name: formData.name.trim(),
      email: formData.email?.trim() || "customer@clothes-shop.com",
      phone: formData.phone.trim(),
      telegram: formData.telegram?.trim() || undefined,
      address: fullAddressString,
      cityProvince: formData.cityProvince,
      khanDistrict: formData.khanDistrict?.trim() || undefined,
      sangkatCommune: formData.sangkatCommune?.trim() || undefined,
      streetAddress: formData.streetAddress.trim(),
      landmark: formData.landmark?.trim() || undefined,
      shippingMethod: formData.shippingMethod,
      shippingCost: currentShippingCost,
      paymentMethod: formData.paymentMethod,
      orderNotes: formData.orderNotes?.trim(),
    };

    const newOrder: Order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      customer: newCustomer,
      items: [...items],
      subtotal,
      shippingCost: currentShippingCost,
      tax: 0, // Cambodia local retail includes VAT in listing
      total: calculatedTotal,
      totalKhr: calculatedTotalKhr,
      trackingNumber,
      status: "confirmed",
    };

    setIsSubmittingServer(true);
    try {
      const backendRes = await submitOrderCheckout({ customer: newCustomer, items });
      const orderNumber = backendRes.order.order_number;

      const syncedOrder: Order = {
        ...newOrder,
        id: orderNumber,
        total: typeof backendRes.order.total_usd === "string" ? parseFloat(backendRes.order.total_usd) : Number(backendRes.order.total_usd),
        totalKhr: backendRes.order.total_khr,
        tax: typeof backendRes.order.tax === "string" ? parseFloat(backendRes.order.tax) : Number(backendRes.order.tax),
        trackingNumber: backendRes.order.tracking_number || trackingNumber,
      };
      saveOrder(syncedOrder);

      // If KHQR, present the interactive Bakong modal
      if (formData.paymentMethod === "khqr") {
        setKhqrData({
          isOpen: true,
          paymentId: backendRes.payment?.id || `pay-${orderNumber}`,
          orderNumber: orderNumber,
          payload: backendRes.payment?.khqr_payload || checkoutKhqrPreview,
          amountUsd: backendRes.payment ? parseFloat(String(backendRes.payment.amount_usd)) : calculatedTotal,
          amountKhr: backendRes.payment ? backendRes.payment.amount_khr : calculatedTotalKhr,
        });
        setIsSubmittingServer(false);
        return;
      }

      // COD or Card: complete immediately
      setIsSubmitted(true);
      removeSelectedItems();
      setIsSubmittingServer(false);
      startTransition(() => {
        router.push(`/invoice/${orderNumber}`);
      });
    } catch (err: unknown) {
      console.warn("Backend checkout error, using local/offline checkout flow:", err);
      // Save order locally
      saveOrder(newOrder);

      // ALWAYS open the interactive Bakong modal if KHQR is selected!
      if (formData.paymentMethod === "khqr") {
        setKhqrData({
          isOpen: true,
          paymentId: `pay-${orderId}`,
          orderNumber: orderId,
          payload: checkoutKhqrPreview,
          amountUsd: calculatedTotal,
          amountKhr: calculatedTotalKhr,
        });
        setIsSubmittingServer(false);
        return;
      }

      // Offline COD or Card: complete and proceed to invoice
      setIsSubmitted(true);
      removeSelectedItems();
      setIsSubmittingServer(false);
      startTransition(() => {
        router.push(`/invoice/${orderId}`);
      });
    }
  };

  const handleKhqrSuccess = (orderNumber: string) => {
    setIsSubmitted(true);
    removeSelectedItems();
    setKhqrData((prev) => ({ ...prev, isOpen: false }));
    startTransition(() => {
      router.push(`/invoice/${orderNumber}`);
    });
  };

  if (!isAuthLoaded || !user) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-3 text-ink-soft">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="text-xs uppercase tracking-wider">
            {!isAuthLoaded ? "Verifying authentication..." : "Sign in required. Redirecting to login..."}
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded || (items.length === 0 && !isSubmitted)) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-3 text-ink-soft">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent" />
          <p className="text-xs uppercase tracking-wider">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* 3-Step Stepper */}
      <OrderStepper currentStep={2} />

      {/* Title Header */}
      <div className="mb-6 border-b-2 border-ink pb-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <div>
          <h1 className="type-display text-2xl sm:text-3xl font-semibold text-ink">
            Checkout
          </h1>
        </div>
        <div className="text-xs text-ink-soft flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-forest" />
          <span>Doorstep &amp; Express Delivery</span>
        </div>
      </div>

      {/* 1-Click Cambodian Profile Test Drive */}
      <div className="mb-8 border border-border/80 bg-paper/60 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-ink-soft">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink text-[11px] uppercase tracking-wider">Demo Autofill:</span>
          {user && <span className="text-[11px] text-ink-soft">({user.name})</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleApplyDemoProfile(0)}
            className="border border-border bg-canvas px-2.5 py-1 text-[11px] text-ink hover:border-ink transition-colors cursor-pointer"
          >
            Sophea · Phnom Penh
          </button>
          <button
            type="button"
            onClick={() => handleApplyDemoProfile(1)}
            className="border border-border bg-canvas px-2.5 py-1 text-[11px] text-ink hover:border-ink transition-colors cursor-pointer"
          >
            Vireak · Siem Reap
          </button>
          {!user && (
            <Link
              href="/login?redirect=/checkout"
              className="text-[11px] text-ink-soft hover:text-ink underline ml-1"
            >
              Sign In →
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Left Form: Real Cambodia Flow */}
        <div className="lg:col-span-7">
          {serverError && (
            <div className="mb-6 border-2 border-ctrl-red bg-ctrl-red/10 p-4 text-xs text-ctrl-red font-semibold">
              [Backend Checkout Alert]: {serverError}
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            {/* 1. Contact & Courier Communication */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-paper">
                  1
                </span>
                <h2 className="type-label text-xs uppercase tracking-widest text-ink font-semibold">
                  Contact Information
                </h2>
              </div>

              <div>
                <label className="type-label block text-xs uppercase tracking-wider text-ink mb-1">
                  Full Name <span className="text-ctrl-red">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  placeholder="e.g. Sophea Chan"
                  className={`w-full border bg-paper px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-soft/40 focus:outline-none ${
                    touched.name && errors.name ? "border-ctrl-red" : "border-border focus:border-ink"
                  }`}
                />
                {touched.name && errors.name && (
                  <p className="mt-1 text-[11px] text-ctrl-red">{errors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div id="field-phone">
                  <label className="type-label block text-xs uppercase tracking-wider text-ink mb-1">
                    Phone Number <span className="text-ctrl-red">*</span>
                  </label>
                  <input
                    inputMode="tel"
                    autoComplete="tel"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    onBlur={() => handleBlur("phone")}
                    placeholder="e.g. 012 345 678"
                    className={`w-full border bg-paper px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-soft/40 focus:outline-none ${
                      touched.phone && errors.phone ? "border-ctrl-red" : "border-border focus:border-ink"
                    }`}
                  />
                  {touched.phone && errors.phone && (
                    <p className="mt-1 text-[11px] text-ctrl-red">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="type-label block text-xs uppercase tracking-wider text-ink mb-1">
                    Telegram <span className="text-ink-soft text-[10px] font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.telegram || ""}
                    onChange={(e) => handleChange("telegram", e.target.value)}
                    placeholder="e.g. @sopheachan or 012 345 678"
                    className="w-full border border-border bg-paper px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-soft/40 focus:border-ink focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="type-label block text-xs uppercase tracking-wider text-ink mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  placeholder="receipt@example.com"
                  className="w-full border border-border bg-paper px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-soft/40 focus:border-ink focus:outline-none"
                />
              </div>
            </div>

            {/* 2. Delivery Destination */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-paper">
                  2
                </span>
                <h2 className="type-label text-xs uppercase tracking-widest text-ink font-semibold">
                  Delivery Address
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div id="field-cityProvince">
                  <label className="type-label block text-xs uppercase tracking-wider text-ink mb-1">
                    Province / City <span className="text-ctrl-red">*</span>
                  </label>
                  <select
                    value={formData.cityProvince}
                    onChange={(e) => handleChange("cityProvince", e.target.value)}
                    className="w-full border border-border bg-paper px-3.5 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
                  >
                    {CAMBODIA_PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.cityProvince === "Phnom Penh" ? (
                  <div id="field-khanDistrict">
                    <label className="type-label block text-xs uppercase tracking-wider text-ink mb-1">
                      District / Khan <span className="text-ctrl-red">*</span>
                    </label>
                    <select
                      value={formData.khanDistrict}
                      onChange={(e) => handleChange("khanDistrict", e.target.value)}
                      className="w-full border border-border bg-paper px-3.5 py-2.5 text-xs text-ink focus:border-ink focus:outline-none"
                    >
                      {PHNOM_PENH_KHANS.map((khan) => (
                        <option key={khan} value={khan}>
                          {khan}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="type-label block text-xs uppercase tracking-wider text-ink mb-1">
                      District / Krong
                    </label>
                    <input
                      type="text"
                      value={formData.khanDistrict || ""}
                      onChange={(e) => handleChange("khanDistrict", e.target.value)}
                      placeholder="e.g. Krong Siem Reap"
                      className="w-full border border-border bg-paper px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-soft/40 focus:border-ink focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="type-label block text-xs uppercase tracking-wider text-ink mb-1">
                    Commune / Sangkat <span className="text-ink-soft text-[10px] font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.sangkatCommune || ""}
                    onChange={(e) => handleChange("sangkatCommune", e.target.value)}
                    placeholder="e.g. Boeung Keng Kang 1"
                    className="w-full border border-border bg-paper px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-soft/40 focus:border-ink focus:outline-none"
                  />
                </div>

                <div id="field-streetAddress">
                  <label className="type-label block text-xs uppercase tracking-wider text-ink mb-1">
                    Street &amp; House Number <span className="text-ctrl-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.streetAddress}
                    onChange={(e) => handleChange("streetAddress", e.target.value)}
                    onBlur={() => handleBlur("streetAddress")}
                    placeholder="e.g. House #42, Street 310"
                    className={`w-full border bg-paper px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-soft/40 focus:outline-none ${
                      touched.streetAddress && errors.streetAddress ? "border-ctrl-red" : "border-border focus:border-ink"
                    }`}
                  />
                  {touched.streetAddress && errors.streetAddress && (
                    <p className="mt-1 text-[11px] text-ctrl-red">{errors.streetAddress}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="type-label block text-xs uppercase tracking-wider text-ink mb-1">
                  Landmark / Building <span className="text-ink-soft text-[10px] font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.landmark || ""}
                  onChange={(e) => handleChange("landmark", e.target.value)}
                  placeholder="e.g. Near Brown Coffee BKK57 or Vattanac Tower"
                  className="w-full border border-border bg-paper px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-soft/40 focus:border-ink focus:outline-none"
                />
              </div>
            </div>

            {/* 3. Delivery Method */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-paper">
                  3
                </span>
                <h2 className="type-label text-xs uppercase tracking-widest text-ink font-semibold">
                  Delivery Method
                </h2>
              </div>

              <div className="space-y-3">
                {formData.cityProvince === "Phnom Penh" ? (
                  <>
                    <label
                      className={`flex items-center justify-between p-3.5 border transition-all cursor-pointer ${
                        formData.shippingMethod === "phnom_penh_express"
                          ? "border-ink bg-canvas shadow-xs"
                          : "border-border bg-paper hover:border-ink/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shippingMethod"
                          value="phnom_penh_express"
                          checked={formData.shippingMethod === "phnom_penh_express"}
                          onChange={() => handleChange("shippingMethod", "phnom_penh_express")}
                          className="accent-ink"
                        />
                        <div>
                          <span className="text-xs font-semibold text-ink block">
                            Phnom Penh Express (1–3 Hours)
                          </span>
                          <span className="text-[11px] text-ink-soft">
                            Direct courier rider
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold tabular-nums text-ink">
                          {subtotal >= 100 ? "FREE" : "$2.50"}
                        </span>
                        <span className="block text-[10px] tabular-nums text-ink-soft">
                          {subtotal >= 100 ? "(Order over $100)" : `≈ ${toKhr(2.5)}`}
                        </span>
                      </div>
                    </label>

                    <label
                      className={`flex items-center justify-between p-3.5 border transition-all cursor-pointer ${
                        formData.shippingMethod === "phnom_penh_standard"
                          ? "border-ink bg-canvas shadow-xs"
                          : "border-border bg-paper hover:border-ink/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="shippingMethod"
                          value="phnom_penh_standard"
                          checked={formData.shippingMethod === "phnom_penh_standard"}
                          onChange={() => handleChange("shippingMethod", "phnom_penh_standard")}
                          className="accent-ink"
                        />
                        <div>
                          <span className="text-xs font-semibold text-ink block">
                            Phnom Penh Standard (Next Day)
                          </span>
                          <span className="text-[11px] text-ink-soft">
                            Dispatched next afternoon
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-forest">
                          FREE
                        </span>
                      </div>
                    </label>
                  </>
                ) : (
                  <label className="flex items-center justify-between p-3.5 border border-ink bg-canvas shadow-xs cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shippingMethod"
                        value="provincial"
                        checked={true}
                        readOnly
                        className="accent-ink"
                      />
                      <div>
                        <span className="text-xs font-semibold text-ink block">
                          Provincial Delivery (1–2 Days)
                        </span>
                        <span className="text-[11px] text-ink-soft">
                          Virak Buntham / J&amp;T Express to {formData.cityProvince}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold tabular-nums text-ink">
                        {subtotal >= 100 ? "FREE" : "$3.00"}
                      </span>
                      <span className="block text-[10px] tabular-nums text-ink-soft">
                        {subtotal >= 100 ? "(Order over $100)" : `≈ ${toKhr(3.0)}`}
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* 4. Payment Methods: KHQR, Cash on Delivery */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-paper">
                  4
                </span>
                <h2 className="type-label text-xs uppercase tracking-widest text-ink font-semibold">
                  Payment Method
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange("paymentMethod", "khqr")}
                  className={`p-3.5 border text-center transition-all cursor-pointer ${
                    formData.paymentMethod === "khqr"
                      ? "border-ink bg-canvas font-semibold text-ink shadow-xs"
                      : "border-border bg-paper text-ink-soft hover:text-ink hover:border-ink/50"
                  }`}
                >
                  <span className="text-xs block font-bold text-ctrl-red">KHQR Payment</span>
                  <span className="text-[10px] text-ink-soft mt-0.5 block">ABA · Wing · ACLEDA · Bakong</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange("paymentMethod", "cod")}
                  className={`p-3.5 border text-center transition-all cursor-pointer ${
                    formData.paymentMethod === "cod"
                      ? "border-ink bg-canvas font-semibold text-ink shadow-xs"
                      : "border-border bg-paper text-ink-soft hover:text-ink hover:border-ink/50"
                  }`}
                >
                  <span className="text-xs block font-bold text-ink">Cash On Delivery</span>
                  <span className="text-[10px] text-ink-soft mt-0.5 block">Pay upon arrival ($ / ៛)</span>
                </button>
              </div>

              {/* KHQR Explainer Box */}
              {formData.paymentMethod === "khqr" && (
                <div className="border border-border bg-paper p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-block bg-[#E11E26] text-white font-bold text-[10px] px-2 py-0.5 rounded-xs tracking-wider">
                        KHQR
                      </span>
                      <span className="font-semibold text-ink">Official NBC Bakong QR</span>
                    </div>
                    <span className="font-semibold tabular-nums text-forest text-[11px] bg-forest/10 px-2 py-0.5 rounded-xs">
                      Zero Fees
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-soft leading-relaxed">
                    Supports ABA Mobile, Wing Bank, ACLEDA mobile, Canadia, or any Bakong-enabled app.
                  </p>
                  <p className="text-[11px] text-ink-soft/80 flex items-center gap-1.5 pt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-forest shrink-0" />
                    <span>Interactive payment QR modal will open upon clicking Confirm Order.</span>
                  </p>
                </div>
              )}

              {/* Cash on Delivery Box */}
              {formData.paymentMethod === "cod" && (
                <div className="border border-border bg-paper p-4 text-xs text-ink-soft space-y-2">
                  <div className="flex items-center justify-between border-b border-border pb-2.5">
                    <span className="font-semibold text-ink">Cash on Delivery</span>
                    <span className="font-semibold tabular-nums text-ink text-[11px]">
                      ${calculatedTotal.toFixed(2)} USD ≈ {toKhr(calculatedTotal)}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Please prepare cash in USD ($) or Khmer Riel (៛) for the delivery courier.
                  </p>
                  <p className="text-[11px] text-ink-soft/80 flex items-center gap-1.5 pt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-forest shrink-0" />
                    <span>You may inspect package contents before handing payment to the rider.</span>
                  </p>
                </div>
              )}
            </div>

            {/* 5. Special Notes */}
            <div>
              <label className="type-label block text-xs uppercase tracking-wider text-ink mb-1">
                Delivery Notes <span className="text-ink-soft text-[10px] font-normal lowercase">(optional)</span>
              </label>
              <textarea
                value={formData.orderNotes || ""}
                onChange={(e) => handleChange("orderNotes", e.target.value)}
                rows={2}
                placeholder="e.g. Leave with building security guard, call upon arrival"
                className="w-full border border-border bg-paper px-3.5 py-2 text-xs text-ink placeholder:text-ink-soft/40 focus:border-ink focus:outline-none"
              />
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/cart"
                className="type-label inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition-colors underline underline-offset-4"
              >
                &larr; Return to Shopping Bag
              </Link>

              <button
                type="submit"
                disabled={isPending || isSubmittingServer}
                className="type-label w-full sm:w-auto bg-ink px-8 py-3.5 text-xs uppercase tracking-widest text-paper hover:bg-ink-soft transition-all shadow-sm cursor-pointer font-semibold disabled:opacity-50"
              >
                {isPending || isSubmittingServer ? "Placing Order..." : `Confirm Order — $${calculatedTotal.toFixed(2)} USD`}
              </button>
            </div>
          </form>
        </div>

        {/* Right Summary */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 border border-border bg-paper p-6 shadow-sm space-y-5">
            <div className="border-b border-border pb-3 flex justify-between items-baseline">
              <h3 className="type-display text-lg text-ink font-medium">Order Summary</h3>
              <span className="text-xs text-ink-soft tabular-nums">{itemCount} items</span>
            </div>

            {/* Items list */}
            <div className="divide-y divide-border/60 max-h-64 overflow-y-auto pr-1">
              {items.map((item) => {
                const itemKey = item.id || `${item.productId}-${item.selectedSize || ''}-${item.selectedColor || ''}`;
                return (
                  <div key={itemKey} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-medium text-ink line-clamp-1">{item.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-ink-soft">
                        <span className="tabular-nums">Qty: {item.quantity} &times; ${item.price.toFixed(2)}</span>
                        {item.selectedSize && (
                          <span className="bg-backdrop px-1.5 py-0.5 border border-border text-ink font-semibold">
                            Size: {item.selectedSize}
                          </span>
                        )}
                        {item.selectedColor && (
                          <span className="bg-backdrop px-1.5 py-0.5 border border-border text-ink-soft">
                            Color: {item.selectedColor}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums text-ink">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pricing breakdown */}
            <div className="space-y-2 border-t border-border pt-4 text-xs">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span className="text-ink font-medium tabular-nums">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Delivery</span>
                <span className="text-ink font-medium tabular-nums">
                  {currentShippingCost === 0 ? "FREE" : `$${currentShippingCost.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t-2 border-ink pt-3 flex justify-between items-baseline">
                <div>
                  <span className="font-sans text-xs uppercase tracking-wider font-bold text-ink block">
                    Total Due
                  </span>
                  <span className="text-[11px] text-ink-soft tabular-nums">
                    ≈ {toKhr(calculatedTotal)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="type-display text-2xl font-bold text-ink tabular-nums">
                    ${calculatedTotal.toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-ink-soft">USD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bakong KHQR Interactive Modal */}
      <KhqrModal
        isOpen={khqrData.isOpen}
        onClose={() => setKhqrData((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={handleKhqrSuccess}
        paymentId={khqrData.paymentId}
        orderNumber={khqrData.orderNumber}
        khqrPayload={khqrData.payload}
        amountUsd={khqrData.amountUsd}
        amountKhr={khqrData.amountKhr}
      />
    </div>
  );
}
