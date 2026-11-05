// Rule-based care-priority scoring. The configured rules need clinical review.
import { DOMAINS, RISK_LEVELS } from '../config/domains.js';
import { daysBetween, todayISO } from './util.js';

export const DANGER_SIGNS = DOMAINS.pregnancy.dangerSigns;
export const HIGH_AT = RISK_LEVELS.HIGH_AT;
export const MEDIUM_AT = RISK_LEVELS.MEDIUM_AT;

const LEVEL_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };

export const daysOverdue = (nextVisitDue, today = todayISO()) =>
  nextVisitDue ? Math.max(0, daysBetween(nextVisitDue, today)) : 0;

const riskLevel = (score) =>
  score >= RISK_LEVELS.HIGH_AT ? 'HIGH' : score >= RISK_LEVELS.MEDIUM_AT ? 'MEDIUM' : 'LOW';

function conditionList(patient) {
  if (Array.isArray(patient.conditions) && patient.conditions.length) return patient.conditions;
  return [{
    domain: 'pregnancy',
    details: { weeks: patient.weeks },
    nextDue: { date: patient.nextVisitDue || '', label: DOMAINS.pregnancy.nextDueLabel }
  }];
}

function latestForDomain(latestVisits, domain) {
  const visits = Array.isArray(latestVisits) ? latestVisits : latestVisits ? [latestVisits] : [];
  const matched = visits.filter((visit) => (visit.domain || 'pregnancy') === domain);
  return matched.sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || '')) || (b.updatedAt || 0) - (a.updatedAt || 0)
  )[0] || null;
}

function bloodPressure(visit) {
  return visit?.vitals?.bp ?? visit?.bp ?? null;
}

function symptomsOf(visit) {
  return Array.isArray(visit?.symptoms) ? visit.symptoms.map((value) => String(value).toLowerCase()) : [];
}

function dueDate(condition, patient, domain) {
  return condition.nextDue?.date ||
    condition.details?.nextChemoDate ||
    condition.details?.nextCheckupDate ||
    (domain === 'pregnancy' ? patient.nextVisitDue : '') ||
    '';
}

function sugarReading(visit, condition) {
  const recorded = visit?.vitals?.sugar ?? visit?.sugar;
  if (recorded && typeof recorded === 'object') {
    if (recorded.fasting != null) return { value: Number(recorded.fasting), type: 'fasting' };
    if (recorded.random != null) return { value: Number(recorded.random), type: 'random' };
    return { value: Number(recorded.value), type: recorded.type || 'fasting' };
  }
  if (recorded != null && Number.isFinite(Number(recorded))) {
    return {
      value: Number(recorded),
      type: visit?.sugarType || visit?.vitals?.sugarType || 'fasting'
    };
  }
  if (condition.details?.lastFastingSugar != null) {
    return { value: Number(condition.details.lastFastingSugar), type: 'fasting' };
  }
  return null;
}

function scoreCondition(patient, condition, visit, today) {
  const domainId = DOMAINS[condition.domain] ? condition.domain : 'pregnancy';
  const domain = DOMAINS[domainId];
  const rules = domain.rules;
  const details = condition.details || {};
  const symptoms = symptomsOf(visit);
  const reasons = [];
  let score = 0;

  if (rules.bloodPressure) {
    const bp = bloodPressure(visit);
    if (bp && (bp.sys >= rules.bloodPressure.systolicAtLeast || bp.dia >= rules.bloodPressure.diastolicAtLeast)) {
      score += rules.bloodPressure.points;
      reasons.push(`BP high ${bp.sys}/${bp.dia}`);
    }
  }

  const dangerSigns = symptoms.filter((symptom) => domain.dangerSigns.includes(symptom));
  if (dangerSigns.length && rules.dangerSigns) {
    score += rules.dangerSigns.points;
    reasons.push(`Danger sign: ${dangerSigns.join(', ')}`);
  }

  const overdueDays = daysOverdue(dueDate(condition, patient, domainId), today);
  if (rules.overdue && overdueDays > rules.overdue.graceDays) {
    score += rules.overdue.points;
    reasons.push(domainId === 'pregnancy'
      ? `Visit overdue ${overdueDays} days`
      : `${domain.label} appointment overdue ${overdueDays} days`);
  }

  if (rules.weeksAtLeast && details.weeks >= rules.weeksAtLeast.value) {
    score += rules.weeksAtLeast.points;
    reasons.push(`${details.weeks} weeks pregnant`);
  }

  const hb = visit?.vitals?.hb ?? visit?.hb;
  if (rules.hbBelow && hb != null && hb < rules.hbBelow.value) {
    score += rules.hbBelow.points;
    reasons.push(`Low Hb ${hb}`);
  }

  const missedCycle = visit?.missedCycle === true ||
    details.missedCycle === true ||
    symptoms.includes('missed cycle');
  if (rules.missedCycle && missedCycle) {
    score += rules.missedCycle.points;
    reasons.push('Missed treatment cycle');
  }

  const sugar = sugarReading(visit, condition);
  if (rules.fastingSugarAtLeast && sugar?.type === 'fasting' && sugar.value >= rules.fastingSugarAtLeast.value) {
    score += rules.fastingSugarAtLeast.points;
    reasons.push(`Fasting sugar ${sugar.value}`);
  }
  if (rules.randomSugarAtLeast && sugar?.type === 'random' && sugar.value >= rules.randomSugarAtLeast.value) {
    score += rules.randomSugarAtLeast.points;
    reasons.push(`Random sugar ${sugar.value}`);
  }
  if (rules.sugarBelow && sugar && sugar.value < rules.sugarBelow.value) {
    score += rules.sugarBelow.points;
    reasons.push(`Low sugar ${sugar.value}`);
  }

  const hba1c = visit?.vitals?.hba1c ?? visit?.hba1c ?? details.lastHbA1c;
  if (rules.hbA1cAbove && hba1c != null && hba1c > rules.hbA1cAbove.value) {
    score += rules.hbA1cAbove.points;
    reasons.push(`HbA1c ${hba1c}`);
  }

  return {
    domain: domainId,
    domainLabel: domain.label,
    score,
    level: riskLevel(score),
    reasons,
    overdueDays
  };
}

/**
 * Score a patient across all conditions. The legacy (input, today) pregnancy signature
 * remains supported so existing visit and referral flows keep their established results.
 */
export function scorePatient(patient, latestVisitOrToday, todayArgument) {
  const legacy = typeof latestVisitOrToday === 'string' || !Array.isArray(patient.conditions);
  const latestVisits = typeof latestVisitOrToday === 'string'
    ? patient
    : latestVisitOrToday ?? (legacy ? patient : null);
  const today = typeof latestVisitOrToday === 'string'
    ? latestVisitOrToday
    : todayArgument || todayISO();
  const conditionResults = conditionList(patient).map((condition) => {
    const domain = DOMAINS[condition.domain] ? condition.domain : 'pregnancy';
    const visit = latestForDomain(latestVisits, domain);
    return scoreCondition(patient, { ...condition, domain }, visit, today);
  });
  const highest = conditionResults.reduce((best, current) => {
    if (!best || LEVEL_RANK[current.level] > LEVEL_RANK[best.level]) return current;
    if (current.level === best.level && current.score > best.score) return current;
    return best;
  }, null);

  return {
    ...highest,
    conditionResults
  };
}

export const ACTION_BY_LEVEL = {
  HIGH: 'Refer to PHC today',
  MEDIUM: 'Visit this week and recheck',
  LOW: 'Routine follow-up'
};
