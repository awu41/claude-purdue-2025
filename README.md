# Purdue Study Match

React + Vite frontend wired to Firebase Auth, Firestore, and Storage for syncing Purdue class schedules, CSV uploads, and matchmaking. Tailwind, HeadlessUI Tabs, PapaParse, and mocked Purdue GENAI / Google Maps integrations round out the frontend stack for Vercel-ready deploys.

## Features

- **Firebase Auth** – register/sign in with Purdue email + password; username stored for display.
- **Firestore profiles** – per-user document houses schedule JSON, CSV metadata/URL, and timestamps.
- **Firebase Storage** – raw CSV file is uploaded alongside parsed courses for traceability.
- **CSV parsing guardrails** – supports MyPurdue “Events” exports, dedupes by course/instructor, highlights row-level failures.
- **Client-only matchmaking** – compares schedules from all users to suggest classmates; “Friend” action simulates connections and triggers study-space suggestions (mocked unless API keys supplied).

## Getting Started

1. **Prereqs**
   - Node.js 20.10 (works) or >=20.19 for the latest Vite.
   - npm 10.x.

2. **Install deps**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Duplicate `.env.example` → `.env.local` (or `.env`) and drop in your project credentials:
     ```
     VITE_FIREBASE_API_KEY=...
     VITE_FIREBASE_AUTH_DOMAIN=...
     VITE_FIREBASE_PROJECT_ID=...
     VITE_FIREBASE_STORAGE_BUCKET=...
     VITE_FIREBASE_MESSAGING_SENDER_ID=...
     VITE_FIREBASE_APP_ID=...
     ```
   - Optional: add `VITE_GENAI_API_KEY` / `VITE_GOOGLE_MAPS_API_KEY` to enable live Purdue GENAI + Google Maps distance calls (otherwise mocked).
   - Ensure Firestore rules allow read/write for authenticated users (default test rules work during development).

4. **Run**
   ```bash
   npm run dev
   ```
   Vite opens at http://localhost:5173. Build for deploy with `npm run build`.

## App Flow

1. **Register & Upload Tab**
   - Provide Purdue username/email/password → Firebase Auth + Firestore profile.
   - Upload CSV (e.g., MyPurdue “Events” export) → PapaParse handles normalization, duplicates filtered so only instructor-led sections remain.
   - Courses + raw CSV upload to Firestore/Storage; UI shows parsing status and last-upload metadata.

2. **Matchmaking & Study Spaces Tab**
   - Pulls every Firestore user’s schedule to compute overlapping classes.
   - “Friend + fetch study spaces” kicks off mocked Purdue GENAI + Google Maps flow (real APIs when keys provided).

3. **Local-only state**
   - Friendship graph and Google Maps origin text still live in `localStorage` for demo purposes. Clear browser storage to reset.

## Deployment Notes

- Vercel: add the same `VITE_*` env vars under Project Settings → Environment Variables. The Firebase web SDK runs client-side; no extra server needed.
- Firebase Storage paths: CSVs land under `schedules/{uid}/{timestamp}-{filename}`. Firestore `users/{uid}` documents include `courses`, `csvFileName`, `csvUrl`, and timestamps for auditing.
- Security: tighten Firestore/Storage rules before production (e.g., restrict reads to authenticated users, ensure users only write their own documents).
