# Dementia_x — what changed

Extract over your project folder (it only adds/replaces files in `src/`, plus `.env.example`).
Your own `.env`, `node_modules` and `package-lock.json` are NOT in this zip — keep yours.
No new npm packages are needed.

## Authentication (Week 3)
- `src/app/_layout.tsx` — session guard: family screens need a login; logged-in users skip the login/role screens;
  an expired session sends you back to login.
- `src/lib/api.ts` — one place for backend calls. Sends the session cookie correctly on phone (SecureStore) and web.
  (Old sign-up code used plain `fetch` + hardcoded IP, which never sent the login on a phone.)
- `src/lib/notify.ts` — alerts that also work on web (`Alert.alert` does nothing in a browser, so errors were invisible).
- `family/login`, `family/signup` — validation, clear errors, no hardcoded IP.
- `family/forgot-password`, `family/reset-password` — password recovery.
- `family/join-patient` — join with an invite code later (e.g. if it failed at sign-up).
- `family/create-patient` — fixed response shape, real photo upload (small base64), shows invite code AND patient device code.
- `patient/login` — pair the patient's own device once with a code, then "tap your picture". `patient/home` is locked to paired devices.
- Real logout (Settings).

## Family dashboard (Week 4) — `family/home`
Patient selector, overview, unresolved alerts (resolve button), quick actions (reminder, mood, note, invite),
today's reminders (mark taken), 7-day medication adherence, 7-day mood summary, recent activity,
pull-to-refresh. Explicit states: **no data**, **stale data**, **unresolved alerts**.
`family/settings` — caregiver profile, alert preferences, stale threshold, codes, change password, sample-data buttons.

## Try it (demo flow)
1. Backend running (`npm run dev`), then `npx expo start -c`.
2. Sign up -> create patient -> dashboard shows the **No data** state.
3. Tap "Load sample data" -> alerts, adherence, mood, activity appear.
4. Settings -> "Simulate out-of-date data" -> dashboard shows the **stale** banner.
5. Pair the patient device: Patient -> enter device code from Settings. Opening the patient screen creates a live
   "Opened the app" entry on the dashboard.
