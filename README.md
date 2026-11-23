# ACHIEVER JEE/NEET
**AI Learning & Intelligence — LEARN • PRACTICE • ACHIEVE**

A responsive preparation workspace for JEE Main, JEE Advanced and NEET UG. The interface follows the existing ACHIEVER GATE visual language (navy sidebar, amber active navigation, light workspace, Inter typography, white cards and floating J.A.R.V.I.S. assistant), while using exam-specific curriculum and assessment configuration.

## Run locally
```bash
npm install
npm run dev
```
Create a production build with `npm run build`.

## What works in this starter application
- Student profile and exam selection (JEE / NEET), saved locally in the browser.
- Dashboard, syllabus roadmap, lecture log, AI Focus timer, PYQ attempt tracker, starter question bank, mini mock tests, test history, revision queue, notebook, health habits, analytics, strategy, settings and J.A.R.V.I.S. voice interface.
- Incorrect question attempts can create revision items; test attempts and focus sessions flow into analytics.
- Data persists in browser localStorage under `achiever-jee-neet-v1`. Export/backup should be done before clearing browser data.

## AI Mentor (optional server configuration)
The UI attempts `POST /api/mentor`. Configure `OPENAI_API_KEY`, optional `OPENAI_MODEL` and `OPENAI_BASE_URL` as server-side environment variables in the hosting provider. Do not put provider keys in frontend `VITE_*` variables. Without a key, the app falls back to a local study-coach response and clearly indicates that a live model is not connected.

## Data and exam-pattern notes
- This repository ships with a **starter curriculum and illustrative practice questions**, not a complete or officially verified PYQ database. Do not label these sample questions as official PYQs.
- JEE Main 2027 pattern shown in the app reflects the NTA portal summary checked on 23 November 2026: Paper 1, 75 questions, 3 hours, 300 marks, +4/−1/0.
- NEET UG 2027 portal summary currently shows 200 questions, candidates answer 180, 3 hours 20 minutes, 720 marks, +4/−1/0; NTA indicates the information bulletin is expected in February 2027. Confirm the final bulletin before publishing a full-length pattern.
- JEE Advanced mock templates are intentionally configurable; do not treat the sample mini-test as an official paper structure.
- Official reference pages: https://nta.gov.in/exams/jee/ · https://nta.gov.in/exams/neet/ · https://jeeadv.ac.in/

## Production readiness
This first implementation is a functional client-side workspace with local persistence. Before enrolling real students, connect Firebase Authentication/Firestore/Storage, add authenticated cloud backup, configure and test the AI provider, publish a reviewed official syllabus/question bank with source rights, and run end-to-end/accessibility/security tests. Never store API secrets in the browser.
