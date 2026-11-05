Project: GramCare AI, an offline-first, voice-first, mobile-first PWA (React + Vite + Dexie)
for long-term-care patient tracking (pregnancy, cancer, diabetes and more).

Rules for every change:
- Works fully OFFLINE. No CDN fonts/scripts/images, no third-party network calls.
  System fonts only (keep Tamil/Hindi fallbacks).
- Mobile-first at 360px. Touch targets >= 48px, body text >= 16px, AA contrast,
  visible focus, respect prefers-reduced-motion. Never rely on colour alone for risk.
- Fake demo data only. No real patient data or real credentials in source.
- Keep `npm test` and `npm run build` passing. Add node:test unit tests in tests/ for
  any new pure logic.
- Assistive, not diagnostic: never output a diagnosis; clinical rules live in
  src/config/domains.js and are marked "needs clinical review".
- Only add dependencies when a task says so (allowed: react-router-dom, lucide-react).
- Small focused commits. After each task list files changed and anything unfinished.