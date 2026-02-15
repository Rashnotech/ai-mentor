# OAuth 2.0 Configuration Guide

This document explains how to set up Google and GitHub OAuth for the application.

---

## Required Environment Variables

Add these to your **`.env`** file (backend):

```env
# ── Google OAuth ──────────────────────────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# ── GitHub OAuth ──────────────────────────────────────────────────
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/callback
```

> **Important:** The redirect URIs point to the **frontend** callback page (`/auth/callback`). The frontend page relays the authorization code to the backend for token exchange.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use an existing one)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Select **Web application**
6. Set:
   - **Authorized JavaScript origins**: `http://localhost:3000` (and your production domain)
   - **Authorized redirect URIs**: `http://localhost:3000/auth/callback` (and your production domain equivalent)
7. Copy the **Client ID** and **Client Secret** into your `.env`

### Required Scopes
- `openid`
- `email`
- `profile`

---

## GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: Your app name
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/callback`
4. Copy the **Client ID**
5. Click **Generate a new client secret** and copy the **Client Secret** into your `.env`

### Required Scopes
- `user:email`

---

## Production Configuration

For production, update the redirect URIs in both the `.env` file and the provider consoles:

```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/callback
GITHUB_REDIRECT_URI=https://yourdomain.com/auth/callback
```

Make sure to also add the production URLs as authorized redirect URIs in the Google Cloud Console and GitHub OAuth App settings.

---

## How the Flow Works

```
1. User clicks "Google" / "GitHub" on login/signup page
2. Frontend calls GET /api/v1/auth/oauth/{provider}
   → Backend returns { authorization_url, state }
3. Frontend stores provider in sessionStorage, redirects browser to authorization_url
4. User grants consent on provider's page
5. Provider redirects to /auth/callback?code=...&state=...  (frontend)
6. Frontend callback page calls GET /api/v1/auth/oauth/{provider}/callback?code=...&state=...
   → Backend validates CSRF state, exchanges code for tokens, creates/links user, issues JWT
7. Frontend stores JWT tokens, sets user in store, redirects to dashboard
```

### User Account Scenarios

| Scenario | Behavior |
|----------|----------|
| **New user** | Account created with no password, `is_verified = true`, redirected to onboarding |
| **Existing user, same email** | OAuth provider linked to existing account, user logged in |
| **Returning OAuth user** | Logged in directly via provider match |

---

## Security Notes

- **CSRF protection**: A random `state` token is generated per OAuth request and verified on callback.
- **No password for OAuth users**: Users who sign up via OAuth have `password = NULL`. If they try password login, they get a clear error message directing them to use their social provider.
- **Email auto-verified**: OAuth provider emails are considered pre-verified.
- **State store**: Currently uses in-memory dict. For production multi-instance deployments, migrate to Redis or database-backed state storage.

---

## Database Migration

Run the Alembic migration to add the OAuth columns to the `users` table:

```bash
cd api
alembic upgrade head
```

This adds:
- `auth_provider` (String 20, nullable, indexed) — `"google"`, `"github"`, or `NULL`
- `provider_id` (String 255, nullable) — the provider's unique user ID
- `password` column made nullable for OAuth-only accounts
- Composite index on `(auth_provider, provider_id)` for fast lookups
