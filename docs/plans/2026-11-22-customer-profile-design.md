# Customer Profile Page Design (Option A: Clean Multi-Tab Hub)

**Date:** 2026-11-22  
**Feature:** Customer Account & Profile Page (`/profile`)  
**Design Pattern:** Option A - Multi-Tab Clean Hub (Shopify Plus / COS / SSENSE aesthetic)  
**Status:** Approved by User  

---

## 1. Overview & Objectives

Deliver a luxury, clutter-free customer account profile experience for `ec-online-shop`. Customers can manage their personal identity, maintain a Cambodia delivery address book (provinces, khans, sangkats, and courier landmarks), review their order history with real-time tracking and invoice links, and manage account security.

### Core Goals:
1. **Uncluttered Navigation:** Left vertical tabs on desktop (horizontal scrollable pills on mobile) for 4 focused views:
   - **Personal Info** (Name, email, phone, Telegram handle)
   - **Addresses** (Cambodia address book with default address badge and quick edit/add/delete)
   - **Order History** (Order cards with items, payment badges, status pills, and invoice links)
   - **Security** (Change password, active session info, logout)
2. **Cambodia E-Commerce Localization:** First-class fields for phone numbers (`012...` / `+855...`), Telegram username (`@username`), and granular Cambodia address hierarchy (City/Province, Khan/District, Sangkat/Commune, Landmark).
3. **Dual Currency & Payment Context:** Displays pricing in USD ($) and approximate KHR (៛), showing payment badges for **Bakong KHQR** and **Cash on Delivery**.
4. **Resilient Backend Integration:** Direct integration with `user-service` and `order-service` via API Gateway, with graceful fallback to `AuthContext` demo state (`Sophea Chan`) when running offline or without an active microservice cluster.

---

## 2. Architecture & Components

```
ec-online-shop/
├── app/
│   └── profile/
│       ├── page.tsx                    # Profile Page Entry (Auth Guard & Tab Controller)
│       └── components/
│           ├── ProfileSidebar.tsx       # Tab navigation & user mini-card
│           ├── PersonalInfoTab.tsx      # Personal info view & edit form
│           ├── AddressBookTab.tsx       # Cambodia address list & modal/card editor
│           ├── OrderHistoryTab.tsx      # Orders list with status badges & items
│           └── SecurityTab.tsx          # Password change & session actions
├── components/
│   └── Header.tsx                       # Update account link from /login to /profile
└── context/
    └── AuthContext.tsx                  # User profile state & sync helpers
```

---

## 3. Data Schema & Requirements

### Customer Identity (`User`)
- `id`: string
- `name`: string (First Name + Last Name)
- `email`: string (read-only primary identifier)
- `phone`: string (e.g. `012889977`)
- `telegram`: string (e.g. `@sopheachan`)
- `memberSince`: string / date

### Cambodia Address (`CustomerAddress`)
- `id`: number / string
- `full_name`: string
- `phone`: string
- `telegram`: string (optional)
- `city_province`: string (e.g., "Phnom Penh", "Siem Reap")
- `khan_district`: string (e.g., "Chamkarmon", "Daun Penh")
- `sangkat_commune`: string (e.g., "Boeung Keng Kang 1")
- `street_address`: string (e.g., "House #42, Street 310")
- `landmark`: string (e.g., "Near Brown Coffee BKK57")
- `is_default`: boolean

### Order Summary Item (`Order`)
- `id`: string (`order_number`)
- `created_at`: string (ISO date)
- `status`: `'pending' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled'`
- `payment_status`: `'PAID' | 'UNPAID' | 'PENDING'`
- `payment_method`: `'khqr' | 'cod'`
- `total`: number (USD)
- `total_khr`: number (KHR)
- `items`: array of `{ product_title, variant_id, size, color, quantity, unit_price, thumbnail }`

---

## 4. API Endpoints

- `GET /api/v1/users/me/`: Fetch current user info and addresses.
- `PATCH /api/v1/users/me/`: Update profile info (`first_name`, `last_name`, `phone`, `telegram`).
- `GET /api/v1/addresses/`: Retrieve saved addresses for current user.
- `POST /api/v1/addresses/`: Create a new shipping address.
- `PATCH /api/v1/addresses/<id>/`: Update an existing address.
- `DELETE /api/v1/addresses/<id>/`: Remove an address.
- `GET /api/v1/orders/`: Fetch customer orders.
