# Google OAuth 2.0 Authorization Code Flow Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement dynamic Google OAuth 2.0 Authorization Code flow with account selection (`prompt=select_account`), callback route (`/auth/callback/google`), and backend server-side token exchange using `client_id` and `client_secret`.

**Architecture:** Frontend redirects to Google's OAuth endpoint with `prompt=select_account` to allow users to select any Google account; Google redirects back to `/auth/callback/google?code=...`; callback forwards code to backend `POST /api/v1/auth/google/`; backend exchanges code for tokens with Google using `client_secret`, extracts user info, provisions/logs in user, and returns standard shop JWTs.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Django REST Framework, Python `requests`.

---

### Task 1: Backend Server-Side Code Exchange in `user-service`
**Files:**
- Modify: `backend/services/user-service/apps/accounts/serializers.py`
- Modify: `backend/services/user-service/apps/accounts/views.py`

**Step 1: Update `GoogleAuthSerializer`**
Support `code`, `redirect_uri`, and optional fallback `email`/`name`.

**Step 2: Update `GoogleAuthView`**
- If `code` is provided and `GOOGLE_CLIENT_SECRET` is set: exchange `code` at `https://oauth2.googleapis.com/token`.
- Fetch user info from `https://www.googleapis.com/oauth2/v3/userinfo`.
- Match or create `User` in Django.
- Issue standard shop JWT access and refresh tokens.

---

### Task 2: Auth Callback Route in Next.js (`/auth/callback/google`)
**Files:**
- Create: `ec-online-shop/app/auth/callback/google/page.tsx`

**Step 1: Build Callback page with Suspense wrapper**
- Extract `code`, `error`, and `state` from search params.
- If `error`, redirect to `/login?error=...`.
- If `code`, invoke `loginWithGoogle({ code, redirect_uri })`.
- On success, redirect to `state` (or `/profile`).
- Render luxury minimalist loading UI: *"Authenticating with Google... Syncing your account."*

---

### Task 3: Update `AuthContext` and Login Button with `prompt=select_account`
**Files:**
- Modify: `ec-online-shop/context/AuthContext.tsx`
- Modify: `ec-online-shop/app/login/page.tsx`

**Step 1: Update `loginWithGoogle` in `AuthContext`**
Accept `{ code?: string; redirect_uri?: string; email?: string; name?: string }`.
Send to `${API_BASE}/auth/google/`.

**Step 2: Update "Continue with Google" button in `app/login/page.tsx`**
Build authorization URL:
`https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=openid%20email%20profile&prompt=select_account&access_type=offline&state=...`
Navigate to Google account picker.

---

### Task 4: Comprehensive Verification & Lint/Build Check
**Files:**
- Verification only

**Step 1: Run ESLint**
Run `npm run lint` in `ec-online-shop`. Expected: 0 errors, 0 warnings.

**Step 2: Run Production Build**
Run `npm run build` in `ec-online-shop`. Expected: Exit code 0, `/auth/callback/google` generated.

**Step 3: Update Task Tracker**
Update `docs/plans/task.md`.
