import { scorePatient } from './scoring.js';
import { todayISO } from './util.js';

/** Join patients with their latest visit and a computed risk. Sorted highest risk first. */
export function buildPatientViews(patients = [], visits = [], today = todayISO()) {
  const latestBy = new Map();
  for (const v of visits) {
    const cur = latestBy.get(v.patientId);
    if (!cur || v.date > cur.date || (v.date === cur.date && v.updatedAt > cur.updatedAt)) latestBy.set(v.patientId, v);
  }
  return patients
    .map((p) => {
      const latest = latestBy.get(p.id) || null;
      const risk = scorePatient(
        { weeks: p.weeks, nextVisitDue: p.nextVisitDue, bp: latest?.bp, symptoms: latest?.symptoms, hb: latest?.hb },
        today
      );
      return { ...p, latest, risk };
    })
    .sort((a, b) => b.risk.score - a.risk.score || b.risk.overdueDays - a.risk.overdueDays || a.name.localeCompare(b.name));
}
