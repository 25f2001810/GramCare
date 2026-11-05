# GramCare AI

Offline-first, voice-first PWA for community health workers and PHC doctors. Built with React, Vite, Dexie, and the browser's local storage APIs. The app shell and data work offline after the first install; no remote fonts or images are used.

## Run it

```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

Test offline using the production build: open the preview, then in Chrome DevTools choose **Application > Service Workers > Offline**. The development server does not register the service worker.

## Demo sign-in

Open the **Demo credentials** section on the login page:

| Role | Email | Password |
|---|---|---|
| Doctor | `dr.kumar@demo.gramcare` | `doctor123` |
| Doctor | `dr.mehta@demo.gramcare` | `doctor123` |
| Doctor | `dr.rao@demo.gramcare` | `doctor123` |
| Health worker | `worker@demo.gramcare` | `worker123` |

These are fake demo accounts. Passwords are PBKDF2-hashed before being stored in IndexedDB. A local session expires after 12 hours. The worker consent screen appears once after a health worker signs in.

## Routes

The app uses hash-based routes so navigation works with the installed PWA:

| Route | Access | Purpose |
|---|---|---|
| `#/login` | Signed out | Local demo sign-in |
| `#/visits` | Health worker | Risk-ranked visits |
| `#/record` | Health worker | Record and save a visit |
| `#/referrals` | Health worker | Review referral candidates |
| `#/referrals/:patientId` | Health worker | Share or print a referral |
| `#/doctor` | Doctor | Risk summary and referral inbox |
| `#/doctor/:patientId` | Doctor | Vitals, transcript, referral summary, and review actions |
| `#/settings` | Signed in | Language, text size, reset fake data |

Doctor and health-worker routes are role-protected. Visits, demo accounts, and doctor notes are stored locally; queued visits and reviews are marked synced by the simulated sync service, or sent to `VITE_SYNC_URL` if configured.

## Features

- Risk scoring and patient sorting: `src/lib/scoring.js`, `src/lib/patients.js`
- Transcript extraction and review flags: `src/lib/extract.js`
- Offline database, password hashes, and review history: `src/db.js`, `src/lib/auth.js`
- Speech input and network status: `src/lib/speech.js`
- Visit and review sync: `src/lib/sync.js`
- Demo data: `src/lib/seed.js`
- Doctor dashboard and patient detail: `src/pages/Doctor/`
- Localized UI dictionaries: `src/i18n/en.json`, `src/i18n/ta.json`, `src/i18n/hi.json`

## Known limits

- **Authentication is mock/local only.** Demo account credentials are public and login runs entirely in the browser. The locally stored password hashes and 12-hour session are for a hackathon demo, not production identity or access management.
- **Sync is simulated** until `VITE_SYNC_URL` is configured. The demo marks queued visits and reviews as synced without a backend. Conflict handling is not production-ready.
- **Voice may require internet.** The Web Speech API may send audio to the browser provider. Typing remains available; voice recognition is not guaranteed offline.
- **Extraction is English-first.** Tamil and Hindi are available for the UI and speech-language selection, but local regex extraction is designed for English text and digits.
- Use fake demo data only. Do not enter real patient information or real credentials.

## Security note

This login is a local demo. For production, authentication must move to a backend (hashed passwords, short-lived tokens, HTTPS, role-based access, audit logs) and patient data must be encrypted and handled under India's DPDP Act. Do not store real credentials or patient data in the browser.
