# ACHIEVER JEE/NEET — Firebase setup

This app supports optional Firebase Email/Password accounts, owner-scoped Cloud Firestore workspace snapshots, Firebase Storage rules, and optional Firebase App Check. The integration is deliberately disabled until you configure a **dedicated JEE/NEET Firebase project**.

> Do not use the Firebase project, Firestore database, Storage bucket, service account or credentials from ACHIEVER GATE. Keep both applications and student datasets separate.

## 1. Create the project

1. Create a new project in the Firebase Console for ACHIEVER JEE/NEET.
2. Register a Web app and copy its web configuration.
3. Enable **Authentication → Sign-in method → Email/Password**.
4. Create a Cloud Firestore database.
5. Enable Firebase Storage.
6. Add your production and preview hosting domains under Authentication → Settings → Authorized domains.

Add the Web app values to the deployment environment:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_APP_ID`

These VITE values are client configuration identifiers, not server secrets. Firestore and Storage security rules are the ownership boundary.

## 2. Deploy owner-only rules

Install Firebase CLI and authenticate with a project administrator account. From the repository root:

```bash
npx firebase-tools login
npx firebase-tools use --add
npx firebase-tools deploy --only firestore:rules,storage
```

Select the new JEE/NEET Firebase project. The included `firestore.rules` and `storage.rules` restrict all user workspace data to the authenticated owner UID.

## 3. Configure App Check (recommended)

1. In Firebase Console, open App Check.
2. Register the Web app with reCAPTCHA Enterprise.
3. Add the site key to `VITE_FIREBASE_APPCHECK_SITE_KEY`.
4. Verify tokens work on your production domain before enforcing App Check for any Firebase product.
5. Set `REQUIRE_FIREBASE_APP_CHECK=true` in the server environment only after the client site key and App Check configuration are working.

## 4. Configure secure AI Mentor server access

The Vercel API route uses Firebase Admin to verify ID tokens and Firebase Firestore to track user quotas. Create a dedicated service account for this JEE/NEET project with only the permissions required to verify Firebase identities and read/write the usage documents. Add the service account JSON as the server-only environment variable:

- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default `gpt-4o-mini`)
- `OPENAI_BASE_URL` (default OpenAI Responses API)
- `AI_MENTOR_DAILY_LIMIT` (default 60)
- `AI_MENTOR_PER_MINUTE_LIMIT` (default 5)
- `REQUIRE_FIREBASE_APP_CHECK` (default false; recommended true after client App Check is verified)

Never commit a service-account file or expose either server credential through VITE variables. The Mentor API rejects unauthenticated calls and applies a per-user quota before calling the AI provider.

## 5. How cloud workspace actions work

- **Upload local workspace** writes the currently open browser workspace to the signed-in user's own UID path.
- **Restore cloud workspace** replaces the browser's local workspace with the signed-in user's saved cloud snapshot.
- Both operations are manual and confirmation-gated.
- Signing in does not silently merge two datasets.
- Sign out does not erase local browser data.

The Firestore layout is `users/{uid}/workspace/meta` plus per-record subcollections for lectures, attempts, tests, revisions, notes, sessions, daily tasks, flashcards, custom questions and events.

## 6. Required checks before inviting students

- Verify account creation, sign-in, sign-out and password reset from the Firebase Console.
- Test two different accounts and confirm neither can read the other's records or files.
- Test push, restore, backup and restore after clearing the browser.
- Test access from both production and preview domains.
- Deploy and verify Firestore and Storage rules.
- Test AI Mentor with valid, expired and missing Firebase ID tokens, App Check tokens if enforced, daily quota exhaustion and oversized attachments.
- Configure API rate limiting, billing alerts and usage monitoring.
