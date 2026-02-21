# Issue: Firebase "Missing or insufficient permissions" on localhost writes

**Status:** Active
**Opened:** 2026-02-21
**Resolved:** _pending_

## Info
- **Symptom:** Saving a new entry on localhost throws `FirebaseError: Missing or insufficient permissions` at `app.js:444` (inside the `addDoc`/`updateDoc` catch block).
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
- **Result:** _pending_
- **Verdict:** _pending_

### H2: Firestore security rules have a validation bug causing create to fail
- **Rationale:** The `create` rule references `title.size()`, `body.size()`, `author.size()` as shorthand — but the correct syntax in Firestore rules is `request.resource.data.title.size()`. Shorthand may work or may not depending on rule scope.
- **Experiment:** Read `firestore.rules` and check syntax.
- **Result:** All field references use full `request.resource.data.<field>.size()` syntax (lines 8-15). Rules are syntactically correct.
- **Verdict:** Ruled Out

## Resolution
_Do not fill this section until the fix is verified._
