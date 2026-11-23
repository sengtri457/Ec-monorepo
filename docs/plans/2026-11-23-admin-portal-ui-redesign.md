# Admin Portal UI/UX Redesign Implementation Plan (MA Atelier Style)

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Redesign the Clothes EC Admin Portal (`apps/admin`) to match the sophisticated, clean, high-performance UI/UX style of `sengtri457/ecommerce-MA-admin-portal` (Obsidian `#0E0E12` dark sidebar, Terracotta `#944434` accents, crisp `#F8F9FA` canvas, operations hero banner, slide-over order drawer, inline variant matrix stock editing, and live dispatch telemetry map).

**Architecture:** Maintain the existing Next.js 16 App Router and microservice API integration while replacing styling and layout primitives with the exact design tokens, components, and UX workflows from the reference portal. Enhance desktop navigation with a collapsible sidebar (`w-64` <-> `w-20`), a global search bar with `⌘K` keyboard badge, a glassmorphic dashboard operations banner, inline cell editing for variant inventory, a slide-over order inspection drawer, and a live courier dispatch map.

**Tech Stack:** Next.js 16.4.6 (App Router), React 19.3.0, TypeScript 5, Tailwind CSS v4, Lucide React, Leaflet (`leaflet` + `@types/leaflet`), shared `@ec/types`.

---

## Design System & Style Reference Map

| Aspect | Current Admin (`apps/admin`) | Reference Portal (`ecommerce-MA-admin-portal`) | Target Redesign |
| :--- | :--- | :--- | :--- |
| **Sidebar Theme** | Plain white sidebar (`bg-white border-slate-200`) | Obsidian dark (`#0E0E12`, border `#18181F`) | Obsidian dark `#0E0E12`, border `border-neutral-800/80` |
| **Brand Accent** | Default slate/black | Terracotta (`#944434`, hover `#7E3729`, subtle `#FDF2F0`) | Brand Terracotta `#944434`, hover `#7E3729`, subtle `#FDF2F0` |
| **Body Canvas** | Generic slate-50 (`#f8fafc`) | Clean canvas `#F8F9FA` with 6px rounded scrollbar | Canvas `#F8F9FA` + customized sleek pill scrollbars |
| **Cards & Panels** | Standard `rounded-xl border-slate-200` | `rounded-2xl border-neutral-200/80 bg-white shadow-xs hover:shadow-md` | `rounded-2xl border-neutral-200/80 bg-white shadow-xs` |
| **Sidebar Mode** | Static desktop width `w-64` | Collapsible `w-64` expanded <-> `w-20` compact with tooltip & badge dots | Full collapse/expand support with localStorage memory |
| **Header** | Minimal 64px header | 80px (`h-20`) with 384px search bar (`⌘K`), hub pill, live ping pill, and `+ ADD PRODUCT` black CTA | Identical 80px layout with live Gateway ping & Phnom Penh Hub |
| **Dashboard Hero** | None (standard grid) | Full-width Obsidian hero card with Operations Hub tag and Net Revenue Glass card | Operations Hub Hero with Net Revenue glass snapshot |
| **Stock Editing** | Modal dialog only | Inline cell editing (`onEnter` / `blur`) + Restock Modal | Inline stock edit on Enter/blur + Restock Modal |
| **Orders View** | Standard table | Table + Slide-over Quick Inspector Drawer (`max-w-xl`) | Slide-over Order Details Drawer with live status progression |
| **Fleet / Dispatch** | Not in Admin (only in Web) | Fullscreen Dispatch & Courier Telemetry Map | Interactive Cambodia/Phnom Penh Dispatch Map page (`/dispatch`) |

---

### Task 1: Design Tokens & Global CSS Typography Alignment

**Files:**
- Modify: `apps/admin/app/globals.css`
- Test: `pnpm --filter admin build`

**Step 1: Write design tokens and custom scrollbars in `globals.css`**

Update `apps/admin/app/globals.css` to define the reference color system, typography, and clean scrollbar styling:
```css
@import "tailwindcss";

@theme {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  --color-brand-obsidian: #0E0E12;
  --color-brand-charcoal: #18181F;
  --color-brand-terracotta: #944434;
  --color-brand-terracotta-hover: #7E3729;
  --color-brand-terracotta-subtle: #FDF2F0;
  --color-brand-canvas: #F8F9FA;
}

:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --background: #F8F9FA;
  --foreground: #0F172A;
}

body {
  font-family: var(--font-sans);
  background-color: var(--background);
  color: var(--foreground);
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}

/* Custom subtle scrollbars for sleek dashboard UI */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #E2E8F0;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #CBD5E1;
}
```

**Step 2: Verify build**

Run: `pnpm --filter admin build`
Expected: PASS (Exit code 0)

**Step 3: Commit**

```bash
git add apps/admin/app/globals.css
git commit -m "style(admin): align design tokens, brand palette and custom scrollbars"
```

---

### Task 2: Sleek Collapsible Admin Sidebar (`AdminSidebar.tsx`)

**Files:**
- Modify: `apps/admin/components/AdminSidebar.tsx`
- Modify: `apps/admin/components/AdminShell.tsx`
- Test: `pnpm --filter admin build`

**Step 1: Implement Collapsible State & Visual Styling in `AdminSidebar.tsx`**

- Dark Obsidian background: `#0E0E12` with subtle right border `#18181F` / `border-neutral-800/80`.
- Top brand row: `h-20 shrink-0 px-4 border-b border-neutral-800/70` with `w-10 h-10 rounded-xl bg-black border border-white/15 text-white font-bold tracking-widest` ("EC" badge) + "CLOTHES EC" title + "v2.4" badge + "Admin Portal" subtitle.
- Desktop collapse toggle button (`w-7 h-7 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/80`).
- Grouped navigation structure:
  - `Operations`: Overview (`/`), Live Dispatch (`/dispatch`)
  - `Catalog & Stock`: Stock Inventory (`/inventory`), Movements Ledger (`/inventory/movements`), Products (`/products`)
  - `Fulfillment`: Customer Orders (`/orders`)
- Active link styling: `!bg-[#944434] !text-white font-medium shadow-sm` with smooth transition (`duration-150`).
- Badges: `live` order pulse, `alert` low-stock indicator badge.
- Profile footer: User avatar initials, name/email, "Staff" status badge, and sign-out action.

**Step 2: Update `AdminShell.tsx` to coordinate sidebar width (`w-64` vs `w-20`)**

Ensure the main content container flexes smoothly with transitions (`transition-all duration-300`).

**Step 3: Verify build**

Run: `pnpm --filter admin build`
Expected: PASS (Exit code 0)

**Step 4: Commit**

```bash
git add apps/admin/components/AdminSidebar.tsx apps/admin/components/AdminShell.tsx
git commit -m "feat(admin): build collapsible obsidian sidebar with grouped navigation"
```

---

### Task 3: Refined Administrative Top Header (`AdminHeader.tsx`)

**Files:**
- Modify: `apps/admin/components/AdminHeader.tsx`
- Test: `pnpm --filter admin build`

**Step 1: Implement Reference Header Layout in `AdminHeader.tsx`**

- Exact dimensions: `h-20 bg-white border-b border-neutral-200/70 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20`.
- Left: Mobile drawer hamburger + Global Search input (`max-w-[384px]` with `⌘K` keyboard badge).
- Right:
  - Realtime Gateway Status pill: `px-3.5 py-1.5 rounded-full bg-[#FDF2F0] border border-[#FADAD6] text-[11px] font-medium text-[#944434]` with animated ping dot (`#E05238`).
  - Flagship Hub pill: `hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100/80 border border-neutral-200/80 text-[11px] font-medium text-neutral-700` ("Phnom Penh Flagship Hub").
  - Quick CTA: `+ ADD PRODUCT` (`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0E0E12] hover:bg-neutral-800 rounded-xl shadow-xs`).
  - Notification bell with unread indicator.
  - Sign-out icon button.

**Step 2: Verify build**

Run: `pnpm --filter admin build`
Expected: PASS (Exit code 0)

**Step 3: Commit**

```bash
git add apps/admin/components/AdminHeader.tsx
git commit -m "feat(admin): redesign top header with global search, hub pill and quick action cta"
```

---

### Task 4: High-Impact Operations Overview Dashboard (`apps/admin/app/page.tsx`)

**Files:**
- Modify: `apps/admin/app/page.tsx`
- Create: `apps/admin/components/dashboard/StatCard.tsx`
- Test: `pnpm --filter admin build`

**Step 1: Create reusable `StatCard.tsx` matching reference**

- `p-5 sm:p-6 bg-white border border-neutral-200/80 rounded-2xl shadow-xs transition-all duration-200 hover:shadow-md hover:border-neutral-300/80`.
- Top: uppercase tracking title + rounded icon pill (`w-8 h-8 rounded-full flex items-center justify-center`).
- Metric value in large bold typography + trend percentage badge (`+5.4% vs last month` or `Needs Attention`).
- Bottom: subtle `border-t border-neutral-100 pt-2.5` target status / subtitle.

**Step 2: Redesign `apps/admin/app/page.tsx` with Operations Hero Banner**

- Obsidian Hero Banner:
  - `relative overflow-hidden rounded-3xl bg-[#0E0E12] border border-neutral-800/80 p-6 sm:p-8 lg:p-10 text-white shadow-xl`.
  - Operations Hub tag: `px-3 py-1 rounded-full text-[10px] font-bold tracking-widest text-[#E07A5F] bg-[#944434]/20 border border-[#944434]/30 uppercase`.
  - Control row with Refresh button + "Dispatch Hub" shortcut link (`bg-[#944434] hover:bg-[#7E3729] rounded-xl`).
  - Glassmorphic Net Revenue Snapshot card: `bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-6 shadow-inner`.
- Stat Cards Grid:
  - Gross Revenue (MTD)
  - Total Placed Orders
  - Pending Fulfillment
  - Low Stock Variants
- Split layout:
  - Recent Orders feed with clean tabular styling, status badges, and quick drawer opener.
  - Critical Stock Replenishment watchlist with direct quick-action adjust button.

**Step 3: Verify build**

Run: `pnpm --filter admin build`
Expected: PASS (Exit code 0)

**Step 4: Commit**

```bash
git add apps/admin/components/dashboard/StatCard.tsx apps/admin/app/page.tsx
git commit -m "feat(admin): build operations hero banner and refined kpi stat cards"
```

---

### Task 5: Orders Queue with Slide-over Quick Inspector Drawer (`/orders`)

**Files:**
- Create: `apps/admin/components/orders/OrderDrawer.tsx`
- Modify: `apps/admin/app/orders/page.tsx`
- Modify: `apps/admin/app/orders/[orderNumber]/page.tsx`
- Test: `pnpm --filter admin build`

**Step 1: Create `OrderDrawer.tsx` slide-over component**

- Fixed backdrop `bg-black/40 backdrop-blur-xs`.
- Side panel: `w-full max-w-xl bg-white h-full shadow-2xl border-l border-neutral-200 flex flex-col animate-in slide-in-from-right duration-200`.
- Drawer Header: Order number (font-mono bold), status badge, placement timestamp, close button.
- Drawer Body:
  - Order Actions Box (`bg-neutral-50 rounded-xl border border-neutral-200 p-4`): Workflow advance buttons (`Confirm`, `Send to Packing`, `Dispatch Courier`, `Mark Delivered`).
  - Customer & Delivery snapshot (`bg-white p-4 rounded-xl border border-neutral-200`): Customer name, phone, full address, and courier tracking link.
  - Ordered Items Breakdown: item title, color swatch, size, quantity, unit price, line total.
  - Financial total breakdown.
  - "Open Full Order Details Page" link (`/orders/[orderNumber]`).

**Step 2: Update `apps/admin/app/orders/page.tsx`**

- Status filter tabs: Underline active style (`border-b-2 border-neutral-900 text-neutral-900`).
- Clicking any table row opens `OrderDrawer` instantly.
- Refreshing status inside the drawer auto-refreshes the background table.

**Step 3: Verify build**

Run: `pnpm --filter admin build`
Expected: PASS (Exit code 0)

**Step 4: Commit**

```bash
git add apps/admin/components/orders/OrderDrawer.tsx apps/admin/app/orders/page.tsx apps/admin/app/orders/[orderNumber]/page.tsx
git commit -m "feat(admin): implement slide-over order inspector drawer and clean tabs"
```

---

### Task 6: Variant Stock Matrix with Inline Cell Editing (`VariantStockMatrix.tsx`)

**Files:**
- Create: `apps/admin/components/inventory/VariantStockMatrix.tsx`
- Modify: `apps/admin/app/inventory/page.tsx`
- Modify: `apps/admin/components/products/VariantMatrixEditor.tsx`
- Test: `pnpm --filter admin build`

**Step 1: Build `VariantStockMatrix.tsx` component matching reference**

- `border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-xs`.
- Header: "Variant Inventory Matrix" with total variant count badge.
- Columns:
  - Color: Swatch circle (`w-4 h-4 rounded-full border border-neutral-300 shadow-xs`) + Color Name.
  - Size: Mono font badge (`font-mono font-medium text-xs text-neutral-800`).
  - SKU: Mono text.
  - Stock Available: Inline input (`h-8 w-24 rounded-lg border border-neutral-300 px-2 font-mono text-xs text-neutral-900 bg-white focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900`).
  - Auto-commit: Updates on `Enter` keypress or `blur`, with spinning indicator `⟳`.
  - Inventory Status Badge:
    - Stock = 0: `Out of Stock` (rose)
    - Stock <= 10: `Low Stock` (amber)
    - Stock > 10: `In Stock` (emerald)
- Error banner if update fails.

**Step 2: Update Inventory Page (`/inventory`)**

- Enable inline rapid adjustments directly in table rows.
- Retain "Adjust Stock / Restock" button for opening the full audit notes modal.

**Step 3: Verify build**

Run: `pnpm --filter admin build`
Expected: PASS (Exit code 0)

**Step 4: Commit**

```bash
git add apps/admin/components/inventory/VariantStockMatrix.tsx apps/admin/app/inventory/page.tsx apps/admin/components/products/VariantMatrixEditor.tsx
git commit -m "feat(admin): build inline variant stock matrix editor with instant blur commit"
```

---

### Task 7: Live Dispatch & Courier Fleet Map (`apps/admin/app/dispatch/page.tsx`)

**Files:**
- Create: `apps/admin/app/dispatch/page.tsx`
- Create: `apps/admin/components/dispatch/CourierTelemetryDrawer.tsx`
- Test: `pnpm --filter admin build`

**Step 1: Add Leaflet dependencies to `apps/admin` (matching `apps/web`)**

Install `leaflet` and `@types/leaflet` in `apps/admin`:
```bash
pnpm --filter admin add leaflet
pnpm --filter admin add -D @types/leaflet
```

**Step 2: Implement `/dispatch` page**

- Header: "Live Dispatch & Fleet Map" + "Live courier locations, battery status, and instant delivery dispatch."
- Top action: "Pending Orders (N)" dock toggle button.
- Map Viewport: Leaflet map centered on Phnom Penh (`11.5564`, `104.9282`).
- Courier markers with directional pins (Scooter 🛵 / Van 🚐), speed, and heading.
- Courier Telemetry Drawer (`w-80 bg-neutral-900/95 backdrop-blur-md rounded-2xl border border-neutral-700 shadow-2xl p-5 text-white`):
  - Courier ID, vehicle type.
  - Active delivery tracking number, battery level, speed (km/h), destination address, dynamic ETA.
  - "Assign Delivery" flow for pending processing orders.

**Step 3: Verify build**

Run: `pnpm --filter admin build`
Expected: PASS (Exit code 0)

**Step 4: Commit**

```bash
git add apps/admin/app/dispatch/ apps/admin/components/dispatch/ apps/admin/package.json
git commit -m "feat(admin): implement live courier dispatch and telemetry map page"
```

---

### Task 8: End-to-End Visual Verification & Test Suite

**Files:**
- Modify: `docs/plans/task.md`
- Test: `pnpm --filter admin lint`
- Test: `pnpm --filter admin build`
- Test: `python scripts/verify_admin_pipeline.py`

**Step 1: Run complete automated verification suite**

1. `pnpm --filter admin lint` -> confirm 0 errors, 0 warnings.
2. `pnpm --filter admin build` -> confirm all 11 routes compile into optimized production bundles.
3. `python scripts/verify_admin_pipeline.py` -> confirm all 5 end-to-end admin controller suites pass (100%).

**Step 2: Update task tracker**

Update `docs/plans/task.md` to reflect the completed redesign tasks.

**Step 3: Commit**

```bash
git add docs/plans/task.md
git commit -m "test(admin): verify redesigned admin portal visual styling and test suite"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-11-23-admin-portal-ui-redesign.md`.
Next step: run `.agent/workflows/execute-plan.md` to execute this plan task-by-task in single-flow mode.
