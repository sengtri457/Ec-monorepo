# Customer Profile Page Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build a luxury, high-performance customer Profile Page (`/profile`) with multi-tab navigation (Personal Info, Cambodia Delivery Addresses, Order History, Security) following Option A, integrated with AuthContext and the backend API Gateway.

**Architecture:** Client-side Next.js 14 App Router page under `app/profile/` composed of modular subcomponents for tabs and sidebar, leveraging Tailwind CSS with established design tokens (`Plus Jakarta Sans`, `Inter`, `bg-paper`, `text-ink`, `border-border`), connected with `AuthContext` and fallback demo data.

**Tech Stack:** Next.js 14 (App Router, React 18, TypeScript), Tailwind CSS, Lucide React icons, AuthContext with JWT storage.

---

### Task 1: Navigation Integration & Header Update
**Files:**
- Modify: `ec-online-shop/components/Header.tsx:425-442`

**Step 1: Inspect current user button link in Header**
Ensure when `user` is authenticated, the link redirects to `/profile` instead of `/login`.

**Step 2: Update Header component**
Replace `<Link href="/login" ... title="View Account Profile">` with `<Link href="/profile" ... title="Customer Profile">`.

**Step 3: Verify link destination**
Check Header renders correctly without TypeScript or JSX errors.

**Step 4: Commit**
```bash
git add ec-online-shop/components/Header.tsx
git commit -m "feat(header): point authenticated member profile link to /profile"
```

---

### Task 2: Profile Sidebar & Personal Info Tab
**Files:**
- Create: `ec-online-shop/app/profile/components/ProfileSidebar.tsx`
- Create: `ec-online-shop/app/profile/components/PersonalInfoTab.tsx`

**Step 1: Build ProfileSidebar**
- Render customer avatar circle, full name, email, and member badge.
- Render 4 vertical tab buttons for desktop (horizontal scrollable bar for mobile):
  - `personal` (User / Personal Information)
  - `addresses` (MapPin / Delivery Addresses)
  - `orders` (Package / Order History)
  - `security` (Shield / Password & Security)
- Render quick Sign Out button at the bottom of the sidebar.

**Step 2: Build PersonalInfoTab**
- Read current customer details from `useAuth()`.
- Display clean card layout with editable fields:
  - First Name & Last Name
  - Email (read-only with verified status)
  - Phone Number (Cambodian format helper)
  - Telegram Handle (`@username`)
- Support edit mode toggle and instant save to `updateUser()` with visual success toast/banner.

**Step 3: Run static typecheck**
Run `npx tsc --noEmit` in `ec-online-shop` to verify component props.

**Step 4: Commit**
```bash
git add ec-online-shop/app/profile/components/ProfileSidebar.tsx ec-online-shop/app/profile/components/PersonalInfoTab.tsx
git commit -m "feat(profile): add ProfileSidebar and PersonalInfoTab components"
```

---

### Task 3: Cambodia Delivery Address Book Tab
**Files:**
- Create: `ec-online-shop/app/profile/components/AddressBookTab.tsx`

**Step 1: Build AddressBookTab**
- Manage a list of addresses initialized from `user.address` or local address state.
- Render address cards with:
  - Recipient Full Name & Phone
  - City / Province badge (e.g. *Phnom Penh*, *Siem Reap*)
  - Full detailed address: Sangkat/Commune, Khan/District, Street & House
  - Courier Landmark notice (e.g. *"Near Brown Coffee BKK57"*)
  - Default Address badge (`Default Delivery Address`)
- Actions per card:
  - `Edit Address`
  - `Set as Default`
  - `Delete`
- Modal or expandable drawer form to Add / Edit address with Cambodia province selector (`Phnom Penh`, `Siem Reap`, `Battambang`, `Sihanoukville`, `Kampot`, etc.).

**Step 2: Run typecheck**
Verify address management types and handlers.

**Step 3: Commit**
```bash
git add ec-online-shop/app/profile/components/AddressBookTab.tsx
git commit -m "feat(profile): add AddressBookTab with Cambodia address fields"
```

---

### Task 4: Order History Tab & Security Tab
**Files:**
- Create: `ec-online-shop/app/profile/components/OrderHistoryTab.tsx`
- Create: `ec-online-shop/app/profile/components/SecurityTab.tsx`

**Step 1: Build OrderHistoryTab**
- Fetch or display customer orders from backend API (`/api/v1/orders/`) or fallback mock demo orders.
- Render order cards with:
  - Order Number (e.g. `#ORD-20261122-9481`)
  - Order Date & Time
  - Status pill (`Processing`, `Out for Delivery`, `Delivered`)
  - Payment method badge (`Bakong KHQR`, `Cash on Delivery`)
  - Order item thumbnails, title, size, quantity, and price
  - Total in USD (`$XX.XX`) and KHR (`៛XXX,XXX`)
  - Action link: `View Invoice` (`/invoice/[orderNumber]`)
- Empty state: clean shopping bag icon with a "Browse Catalog" CTA if 0 orders.

**Step 2: Build SecurityTab**
- Change Password card: Current Password, New Password, Confirm New Password with show/hide toggle.
- Session Information card: Last login timestamp, active device, IP location.
- Prominent Sign Out action with confirmation dialog/alert.

**Step 3: Commit**
```bash
git add ec-online-shop/app/profile/components/OrderHistoryTab.tsx ec-online-shop/app/profile/components/SecurityTab.tsx
git commit -m "feat(profile): add OrderHistoryTab and SecurityTab"
```

---

### Task 5: Main Profile Page Entry with Auth Guard
**Files:**
- Create: `ec-online-shop/app/profile/page.tsx`

**Step 1: Implement Main Profile Page**
- Wrap with `"use client"`.
- Use `useAuth()` to check login status:
  - If `!isLoaded`: render luxury skeleton layout.
  - If `!user`: render guest prompt with `Member Sign In` button or auto-redirect to `/login?redirect=/profile`.
- Synchronize active tab from URL query param `?tab=orders|addresses|security|personal`.
- Layout: Responsive 12-column grid (4 cols sidebar on desktop, 8 cols main content pane).

**Step 2: Test rendering & tab switching**
Verify URL synchronization and smooth state transitions.

**Step 3: Commit**
```bash
git add ec-online-shop/app/profile/page.tsx
git commit -m "feat(profile): create main profile page with responsive tab router"
```

---

### Task 6: Comprehensive Verification & Lint/Build Check
**Files:**
- Verification only

**Step 1: Run ESLint**
Run `npm run lint` in `ec-online-shop`. Expected: 0 errors, 0 warnings.

**Step 2: Run Production Build**
Run `npm run build` in `ec-online-shop`. Expected: Exit code 0, `/profile` generated successfully.

**Step 3: Update Task Tracker**
Update `docs/plans/task.md` with completed steps.

**Step 4: Commit**
```bash
git add docs/plans/
git commit -m "docs: finalize customer profile implementation and task tracking"
```
