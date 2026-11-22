# Checkout Screen Typography & Cognitive Load Redesign

**Date:** 2026-11-22  
**Status:** Approved by User (Approach A: Modern Shopify / Stripe Clean Flow)  
**File Affected:** `ec-online-shop/app/checkout/page.tsx`

---

## 1. Executive Summary & Objectives
The existing checkout page suffered from excessive typographic clutter:
- Redundant instructional text under almost every input field.
- Double-labeled step and regional indicators in the header.
- Over-explained payment description callouts (explaining bank names multiple times, warning boxes about modals).
- Verbose delivery card descriptions repeating "Free" multiple times.
- Redundant 3-item bullet point checklist under the order summary.

**Design Objective:** Streamline the checkout experience into a calm, frictionless, high-trust checkout flow matching Shopify and Stripe standards. Keep all Cambodia-specific functional context (KHR conversions, local courier options, Telegram contact) while removing cognitive clutter.

---

## 2. Detailed Typography Redesign Specification

### 2.1. Header & Demo Bar
| Element | Before | Redesigned (Approach A) | Rationale |
| :--- | :--- | :--- | :--- |
| **Step Tag** | `Step 2 of 3` | *Removed* | Interactive 3-step visual stepper above already communicates progress. |
| **H1 Heading** | `Delivery & Payment Details` | `Checkout` | Clean, authoritative, industry-standard header. |
| **Header Badge** | `Cambodia Direct Delivery (Doorstep & Express)` | Compact badge: `Doorstep & Express Delivery` | Reduces header wrap on mobile; retains delivery promise. |
| **Demo Autofill Bar** | Heavy 80px container with lengthy explainer | Compact inline pill row: `Demo Autofill: [Sophea · Phnom Penh] [Vireak · Siem Reap]` | Preserves quick-test capability without dominating customer view. |

### 2.2. Section 1: Customer Contact
| Field | Before | Redesigned (Approach A) |
| :--- | :--- | :--- |
| **Section Title** | `1 Customer & Courier Contact` | `1. Contact Information` |
| **Recipient Name** | `Recipient Full Name *` | `Full Name *` |
| **Phone Number** | `Phone Number (Cellcard / Smart / Metfone) *` + helper: *"The rider will call this number when arriving at your location."* | Label: `Phone Number *`<br>Placeholder: `e.g. 012 345 678`<br>*Removed helper text paragraph.* |
| **Telegram** | `Telegram Username / Number (recommended)` + helper: *"Couriers can send location pin drops or drop-off photos via Telegram."* | Label: `Telegram (Optional)`<br>Placeholder: `e.g. @username or phone number`<br>*Removed helper text paragraph.* |
| **Email** | `Email Address (for digital invoice)` | Label: `Email Address`<br>Placeholder: `receipt@example.com` |

### 2.3. Section 2: Delivery Destination
| Field | Before | Redesigned (Approach A) |
| :--- | :--- | :--- |
| **Section Title** | `2 Delivery Destination in Cambodia` | `2. Delivery Address` |
| **City / Province** | `City / Province *` | `Province / City *` |
| **Khan / District** | `Khan / District *` | `District / Khan *` |
| **Sangkat / Commune** | `Sangkat / Commune` | `Commune / Sangkat (Optional)` |
| **Street & House** | `Street & House Number *` | `Street & House Number *` (clean placeholder: `e.g. House 42, St 310`) |
| **Landmark** | `Nearby Landmark / Building Name (helps courier find you)` + lengthy 15-word placeholder | Label: `Landmark / Building (Optional)`<br>Placeholder: `e.g. Near Brown Coffee BKK57 or Vattanac Tower` |

### 2.4. Section 3: Delivery Options
- **Phnom Penh Express Card**:
  - Title: `Express Delivery (1–3 Hours)`
  - Subtitle: `Direct courier rider`
  - Price: `$2.50` (or `FREE` if cart $\ge$ \$100)
- **Phnom Penh Standard Card**:
  - Title: `Standard Delivery (Next Day)`
  - Subtitle: `Dispatched next afternoon`
  - Price: `FREE` (clean green badge)
- **Provincial Express Card**:
  - Title: `Provincial Delivery (1–2 Days)`
  - Subtitle: `Virak Buntham / J&T Express to {Province}`
  - Price: `$3.00` (or `FREE` if cart $\ge$ \$100)

### 2.5. Section 4: Payment Methods
- **KHQR Card & Details Box**:
  - Button text: `KHQR Payment` | `ABA · Wing · ACLEDA · Any Bank`
  - Explainer callout: Replace multi-paragraph text and warning boxes with:
    - Top line: `Official NBC Bakong QR` with red `KHQR` pill and formatted total `$XX.XX USD`.
    - 1-line note: `Scan instantly with ABA Mobile, Wing, ACLEDA, or any Bakong app.`
    - Subtext: `Payment QR code appears immediately upon clicking Confirm Order.`
- **Cash on Delivery (COD) Card & Details Box**:
  - Button text: `Cash on Delivery` | `Pay upon arrival ($ / ៛)`
  - Explainer callout:
    - `Please prepare exact cash of $XX.XX USD or ≈ XX,XXX KHR for the rider.`
    - `Parcel inspection is welcomed prior to payment.`

### 2.6. Section 5 & Order Summary (Right Column)
- **Special Notes**:
  - Label: `Delivery Notes (Optional)`
  - Placeholder: `e.g. Leave with building security guard, call upon arrival...`
- **Action Buttons**:
  - Link: `← Return to Shopping Bag`
  - Submit Button: `Confirm Order — $XX.XX USD`
- **Right Column Order Summary**:
  - Remove redundant 3-check bullet points (`✓ Direct delivery...`, `✓ Both USD...`, `✓ Customer service...`) at bottom of card to eliminate cognitive fatigue.
  - Retain clear, crisp price summary with KHR conversion estimate.

---

## 3. Verification Criteria
1. `npm run lint` passes with 0 errors and 0 warnings.
2. `npm run build` succeeds cleanly with all routes statically or dynamically validated.
3. Form validation, address dropdowns, KHQR modal trigger, and COD submission function without any behavioral regressions.
