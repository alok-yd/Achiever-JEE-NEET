# ACHIEVER JEE/NEET
**AI Learning & Intelligence — LEARN • PRACTICE • ACHIEVE**

A responsive preparation workspace for JEE Main, JEE Advanced and NEET UG. The interface follows the existing ACHIEVER GATE visual language (navy sidebar, amber active navigation, light workspace, Inter typography, white cards and floating J.A.R.V.I.S. assistant), while using exam-specific curriculum and assessment configuration.

## Run locally
```bash
npm install
npm run dev
```
Run unit tests with `npm test`; create a production build with `npm run build`. GitHub Actions runs this check on every push to `main` and stores a downloadable `dist/` artifact for 30 days. `npm run dev` serves the client UI and local fallback; it does not run the Vercel `/api/mentor` serverless function.


## Publish a static preview (GitHub Pages)
1. In the repository, open **Settings → Pages** and set the source to **GitHub Actions**.
2. Open **Actions → Deploy ACHIEVER JEE/NEET preview → Run workflow**.
3. After it succeeds, GitHub shows the public Pages URL on the workflow run.

The Pages build is a static client preview. It supports local browser storage and the local mentor fallback, but it does **not** run `api/mentor.ts`; live model inference and image/PDF analysis need a server deployment (for example, Vercel) with secured environment variables and an authenticated/rate-limited endpoint.

## What works in this starter application
- Student profile and exam selection (JEE / NEET), saved locally in the browser.
- Dashboard, syllabus roadmap, lecture log, AI Focus timer, PYQ attempt tracker, starter question bank, mini mock tests, test history, revision queue, notebook, health habits, analytics, strategy, settings and J.A.R.V.I.S. voice interface.
- Incorrect question attempts can create revision items; test attempts and focus sessions flow into analytics.
- Data persists in browser localStorage under `achiever-jee-neet-v1`. Export/backup should be done before clearing browser data.

## Firebase project setup (optional cloud accounts)

See [`docs/FIREBASE_SETUP.md`](docs/FIREBASE_SETUP.md) before enabling cloud accounts. The repository contains optional Firebase Authentication, App Check, Firestore sync and owner-only Firestore/Storage rules, but it does not contain a Firebase project ID or service-account key. Create a **new, separate JEE/NEET Firebase project**; do not point this app at the existing GATE project's database. Cloud push/restore is user-triggered and replaces the selected user's matching cloud collections or browser snapshot only after confirmation.

## AI Mentor (optional server configuration)
The UI attempts `POST /api/mentor` through the OpenAI Responses API. Configure `OPENAI_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, optional `OPENAI_MODEL`, `OPENAI_BASE_URL`, `AI_MENTOR_DAILY_LIMIT` and `AI_MENTOR_PER_MINUTE_LIMIT` as server-side environment variables in the hosting provider. The API verifies the signed-in Firebase ID token and applies per-user daily and per-minute request caps before calling the model. Optionally configure Firebase App Check on both client and server. The mentor supports image and PDF question attachments (up to 3 files, total 3 MB) when a multimodal model/provider is configured. Do not put provider keys or service-account JSON in frontend `VITE_*` variables. Without a key, the app falls back to a local study-coach response and clearly indicates that a live model is not connected; the offline fallback cannot analyse attachments.

## Data and exam-pattern notes
- This repository ships with a **starter curriculum and illustrative practice questions**, not a complete or officially verified PYQ database. Do not label these sample questions as official PYQs.
- The NTA JEE Main 2027 portal currently lists Paper 1 as 75 compulsory questions (25 each in Physics, Chemistry and Mathematics), 3 hours, 300 marks and +4/−1/0. Official NTA FAQ lists Session 1 dates as 20–24 and 28 January 2027 and Session 2 as 2–7 April 2027. The app countdown defaults to 20 January (the first listed Session 1 date); students should check their own allotted date and session.
- As of 23 November 2026, the official NTA NEET portal links to the NEET UG 2026 information bulletin and syllabus; its current published pages do not confirm NEET UG 2027 date, question count, answerable count, duration, marks, marking scheme or 2027 syllabus. The app therefore keeps all these NEET UG 2027 settings pending instead of copying the 2026 pattern.
- JEE Advanced 2027 is listed for 23 May 2027 on its official website. Mock templates remain configurable; the starter mini-test is not an official paper structure.
- Official reference pages: https://www.nta.gov.in/exams/jee/ · https://nta.gov.in/exams/neet/ · https://jeeadv.ac.in/

## Production readiness
This first implementation is a functional client-side workspace with local persistence. Before public production use, integrate Firebase Authentication/Firestore/Storage with owner-only security rules and UID-scoped cloud sync; protect `/api/mentor` with authentication, quotas and rate limiting before adding a billable API key; configure and test the AI provider; publish a reviewed official syllabus/question bank with appropriate content rights; implement and test webcam-backed presence verification if required; and complete end-to-end, accessibility and security testing. The current localStorage workspace is device/browser-specific and is not suitable for shared or multi-device accounts. Never store API secrets in the browser.
