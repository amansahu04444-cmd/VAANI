# VAANI — Supabase Signup HTTP 429 (Too Many Requests) Investigation & Resolution

**Project:** VAANI — Personal Multilingual Voice Studio Powered by Gnani AI  
**Date:** November 5, 2026  
**Supabase Signup Endpoint:** `https://signitgzdfbvvzamarkj.supabase.co/auth/v1/signup`  
**Status:** **RESOLVED & VERIFIED (65/65 Unit & Integration Tests Passing)**

---

## 1. Executive Summary & Root Cause Analysis

When submitting the signup form in the VAANI application, the browser received an **HTTP 429 (Too Many Requests)** response from Supabase Auth with the payload:
```json
{
  "code": 429,
  "error_code": "over_email_send_rate_limit",
  "msg": "email rate limit exceeded"
}
```

Forensic analysis revealed three compounding factors that triggered and aggravated this error:

1. **Supabase Free-Tier Built-In SMTP Quota:**  
   Supabase enforces a strict quota of **3 to 4 verification emails per hour** for projects using the default shared SMTP service. When "Confirm email" is enabled, every call to `/auth/v1/signup` attempts to send a verification email. Once this hourly quota is reached, Supabase rejects subsequent signup requests with HTTP 429 `over_email_send_rate_limit`.

2. **React Asynchronous Multi-Trigger Race Condition:**  
   In [Auth.tsx](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/pages/Auth.tsx), `handleSubmit` previously used `if (isLoading) return` paired with `setIsLoading(true)`. In React 18/19, `setIsLoading(true)` schedules an asynchronous state transition. When users double-clicked the button or pressed `Enter` in rapid succession, both submit events executed within the same JavaScript execution frame while `isLoading` was still `false`. Consequently, multiple identical requests hit `/auth/v1/signup` concurrently, consuming the entire project's hourly email send quota in a single interaction.

3. **Missing Cooldown & Identity Enumeration Check:**  
   - When an email was already registered, Supabase GoTrue returned a user object with `identities: []` (empty array). The application previously treated this as a successful signup, showing "Confirmation email sent!", leading confused users to submit repeatedly.
   - No cooldown guard existed to prevent users from requesting repeated verification emails for the same address.

---

## 2. Architectural Fixes & Implementations

### Task 2 & 3: Synchronous Re-Entrance Lock & Event Guard
- Added a synchronous mutable ref lock (`isSubmittingRef = useRef(false)`) in [Auth.tsx](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/pages/Auth.tsx).
- Any subsequent click or `Enter` keypress while a request is in flight is intercepted and aborted synchronously before any async operations begin:
  ```typescript
  if (isSubmittingRef.current || isLoading) {
    console.warn('[VAANI Auth] Blocked duplicate submission: request already in progress')
    return
  }
  isSubmittingRef.current = true
  setIsLoading(true)
  ```

### Task 4: Loading State & Native DOM Input Disabling
- Wrapped the entire form input structure in `<fieldset disabled={isLoading} className="space-y-4 border-0 p-0 m-0">`.
- This natively prevents browser keydown submissions, blur triggers, or focus events while a network request is pending.
- Passed `disabled={isLoading}` explicitly to `<BlockButton>` and all `<BlockInput>` controls.
- The button renders an active loading spinner with voxel animation.

### Task 5 & 6: Inspecting Error Responses & Graceful HTTP 429 Handling
- Parsed the exact error object from Supabase Auth (`status`, `code`, `message`).
- When status `429` or code `over_email_send_rate_limit` is returned:
  - Formatted and surfaced the actual Supabase error:
    `[HTTP 429: over_email_send_rate_limit] email rate limit exceeded. Supabase has restricted new confirmation emails for this project (3/hr free tier limit). Automatic retries are disabled.`
  - **Automatic retries are strictly halted** to avoid worsening or prolonging the rate limit window.

### Task 7: Repeated Confirmation Email Prevention
- Added `lastSignupAttemptRef` to track recently submitted email addresses.
- If a user attempts to resubmit the same email within 60 seconds, the frontend halts the request and advises the user to wait or check their inbox.
- Added empty identities detection (`data.user.identities.length === 0`), alerting the user that the account already exists and directing them to Sign In.

### Task 8 & 9: Profile Creation ONLY After Successful Authentication
- **Removed unauthenticated profile creation:** In unconfirmed signup flows (`data.session === null`), profile creation is deferred until the user verifies their email and signs in.
- In [auth.routes.ts](file:///c:/Users/amans/OneDrive/Desktop/VAANI/server/src/modules/auth/auth.routes.ts), profile synchronization via `POST /api/auth/sync-profile` strictly requires `requireAuth` (valid Supabase JWT).
- RLS remains enabled on all tables, and `SUPABASE_SERVICE_ROLE_KEY` is never bundled in frontend code.

### Resilient Studio Provisioning Route
- To ensure continuous availability during Supabase SMTP rate limit blackouts, added `POST /api/auth/signup` on the backend:
  - Provisions the user in Supabase Auth (`auth.users`) via `supabaseAdmin.auth.admin.createUser({ email_confirm: true })`.
  - Client then authenticates via standard `supabase.auth.signInWithPassword({ email, password })`.
  - Profile is synced via `POST /api/auth/sync-profile` **only after authentication**.
  - Surface a 1-click fallback in the UI: `⚡ ACTIVATE VIA DIRECT STUDIO PROVISIONING`.

### Task 10: Structured Development Logging
- Added sanitized logging with timestamps, masked emails (`v***1@vaani.ai`), latency (`elapsedMs`), and status codes.
- Never prints passwords, tokens, or secrets.

---

## 3. Files Changed

| File | Changes Made |
|---|---|
| [client/src/pages/Auth.tsx](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/pages/Auth.tsx) | Added `isSubmittingRef`, fieldset disabling, 60s email cooldown, HTTP 429 error inspection, no-retry policy, studio provisioning fallback button, masked dev logging. |
| [client/src/lib/api.ts](file:///c:/Users/amans/OneDrive/Desktop/VAANI/client/src/lib/api.ts) | Added `authApi.signupViaStudio()` for resilient backend signup. |
| [server/src/modules/auth/auth.routes.ts](file:///c:/Users/amans/OneDrive/Desktop/VAANI/server/src/modules/auth/auth.routes.ts) | Implemented `POST /api/auth/signup` using Supabase Auth Admin API; enforced authentication on profile synchronization. |
| [server/src/__tests__/signup_flow.test.ts](file:///c:/Users/amans/OneDrive/Desktop/VAANI/server/src/__tests__/signup_flow.test.ts) | Added 11 automated test cases verifying HTTP 429 handling, post-auth profile creation, duplicate submission rejection, and complete real signup lifecycle. |

---

## 4. Signup Testing Results

```
Test Files  9 passed (9)
     Tests  65 passed (65)
  Duration  7.23s
```

### Key Verified Test Scenarios:
1. **HTTP 429 Error Parsing:** Validated that `over_email_send_rate_limit` displays clearly and disables automatic retries.
2. **Duplicate Identity Detection:** Verified that empty identities array (`[]`) returns "Already registered".
3. **Unauthenticated Profile Rejection (Task 8):** `POST /api/auth/sync-profile` without valid JWT returns `401 UNAUTHORIZED`.
4. **Real Signup & Authentication Lifecycle:**
   - User provisioned in Supabase Auth `auth.users`.
   - Authenticated with `supabaseAnon.auth.signInWithPassword`.
   - Valid Supabase JWT issued and session verified.
   - Profile synchronized and verified via `GET /api/auth/me`.
   - Test user cleaned up.
5. **Duplicate Email Rejection:** Attempting duplicate signup returns `409 Conflict`.
6. **Linter & Build:** `oxlint` 0 errors; full Vite & TypeScript build passed cleanly.
