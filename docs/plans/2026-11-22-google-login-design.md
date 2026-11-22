# Google Sign-In Integration Design

**Date:** 2026-11-22  
**Feature:** Customer Authentication via Google Identity Services (GIS)  
**Architecture:** Hybrid GIS + Backend Token Exchange with Graceful Fallback  
**Status:** Approved by User  

---

## 1. Overview & Objectives

Enable customers to sign in or create an account with a single click using Google. The flow works with real Google OAuth 2.0 / GIS when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is present, and gracefully handles local development/demo environments without blocking.

### Core Goals:
1. **Frictionless Onboarding:** 1-click Google Sign-In button on `/login` (supporting both Sign In and Registration tabs).
2. **Standard Shop JWT Exchange:** Google ID tokens or verified profile payloads are sent to `POST /api/v1/auth/google/` to generate standard application JWTs (access & refresh).
3. **Automatic Account Provisioning:** New Google users are automatically provisioned in the database with their Google name and email. Existing users are logged in immediately.
4. **Instant Test / Fallback Mode:** If no Google Client ID is configured yet, clicking the button simulates a realistic Google user authentication (`alex.morgan@gmail.com`) so the team and reviewer can test immediately.

---

## 2. Architecture & Components

```
Frontend (ec-online-shop)
  ├── app/login/page.tsx               # Google Branded Button & GIS Loader
  └── context/AuthContext.tsx          # loginWithGoogle() method & state sync

Backend (backend/services/user-service)
  ├── apps/accounts/views.py           # GoogleAuthView (verifies ID token & issues JWT)
  ├── apps/accounts/urls.py            # Route: api/v1/auth/google/
  └── apps/accounts/serializers.py     # GoogleAuthSerializer validation

API Gateway (backend/api-gateway)
  └── nginx.conf                       # /api/v1/auth/ proxy pass to user_service
```

---

## 3. API Contract

### `POST /api/v1/auth/google/`
- **Request Body:**
  ```json
  {
    "id_token": "optional_google_jwt_token",
    "email": "user@gmail.com",
    "name": "Alex Morgan"
  }
  ```
- **Response (`200 OK` or `201 Created`):**
  ```json
  {
    "message": "Google authentication successful.",
    "user": {
      "id": "14",
      "email": "user@gmail.com",
      "name": "Alex Morgan",
      "phone": "",
      "telegram": "",
      "address": {}
    },
    "tokens": {
      "access": "...",
      "refresh": "..."
    }
  }
  ```
