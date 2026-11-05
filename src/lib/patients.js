import { DOMAINS } from '../config/domains.js';
import { scorePatient } from './scoring.js';
import { todayISO } from './util.js';

const isNewerVisit = (next, current) =>
  !current ||
  next.date > current.date ||
  (next.date === current.date && (next.updatedAt || 0) > (current.updatedAt || 0));

function patientConditions(patient) {
  if (Array.isArray(patient.conditions) && patient.conditions.length) return patient.conditions;
  return [{
    domain: 'pregnancy',
    details: { weeks: patient.weeks },
    nextDue: { date: patient.nextVisitDue || '', label: DOMAINS.pregnancy.nextDueLabel }
  }];
}

/** Join patients with per-domain latest visits, next appointment, and computed priority. */
export function buildPatientViews(patients = [], visits = [], today = todayISO()) {
  const latestByPatient = new Map();
  const latestByPatientDomain = new Map();
  for (const visit of visits) {
    const domain = DOMAINS[visit.domain] ? visit.domain : 'pregnancy';
    const current = latestByPatient.get(visit.patientId);
    if (isNewerVisit(visit, current)) latestByPatient.set(visit.patientId, visit);
    const key = `${visit.patientId}:${domain}`;
    const domainCurrent = latestByPatientDomain.get(key);
    if (isNewerVisit(visit, domainCurrent)) latestByPatientDomain.set(key, visit);
  }

  return patients
    .map((patient) => {
      const conditions = patientConditions(patient);
      const conditionVisits = conditions.map((condition) => {
        const domain = DOMAINS[condition.domain] ? condition.domain : 'pregnancy';
        const latest = latestByPatientDomain.get(`${patient.id}:${domain}`) || null;
        return latest ? { ...latest, domain } : null;
      }).filter(Boolean);
      const latest = latestByPatient.get(patient.id) || null;
      const nextDue = conditions
        .map((condition) => ({
          ...(condition.nextDue || {}),
          label: condition.nextDue?.label || DOMAINS[condition.domain]?.nextDueLabel || 'Next visit'
        }))
        .filter((due) => due.date)
        .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
      const risk = scorePatient(patient, conditionVisits, today);
      const pregnancy = conditions.find((condition) => condition.domain === 'pregnancy');
      const weeks = patient.weeks ?? pregnancy?.details?.weeks;
      const nextVisitDue = patient.nextVisitDue || pregnancy?.nextDue?.date || '';
      return {
        ...patient,
        ...(weeks != null ? { weeks } : {}),
        nextVisitDue,
        conditions,
        domains: patient.domains || [...new Set(conditions.map((condition) => condition.domain))],
        nextDue,
        latest,
        risk
      };
    })
    .sort((a, b) =>
      b.risk.score - a.risk.score ||
      b.risk.overdueDays - a.risk.overdueDays ||
      a.name.localeCompare(b.name)
    );
}
