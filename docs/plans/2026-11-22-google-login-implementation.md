# Google Sign-In Integration Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement Google Sign-In with backend token exchange (`POST /api/v1/auth/google/`), AuthContext integration, and luxury branded UI on the storefront login page.

**Architecture:** Frontend Next.js login page features the official Google button and Google Identity Services SDK script; AuthContext manages token receipt and storage; backend `user-service` validates credentials, provisions or logs in the user, and returns standard JWT tokens.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Django REST Framework, PyJWT.

---

### Task 1: Backend Google Auth View & Route in `user-service`
**Files:**
- Modify: `backend/services/user-service/apps/accounts/serializers.py`
- Modify: `backend/services/user-service/apps/accounts/views.py`
- Modify: `backend/services/user-service/apps/accounts/urls.py`

**Step 1: Add GoogleAuthSerializer**
Validate `id_token`, `email`, and `name`.

**Step 2: Add GoogleAuthView**
- If `id_token` provided, verify with Google tokeninfo endpoint or decode payload.
- Find or create `User` by `email`.
- Issue standard tokens with `generate_tokens_for_user(user)`.

**Step 3: Register route**
Register `path('api/v1/auth/google/', GoogleAuthView.as_view(), name='auth-google')`.

---

### Task 2: Frontend `AuthContext` Google Login Handler
**Files:**
- Modify: `ec-online-shop/context/AuthContext.tsx`

**Step 1: Define `loginWithGoogle` method in `AuthContextType`**
Accept optional `{ email?: string, name?: string, id_token?: string }`.

**Step 2: Implement endpoint call and fallback**
POST to `${API_BASE}/auth/google/`; if offline or mock, generate a clean local session for `Alex Morgan (Google User)`.

**Step 3: Update `User` and `token` state**
Persist to `clothes_auth_user` and `clothes_auth_token`.

---

### Task 3: Login Page Google Branded Button & GIS Integration
**Files:**
- Modify: `ec-online-shop/app/login/page.tsx`

**Step 1: Add Google Identity Services script loader**
Load Google's `https://accounts.google.com/gsi/client` script asynchronously.

**Step 2: Render luxury Google branded button**
Render official SVG Google icon + "Continue with Google" button with clean hover and loading states.
Add divider line: `"or continue with email"`.

**Step 3: Wire up click and callback handlers**
Trigger Google One-Tap / popup or demo fallback on click.

---

### Task 4: Comprehensive Verification & Lint/Build Check
**Files:**
- Verification only

**Step 1: Run ESLint**
Run `npm run lint` in `ec-online-shop`. Expected: 0 errors, 0 warnings.

**Step 2: Run Production Build**
Run `npm run build` in `ec-online-shop`. Expected: Exit code 0.

**Step 3: Update task tracker**
Mark all tasks complete in `docs/plans/task.md`.
