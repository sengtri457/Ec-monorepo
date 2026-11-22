# UI Slop Cleanup Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Purge UI slop, redundant newsletter forms, fake ratings, warehouse inventory jargon, and invalid payment badges across the e-commerce storefront.

**Architecture:** Decompose cleanup into 5 focused single-flow tasks covering the Homepage, PDP & AddToCartButton, Cart & OrderSummary, Footer, and end-to-end lint/build verification.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Plus Jakarta Sans & Inter font tokens.

---

### Task 1: Clean Homepage UI Slop (`ec-online-shop/app/page.tsx`)
**Files:**
- Modify: `ec-online-shop/app/page.tsx:265-325,505-530`

**Step 1:** Cut out Section 8 (Private Archive Newsletter & VIP Drops) from `app/page.tsx` and unused `NewsletterForm` import.
**Step 2:** In the Trending Products grid (`app/page.tsx`):
- Remove `REF: CLO-00{product.id}`.
- Consolidate double buttons (`View Details` + `Select Size`) into a single elegant CTA: `View Piece →`.
**Step 3:** Run `npm --prefix ec-online-shop run lint` to verify clean changes.

---

### Task 2: Clean PDP & AddToCartButton (`app/products/[id]/page.tsx` & `components/AddToCartButton.tsx`)
**Files:**
- Modify: `ec-online-shop/app/products/[id]/page.tsx:90-149`
- Modify: `ec-online-shop/components/AddToCartButton.tsx:200-225`

**Step 1:** In `app/products/[id]/page.tsx`:
- Remove `SKU: CLO-00{product.id}` and fake `★ 4.9 · Certified Release`.
- Replace drop-shipping guarantee copy with authentic Cambodia promises: `Phnom Penh Express (1–3h)` and `Doorstep Size Exchange`.
**Step 2:** In `components/AddToCartButton.tsx`:
- Simplify warehouse inventory text from `In Stock (120 units) — Ready for Insured Dispatch` to clean `In Stock`.
- Show `Only {remainingStock} left` when stock $\le$ 3.
**Step 3:** Run `npm --prefix ec-online-shop run lint` to verify.

---

### Task 3: Clean Cart Page & Order Summary (`app/cart/page.tsx` & `components/OrderSummary.tsx`)
**Files:**
- Modify: `ec-online-shop/app/cart/page.tsx:65-75,115-122`
- Modify: `ec-online-shop/components/OrderSummary.tsx:85-98`

**Step 1:** In `app/cart/page.tsx`:
- Remove redundant `<span className="type-label text-xs uppercase tracking-widest text-ink-soft block">Step 1 of 3</span>`.
- Clean up brand footer caption.
**Step 2:** In `components/OrderSummary.tsx`:
- Replace template copy `"Includes customs fees & white-glove packaging."` with `"Complimentary packaging & doorstep delivery."`
**Step 3:** Run `npm --prefix ec-online-shop run lint` to verify.

---

### Task 4: Clean Footer Payment Badges & Column 4 (`components/Footer.tsx`)
**Files:**
- Modify: `ec-online-shop/components/Footer.tsx:260-292,310-333`

**Step 1:** Remove `VISA / MC` badge from the footer payment methods row (line 327). Keep only KHQR and COD.
**Step 2:** Streamline Column 4 payment cards into clean, minimalist trust badges.
**Step 3:** Run `npm --prefix ec-online-shop run lint` to verify.

---

### Task 5: Final Production Build & End-to-End Verification
**Files:**
- Entire project `ec-online-shop`

**Step 1:** Run `npm --prefix ec-online-shop run lint`.
**Step 2:** Run `npm --prefix ec-online-shop run build`.
**Step 3:** Update `docs/plans/task.md` and commit changes.
