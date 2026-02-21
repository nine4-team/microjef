# Issue: Firebase "Missing or insufficient permissions" on localhost writes

**Status:** Resolved
**Opened:** 2026-02-21
**Resolved:** 2026-02-21

## Info
- **Symptom:** Saving a new entry throws `FirebaseError: Missing or insufficient permissions` at `app.js:444` on **both localhost and production** (`microjef.fun`).
- **Affected area:** `app.js:411-450` (form submit handler), Firestore `entries` collection

### What we know
- Firebase project: `microjef-30443`
- App Check enforcement is ON for Firestore (confirmed from previous session)
- `app.js:22-30`: App Check is initialized with `ReCaptchaV3Provider`
- `app.js:23-25`: Debug token mode is enabled for localhost:
  ```js
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  ```
- When `FIREBASE_APPCHECK_DEBUG_TOKEN = true`, the App Check SDK generates a UUID debug token and logs it to the console. That UUID must be **manually registered** in the Firebase Console under App Check → Apps → Manage debug tokens.
- If the debug token is not registered, App Check enforcement will reject all writes with "Missing or insufficient permissions" (same error as a security rules violation, but caused by App Check upstream).
- reCAPTCHA v3 does NOT work on localhost (unregistered domain), so the debug token path is the only viable one.
- Firestore rules for `create` require: `title`, `body`, `author`, `createdAt`, `imageURLs` — all of which are sent in `addDoc` at `app.js:431-437`. Rules look structurally correct.

## Experiments

### H1: App Check debug token is not registered in Firebase Console
- **Rationale:** App Check enforcement is on. reCAPTCHA v3 cannot validate on localhost. The code sets `FIREBASE_APPCHECK_DEBUG_TOKEN = true` which should generate a UUID debug token in the console — but that token must be explicitly registered in Firebase Console. If unregistered, every Firestore write is rejected with a permissions error (App Check blocks before rules even run).
- **Experiment:** Open DevTools console while on localhost. Look for a message like: `App Check debug token: <uuid>. You will need to allow this debug token in the Firebase console.` If that message appears and the UUID is not registered in Firebase Console → App Check → Apps → [App] → Manage debug tokens, this is the cause.
- **Result:** User confirms debug token was previously registered. However, the previous session's fix involved clearing all site data — this would have deleted the stored debug UUID from IndexedDB, causing App Check to generate a new UUID on next load. The newly generated UUID would not be registered, causing the same failure.
- **Verdict:** Inconclusive — token may have rotated after site data clear. Need to confirm whether the UUID currently in DevTools console matches the one registered in Firebase Console.

### H1b: Site data clear (from previous session fix) caused a new debug UUID to be generated, invalidating the registered token
- **Rationale:** App Check stores the debug UUID in IndexedDB. When site data was cleared to fix the production reCAPTCHA throttle issue, the UUID was wiped. App Check auto-generated a new one, but only the old UUID is registered in Firebase Console.
- **Experiment:** Compare the UUID logged in DevTools console on localhost vs. the UUID(s) in Firebase Console → App Check → Manage debug tokens.
- **Result:** _pending_
- **Verdict:** _pending_

### H3: Firestore rules in Firebase Console are different from local firestore.rules (never deployed or overwritten)
- **Rationale:** Production and localhost both failing means the issue is not environment-specific. The local `firestore.rules` looks correct. But if the rules were never deployed via `firebase deploy --only firestore:rules`, Firebase is running whatever rules were set previously — possibly the default deny-all.
- **Experiment:** Check the rules currently active in Firebase Console → Firestore → Rules tab. Compare to local `firestore.rules`. If they differ, the local rules were never deployed.
- **Result:** _pending_
- **Verdict:** _pending_

### H4: Form allows empty body but Firestore rule requires body.size() > 0
- **Rationale:** User confirmed the error occurs specifically when saving without a description. `firestore.rules:11` enforces `request.resource.data.body.size() > 0`. An empty body fails this check, and Firestore returns the generic "Missing or insufficient permissions" message. No client-side validation prevents the submit.
- **Experiment:** Attempt to save with an empty body field — confirm it fails. Attempt with a non-empty body — confirm it succeeds.
- **Result:** Confirmed by user — error occurs specifically when body is empty.
- **Verdict:** Confirmed — root cause identified.

### H2: Firestore security rules have a validation bug causing create to fail
- **Rationale:** The `create` rule references `title.size()`, `body.size()`, `author.size()` as shorthand — but the correct syntax in Firestore rules is `request.resource.data.title.size()`. Shorthand may work or may not depending on rule scope.
- **Experiment:** Read `firestore.rules` and check syntax.
- **Result:** All field references use full `request.resource.data.<field>.size()` syntax (lines 8-15). Rules are syntactically correct.
- **Verdict:** Ruled Out

## Resolution
_Do not fill this section until the fix is verified._
