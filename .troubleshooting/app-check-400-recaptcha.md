# Issue: Firebase App Check reCaptchaV3 token exchange returns 400

**Status:** Resolved
**Opened:** 2026-02-20
**Resolved:** 2026-02-20

## Info
- **Symptom:** `POST .../exchangeRecaptchaV3Token` returns 400 (Bad Request). App Check SDK then throttles. Firestore reads fail with "Missing or insufficient permissions" because App Check enforcement is on but no valid token is obtained.
- **Affected area:** `app.js:21-24` (App Check init), Firebase Console App Check config

### What we know
- Site key in client code: `6LdJgHIsAAAAAGJzxrS5dFACwpCQw52WiNYuRVnl`
- Firebase project: `microjef-30443`
- App ID: `1:636289733336:web:fe96bf758e5847568a7dad`
- reCAPTCHA type: confirmed v3 (Score based) at google.com/recaptcha/admin
- Domain registered in reCAPTCHA: `microjef.fun`
- Accessed from: `https://microjef.fun/`
- Firebase App Check: enforcement ON for Firestore and Storage
- Firebase App Check registration: user has entered the SECRET KEY (initially entered site key by mistake, corrected)
- Firebase SDK version: 11.0.2 (loaded from gstatic CDN)
- Still getting 400 after correcting to secret key

### Ruled out so far (conversationally)
- Wrong reCAPTCHA type (confirmed v3)
- Wrong domain (confirmed microjef.fun, accessing from microjef.fun)
- Site key mismatch between code and reCAPTCHA admin (confirmed match)
- Initially had site key in App Check console instead of secret key (user corrected this, still broken)

## Experiments

### H1: App Check throttle cache is stale after secret key correction
- **Rationale:** App Check SDK caches failures and throttles retries with exponential backoff. After correcting the key in the console, the browser may still be serving throttled/cached responses. The Firebase App Check SDK stores tokens in IndexedDB.
- **Experiment:** User should hard-refresh (Ctrl+Shift+R / Cmd+Shift+R), clear site data (DevTools → Application → Clear site data), then reload. If it works, throttle cache was the issue.
- **Result:** Clearing site data and reloading fixed it. Entries load successfully.
- **Verdict:** Confirmed

### H2: Firebase SDK 11.0.2 is outdated and has App Check bugs
- **Rationale:** SDK 11.0.2 is from late 2024. There may be known bugs with reCAPTCHA v3 token exchange that were fixed in later versions.
- **Experiment:** Check current Firebase JS SDK version and compare.
- **Result:** _pending_
- **Verdict:** _pending_

### H3: reCAPTCHA v3 site key was created under wrong Google Cloud project
- **Rationale:** reCAPTCHA keys are tied to Google Cloud projects. If the key was created in a different GCP project than `microjef-30443`, Firebase App Check won't be able to validate it even with the correct secret key.
- **Experiment:** Check reCAPTCHA admin console — the project associated with the key should match the Firebase project.
- **Result:** _pending_
- **Verdict:** _pending_

### H4: The 400 response body contains a specific error message we haven't seen
- **Rationale:** The 400 status alone doesn't tell us WHY. The response body likely contains a JSON error with a specific code/message.
- **Experiment:** In DevTools Network tab, find the failed `exchangeRecaptchaV3Token` request, click it, and read the Response body.
- **Result:** _pending_
- **Verdict:** _pending_

## Resolution

- **Root cause:** Firebase App Check console initially had the reCAPTCHA site key instead of the secret key. After correcting to the secret key, the browser's cached throttle state (IndexedDB) continued serving stale 400 rejections.
- **Fix:** (1) Entered the reCAPTCHA v3 **secret key** in Firebase App Check console. (2) Cleared browser site data to flush the throttle cache.
- **Files changed:** None (console-side fix + browser cache clear)
- **Lessons:** Firebase App Check for reCAPTCHA v3 requires the **secret key** in the console and the **site key** in client code. After changing App Check config, always clear site data — the SDK aggressively caches failures in IndexedDB with exponential backoff.
