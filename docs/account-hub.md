# Account Hub — v1 Completion Report & Forward Phase Map

> **Date**: 2026-03-20
> **SDLC Stage**: 2 (Development) — ready for Stage 3 (Review)
> **Feature ID**: `account-hub`
> **Route**: `/account/*`
> **Branch**: `feature/nectarios-parsells/2026-03-07/church-onboarding-pipeline`

---

## 1. Overview

### What It Is

The Account Hub is a unified self-service dashboard where authenticated users manage their personal account settings, security posture, notification preferences, and (when applicable) their church's administrative settings. It replaces what was previously a scatter of individual settings pages and profile modals with no common structure.

### Who It Is For

Every authenticated user on the platform. The hub adapts its visible pages based on two factors:

1. **Authentication** — all self-service pages (profile, password, sessions, notifications) are always available.
2. **Church context** — church-scoped pages (parish info, church details, branding, OCR) only appear when `user.church_id` is set. Edit access within those pages is further gated by role.

### Architectural Intent

- **Single address for "my settings"** — users never need to hunt through admin menus to change their own data.
- **Capability-aware navigation** — the sidebar shows only what the user can actually access, not a list of grayed-out links.
- **Clean separation from Admin** — the Account Hub manages data the user owns or their church delegates to them. Platform-wide admin operations (user management, system config, analytics) stay in the Admin Control Panel.
- **Shared typed API layer** — all pages use `accountApi.ts` instead of inline `fetch()` calls, ensuring consistent auth, error handling, and response typing.

### What Problem It Solves

Before the Account Hub:
- Password changes happened via a modal buried in the header.
- Church settings were split across admin pages with inconsistent permission checks.
- Notification preferences had no UI.
- Session management did not exist.
- Email verification had no frontend flow.
- Profile editing was incomplete and lacked dirty-state tracking.

---

## 2. v1 Feature Inventory

### Self-Service Pages (always visible)

| Route | Component | Purpose | Editability | Backend |
|-------|-----------|---------|-------------|---------|
| `/account/profile` | AccountProfilePage | Read-only profile summary: name, email, role, church, contact info | Read-only | `GET /api/user/profile` |
| `/account/personal-info` | AccountPersonalInfoPage | Edit display name, phone, company, location | Self-service edit | `GET/PUT /api/user/profile` |
| `/account/password` | AccountPasswordPage | Security overview, change password, email verification status, 2FA status | Self-service edit | `GET /api/user/profile/security-status`, `PUT /api/user/profile/password`, `POST /api/user/profile/resend-verification` |
| `/account/sessions` | AccountSessionsPage | View active sessions by device/browser, revoke individual or all others | Self-service action | `GET /api/user/sessions`, `DELETE /api/user/sessions/:id`, `POST /api/user/sessions/revoke-others` |
| `/account/notifications` | AccountNotificationsPage | Toggle email/in-app channels per notification type, grouped by category | Self-service edit | `GET/PUT /api/notifications/preferences` |

### Church-Context Pages (visible when `user.church_id` is set)

| Route | Component | Purpose | Editability | Backend |
|-------|-----------|---------|-------------|---------|
| `/account/parish` | AccountParishInfoPage | Read-only overview of church association, role, and contact details; action links to edit pages | Read-only | `GET /api/my/church-settings` |
| `/account/church-details` | AccountChurchDetailsPage | Name, contact, address, jurisdiction, calendar type, language, website | Edit: `priest+` / View: all with church | `GET/PUT /api/my/church-settings` |
| `/account/branding` | AccountBrandingPage | Logo uploads (primary, dark, favicon), short name, brand colors | Edit: `church_admin+` / View: all with church | `GET/PUT /api/my/church-settings`, `POST/DELETE /api/my/church-branding/:field` |
| `/account/ocr-preferences` | AccountOcrPreferencesPage | OCR language, confidence threshold, image preprocessing, document processing, retention | Edit: `church_admin+` | `GET/PUT /api/my/ocr-preferences` |

### Supporting Routes (outside Account Hub layout)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/auth/verify-email?token=...` | VerifyEmailPage | Email verification callback from link in email. Not inside Account Hub layout. |

---

## 3. Permission Model

### Role Hierarchy

```
super_admin > admin > church_admin > priest > deacon > editor > viewer > guest
```

### Permission Functions (`accountPermissions.ts`)

| Function | Gate | Used By |
|----------|------|---------|
| `canAccessAccountHub(user)` | Authenticated | Route guard on `/account` |
| `hasChurchContext(user)` | `user.church_id` truthy | Nav visibility for church pages |
| `canViewChurchSettings(user)` | Same as hasChurchContext | Parish, Church Details, Branding (view mode) |
| `canEditBasicChurchInfo(user)` | `church_id` + role in `[super_admin, admin, church_admin, priest]` | Church Details edit toggle |
| `canEditChurchSettings(user)` | `church_id` + role in `[super_admin, admin, church_admin]` | Branding edit toggle |
| `canManageOcrPreferences(user)` | `church_id` + role in `[super_admin, admin, church_admin]` | OCR page visibility + edit |

### Nav Visibility Logic

The `AccountLayout` sidebar filters items using `visible` predicates on each nav entry:

- **5 self-service items**: Always shown to all authenticated users.
- **3 church items** (Parish, Church Details, Branding): Shown when `hasChurchContext(user)`.
- **1 admin item** (OCR): Shown when `canManageOcrPreferences(user)`.

Edit vs. read-only within each page is determined independently by the page component, not the nav.

### Direct-Route Behavior

If a user navigates directly to a church-scoped route without a church context:
- Church Details and Branding show a "not affiliated" empty state.
- Parish Info shows a "No Parish Affiliation" card.
- OCR Preferences shows a permission-denied alert.

No 404s. No blank pages. Each page handles the missing-context case gracefully.

---

## 4. Architecture Summary

### Frontend Structure

```
front-end/src/features/account/
  AccountLayout.tsx             ← Sidebar nav + Outlet wrapper
  AccountProfilePage.tsx        ← Read-only profile
  AccountPersonalInfoPage.tsx   ← Edit personal info
  AccountPasswordPage.tsx       ← Security + password + verification
  AccountSessionsPage.tsx       ← Session management
  AccountNotificationsPage.tsx  ← Notification preferences
  AccountParishInfoPage.tsx     ← Church overview (read-only)
  AccountChurchDetailsPage.tsx  ← Church details (conditional edit)
  AccountBrandingPage.tsx       ← Branding (conditional edit)
  AccountOcrPreferencesPage.tsx ← OCR settings (conditional edit)
  accountApi.ts                 ← Typed API client layer
  accountConstants.ts           ← Shared types, constants, helpers
  accountPermissions.ts         ← Permission predicates
```

### Shared API Layer (`accountApi.ts`)

All Account Hub pages use a centralized API client with:

- **`request<T>(url, init)`**: Wrapper around `fetch()` with `credentials: 'include'`, automatic JSON parsing, and typed error throwing (attaches `.status` and `.data` to thrown errors).
- **5 API groups**: `profileApi`, `churchApi`, `sessionsApi`, `notificationsApi`, `ocrApi` — each with typed methods matching backend endpoints.
- **`extractErrorMessage(data)`**: Consistent user-safe error extraction from any API response shape.
- **`extractChurchSettings(response)`**: Normalizes the two response shapes (`data.data.settings` vs `data.settings`) into one path.

No page makes raw `fetch()` calls. No page uses `apiClient` (axios). The Account Hub is self-contained in its API access.

### Data Scoping

| Scope | Storage | Examples |
|-------|---------|---------|
| **User-scoped** | `orthodoxmetrics_db.users` (profile_attributes JSON column) | Display name, phone, company, location, profile images |
| **User-scoped** | `orthodoxmetrics_db.refresh_tokens` | Active sessions |
| **User-scoped** | `orthodoxmetrics_db.user_notification_preferences` | Notification channels |
| **User-scoped** | `orthodoxmetrics_db.email_verification_tokens` | Verification tokens |
| **Church-scoped** | `orthodoxmetrics_db.churches` | Name, address, calendar, branding |
| **Church-scoped** | `om_church_{id}.ocr_settings` | OCR preferences (tenant DB) |
| **Filesystem** | `server/storage/church-branding/{churchId}/` | Logo and favicon files |

### Session/Security Architecture

- Session-cookie auth via `credentials: 'include'` on all requests.
- Refresh tokens stored in `refresh_tokens` table with `token_hash` (SHA-256).
- Password change revokes all other refresh tokens.
- Email verification uses SHA-256 hashed tokens with 24-hour expiry and 2-minute rate limiting.
- Session listing identifies current session by matching the `refresh_token` cookie hash.

---

## 5. What Is Complete

### Delivered Capabilities

- **Profile read and edit** with dirty-state tracking and cancel/save flow.
- **Password change** with strength meter, client-side validation, and automatic session revocation.
- **Security overview** showing account age, password age, session count, email verification status, and 2FA readiness.
- **Email verification flow**: send/resend verification email, token-based verification callback page, rate limiting, status display.
- **Session management**: list all sessions with device/browser/IP detection, revoke individual sessions, revoke all others.
- **Notification preferences**: per-type email/in-app toggles, category grouping, security notifications locked on.
- **Parish overview**: read-only church summary with role display and action links.
- **Church details editing**: name, contact, address, calendar, language, jurisdiction, website with permission-aware edit/view modes.
- **Branding management**: logo upload/delete (primary, dark, favicon), short name, primary/secondary colors, live preview.
- **OCR preferences**: language, confidence threshold, image preprocessing toggles, document processing options, retention settings.
- **Capability-aware sidebar navigation** that adapts to user role and church context.
- **Shared permission model** with 6 predicate functions.
- **Shared typed API layer** with 5 grouped modules and consistent error handling.
- **Shared constants** eliminating cross-page duplication (snackbar config, calendar/language options, role descriptions).

### Production-Grade

The following are considered production-quality and ready for stage promotion:

- Profile read/edit flow (Personal Info page)
- Password change with session revocation
- Session management
- Notification preferences
- Permission model and nav visibility
- API client layer
- Account Layout

---

## 6. Known Gaps / Technical Debt

### Must Fix Before Stage 5

| Gap | Detail | Priority |
|-----|--------|----------|
| **No expired verification token cleanup** | `email_verification_tokens` table has no scheduled job to purge expired/used rows. Will grow unbounded. | High |
| **OCR dirty tracking is boolean-only** | `AccountOcrPreferencesPage` uses a simple `dirty` boolean flag instead of saved-state comparison like other pages. Discard reloads from API instead of reverting to saved state. Works but inconsistent with the pattern used by other pages. | Medium |
| **Profile `first_name`/`last_name` not editable** | GET profile returns them, but the Personal Info page doesn't expose them as editable fields. `display_name` is derived from them when not explicitly set. This is intentional for v1 but may confuse users who want to change their legal name. | Low |
| **`user.api.ts` is fully orphaned** | 13+ methods pointing to `/api/users/*` endpoints that don't exist. Imported in 0 files after cleanup. Safe to delete. | Low |

### Should Fix (Non-Blocking)

| Gap | Detail |
|-----|--------|
| **Church settings field naming** | Backend `churches` table has both `name` and `church_name` columns. `getChurchDisplayName()` handles this, but the DB should be normalized. |
| **Profile attributes are a JSON blob** | `users.profile_attributes` stores display_name, phone, company, etc. as JSON. Works but makes SQL queries against these fields impossible without JSON functions. |
| **Email change flow does not exist** | Email is shown as disabled ("Email cannot be changed") on Personal Info. There is no self-service email change + re-verification flow. |
| **2FA marked "Not Available"** | The Password & Auth page truthfully displays 2FA as not implemented. No backend infrastructure exists for TOTP/WebAuthn. |
| **No audit logging for church settings changes** | Profile updates and password changes are logged to `activity_log`. Church settings changes are not. |
| **Branding save re-fetches settings** | `AccountBrandingPage.handleSave` does a GET before PUT to merge fields. This is a workaround for the PUT endpoint expecting all fields. The endpoint should support partial updates. |

---

## 7. Recommended Next Phases

### Phase 2: Security & Account Enhancements

**Priority: High. These improve security posture and user trust.**

| Item | Description | Complexity |
|------|-------------|-----------|
| **Verification token cleanup job** | Scheduled task to delete `email_verification_tokens` where `used_at IS NOT NULL OR expires_at < NOW()`. Cron or in-process interval. | Small |
| **Self-service email change** | Change email + require re-verification. Send confirmation to both old and new addresses. Update `users.email` only after new address is verified. | Medium |
| **Login activity log** | Show last N login events (time, IP, device) on the Password & Auth page. Backend already logs to `activity_log`. Just surface it. | Small |
| **Account deletion / data export** | Self-service account deletion with confirmation flow and optional data export (GDPR-adjacent). | Large |
| **Two-factor authentication** | TOTP-based 2FA (authenticator app). Requires backend TOTP secret storage, QR code generation, verification during login, recovery codes. | Large |

### Phase 3: Church-Admin Operational Settings

**Priority: Medium. These extend the hub for church administrators.**

| Item | Description | Complexity |
|------|-------------|-----------|
| **Church member management** | View/invite/remove church members and assign roles. Currently admin-only. Moving basic member listing here would reduce admin dependency. | Medium |
| **Records landing page branding** | The backend already has `/api/churches/:churchId/records-landing` endpoints. No Account Hub page exposes them. This is a natural extension of the Branding page. | Small |
| **Church timezone and currency settings** | Fields exist in DB and are returned by the API but not exposed in any Account Hub form. | Small |
| **Audit log viewer** | Church-scoped audit log of settings changes. Requires backend audit logging for church settings (currently missing). | Medium |

### Phase 4: Platform / Admin Boundary Cleanup

**Priority: Low. Reduces confusion about where settings live.**

| Item | Description | Complexity |
|------|-------------|-----------|
| **Deprecate Berry profile pages** | Legacy Berry template profile pages (`/berry/profile/*`) at Stage 1 should be formally deprecated and removed once Account Hub reaches Stage 5. | Small |
| **Delete `user.api.ts`** | Fully orphaned file with 13+ methods pointing to nonexistent endpoints. Zero importers remain. | Trivial |
| **Admin → Account Hub redirects** | If admin pages have "edit your profile" links that point to old locations, add redirects to `/account/*`. | Small |
| **Unify profile image upload** | Profile image upload (PUT `/api/user/profile/images`) exists in the backend but has no UI in Account Hub. Decide if it belongs here or stays admin-only. | Small |

---

## 8. Boundary Rules

### Account Hub (`/account/*`)

**Owns**: Settings and data that belong to the authenticated user or their delegated church context.

- Personal profile (name, contact, avatar)
- Security (password, sessions, email verification, 2FA)
- Notification preferences
- Church settings the user is authorized to edit (details, branding, OCR)
- Parish membership overview

**Does NOT own**:
- Other users' data
- Platform-wide configuration
- Analytics or reporting
- Record entry or management
- Feature flags or SDLC controls
- System health or infrastructure

**Rule**: If it answers "How do I configure my own X?", it belongs here. If it answers "How do I manage the platform's X?" or "How do I manage another user's X?", it does not.

### Admin Control Panel (`/admin/*`)

**Owns**: Platform-wide operations requiring elevated access.

- User management (create, disable, assign roles across churches)
- Church management (create churches, assign admins, lifecycle)
- System configuration (feature flags, SDLC stages, build info)
- Platform analytics and reporting
- OM Daily (work tracking)
- System health, logs, diagnostics

**Rule**: If it requires `super_admin` or `admin` role and affects multiple users or churches, it belongs here.

### Devel Tools (`/devel/*`)

**Owns**: Developer-facing internal tools not intended for end users.

- Build console
- Prompt plans
- Component galleries
- Map experiments
- Deprecated component tracking

**Rule**: If it would never appear in a user-facing product tour, it belongs here.

### Overlap Prevention

| Scenario | Correct Home | Why |
|----------|-------------|-----|
| User changes their own password | Account Hub | Self-service |
| Admin resets another user's password | Admin | Cross-user operation |
| Church admin uploads their church's logo | Account Hub | Delegated church setting |
| Super admin creates a new church | Admin | Platform-wide operation |
| User views their own sessions | Account Hub | Self-service |
| Admin views all users' sessions | Admin | Cross-user audit |
| User sets their notification preferences | Account Hub | Self-service |
| Admin configures platform notification types | Admin | Platform configuration |

---

## 9. SDLC Stage Recommendation

The Account Hub is currently registered at **Stage 2 (Development)**. Based on the v1 feature set:

- All 9 pages are functional and tested.
- Shared API layer, permissions, and constants are in place.
- No critical bugs are known.
- The one high-priority gap (verification token cleanup) is a backend scheduled task, not a frontend issue.

**Recommendation**: Promote to **Stage 3 (Review)** after:
1. Adding the verification token cleanup job (small backend task).
2. Deleting the orphaned `user.api.ts` file.
3. A manual walkthrough of all 9 pages across roles (super_admin, church_admin, priest, user-without-church).

**Recommendation for Stage 5 (Production)**: After Phase 2 security items (email change, login activity log) are implemented.
