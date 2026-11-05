# GramCare AI: base frontend

Voice-first, offline-first PWA for community health workers (maternal health demo).
React + Vite + Dexie (IndexedDB) + vite-plugin-pwa. No backend needed to start.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  (also reachable from your phone on the same Wi-Fi)
npm test           # unit tests for extraction and risk scoring
npm run build && npm run preview   # production build; test offline mode here
```

Test offline properly with the **production build** (`preview`), then in Chrome DevTools
go to Application > Service Workers > Offline. The dev server does not register the service worker.

## What already works

| Feature | Where |
|---|---|
| Ranked visit list (HIGH / MEDIUM / LOW with reasons) | `src/components/VisitList.jsx`, `src/lib/scoring.js` |
| Voice or typed entry, then structured fields | `src/components/RecordVisit.jsx`, `src/lib/speech.js`, `src/lib/extract.js` |
| Confirm and edit step with flags (BP not recorded, High BP) | `RecordVisit.jsx`, `reviewFlags()` in `extract.js` |
| Offline storage (IndexedDB) | `src/db.js` |
| Auto-sync when online, "N to sync" badge | `src/lib/sync.js`, `Header.jsx` |
| Referral summary: WhatsApp share, print | `src/components/Referral.jsx`, `src/lib/referral.js` |
| Consent screen, fake demo data, reset button | `Consent.jsx`, `src/lib/seed.js` |

## Demo script (matches the deck)

1. Open the list: Lakshmi is LOW (overdue but otherwise normal).
2. Go offline. Tap **Record visit** on Lakshmi.
3. Tap **Speak** (or type): `Lakshmi, 7 months pregnant, BP 150 by 100, headache since yesterday, taking iron tablets`
4. Tap **Fill the form**, check the values, tick consent, **Save visit**.
5. Lakshmi jumps to the top as HIGH. Tap **Referral**, then share.
6. Go back online: the "to sync" badge clears.

## Risk rules (`src/lib/scoring.js`)

BP >= 140/90 +5 · danger sign +5 · visit overdue > 7 days +3 · 36+ weeks +2 · Hb < 11 +2.
Score >= 8 HIGH, 4 to 7 MEDIUM, below 4 LOW. Edit `DANGER_SIGNS`, `HIGH_AT`, `MEDIUM_AT` to tune.

## Known limits (be upfront about these in the demo)

- **Voice needs internet.** The browser Web Speech API sends audio to a server. Offline, the app
  falls back to typing. On-device speech (e.g. Whisper) is the next step.
- **Regex extraction is English with digits** ("150 by 100", "7 months"). For Tamil or Hindi,
  set `VITE_LLM_ENDPOINT` (see `.env.example`) so a backend LLM does the extraction.
  Never put an LLM API key in frontend code.
- **Sync is simulated** until you set `VITE_SYNC_URL` to a real endpoint. Conflict rule is last-write-wins.
- A per-visit consent tick adds one tap. Remove it from `RecordVisit.jsx` if it hurts adoption in testing,
  but keep the first-run consent screen.
- Fake data only. No real patient information.

## Suggested 8-hour order

1. Hour 1-2: run it, swap seed data/fields for your scope. 2. Hour 3-4: tune extraction and the confirm screen.
3. Hour 5: scoring and follow-up rules. 4. Hour 6-7: referral summary, real `/sync` endpoint (FastAPI + Supabase).
5. Hour 8: test offline, record a backup demo video.

## Structure

```
src/
  App.jsx               screen routing, sync trigger, saving a visit
  db.js                 Dexie schema (patients, visits)
  components/           Consent, Header, VisitList, RecordVisit, Referral
  lib/
    scoring.js          risk rules
    extract.js          transcript to fields (LLM optional, regex fallback)
    speech.js           Web Speech hook + online/offline hook
    sync.js             push unsynced visits
    patients.js         join patient + latest visit + risk, sorted
    referral.js         referral text
    seed.js             fake demo patients
tests/logic.test.js
```
