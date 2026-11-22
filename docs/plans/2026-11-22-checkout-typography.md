# Checkout Typography & Cognitive Load Cleanup Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Clean up excessive typography, remove redundant helper text, and streamline delivery & payment cards on the checkout page to match modern Shopify/Stripe standards.

**Architecture:** Refactor `ec-online-shop/app/checkout/page.tsx` presentation components into clear, high-legibility sections with clean labels, concise placeholders, unified card descriptions, and zero redundant instructional paragraphs.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Plus Jakarta Sans & Inter font tokens.

---

### Task 1: Refactor Header, Stepper Context & Autofill Demo Bar
**Files:**
- Modify: `ec-online-shop/app/checkout/page.tsx:336-390`

**Step 1: Inspect lines 336-390**
Verify current header text and demo autofill container structure.

**Step 2: Update typography**
- Remove `<span className="type-label text-xs uppercase tracking-widest text-ink-soft block">Step 2 of 3</span>`.
- Simplify H1 from `Delivery & Payment Details` to `Checkout`.
- Streamline right header tag to a clean badge: `Doorstep & Express Delivery`.
- Refactor the 80px demo container into a compact inline pill bar `Demo Autofill: [Sophea · Phnom Penh] [Vireak · Siem Reap]`.

**Step 3: Verification**
Verify with `npm --prefix ec-online-shop run lint`.

---

### Task 2: Streamline Section 1 (Contact) & Section 2 (Address)
**Files:**
- Modify: `ec-online-shop/app/checkout/page.tsx:400-596`

**Step 1: Inspect lines 400-596**
Check existing labels, helper texts, and placeholders.

**Step 2: Update Contact fields**
- Change Section 1 title to `1. Contact Information`.
- Change `Recipient Full Name *` to `Full Name *`.
- Change `Phone Number (Cellcard / Smart / Metfone) *` to `Phone Number *` and remove under-field 15-word helper text.
- Change `Telegram Username / Number (recommended)` to `Telegram (Optional)` and remove under-field 12-word helper text.
- Change `Email Address (for digital invoice)` to `Email Address`.

**Step 3: Update Address fields**
- Change Section 2 title to `2. Delivery Address`.
- Change `City / Province *` to `Province / City *`.
- Change `District / Krong` to `District / Khan *`.
- Change `Sangkat / Commune` to `Commune / Sangkat (Optional)`.
- Change `Nearby Landmark / Building Name (helps courier find you)` to `Landmark / Building (Optional)`.

**Step 4: Verification**
Verify with `npm --prefix ec-online-shop run lint`.

---

### Task 3: Streamline Section 3 (Delivery) & Section 4 (Payment)
**Files:**
- Modify: `ec-online-shop/app/checkout/page.tsx:597-805`

**Step 1: Inspect lines 597-805**
Check delivery option card subtitles and payment method callout boxes.

**Step 2: Update Delivery Options**
- Phnom Penh Express: Title `Express Delivery (1–3 Hours)`, subtitle `Direct courier rider`.
- Phnom Penh Standard: Title `Standard Delivery (Next Day)`, subtitle `Dispatched next afternoon`, price `FREE`.
- Provincial: Title `Provincial Delivery (1–2 Days)`, subtitle `Virak Buntham / J&T Express to {cityProvince}`.

**Step 3: Update Payment Methods**
- Button 1: `KHQR Payment` | `ABA · Wing · ACLEDA · Any Bank`
- Button 2: `Cash on Delivery` | `Pay upon arrival ($ / ៛)`
- KHQR explainer: Replace long paragraphs and warning callouts with a clean 2-line summary:
  - Header: `Official NBC Bakong QR` + red `KHQR` badge + total USD.
  - Subtext: `Scan instantly with ABA Mobile, Wing, ACLEDA, or any Bakong app.`
  - Helper note: `Payment QR code appears immediately upon clicking Confirm Order.`
- Cash on Delivery explainer: Streamline to 2 clear bullet points:
  - `Pay upon parcel arrival in USD ($) or Khmer Riel (៛).`
  - `You may inspect package contents before handing payment to the rider.`

**Step 4: Verification**
Verify with `npm --prefix ec-online-shop run lint`.

---

### Task 4: Streamline Section 5 (Notes) & Right Column (Order Summary)
**Files:**
- Modify: `ec-online-shop/app/checkout/page.tsx:806-925`

**Step 1: Inspect lines 806-925**
Check special notes label and the 3-item checklist at the bottom of the Order Summary.

**Step 2: Update typography**
- Change Section 5 label from `Special Delivery Notes (optional)` to `Delivery Notes (Optional)`.
- Streamline bottom action buttons: `← Return to Shopping Bag` and `Confirm Order — $XX.XX USD`.
- Remove the redundant 3-check service notice box at lines 908-922 (`✓ Direct delivery...`, `✓ Both USD...`, `✓ Customer service...`).

**Step 3: Verification**
Verify with `npm --prefix ec-online-shop run lint`.

---

### Task 5: Final Production Build & Validation
**Files:**
- Entire project `ec-online-shop`

**Step 1: Run ESLint**
`npm --prefix ec-online-shop run lint`

**Step 2: Run Production Build**
`npm --prefix ec-online-shop run build`

**Step 3: Update `docs/plans/task.md`**
Mark tasks complete and report evidence.
