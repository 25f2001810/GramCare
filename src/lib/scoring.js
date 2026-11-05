// Rule-based risk scoring. No ML, easy to explain to a health officer.
// Same rules as slide 5 of the submission deck.
import { daysBetween, todayISO } from './util.js';

export const DANGER_SIGNS = [
  'headache',
  'bleeding',
  'swelling',
  'blurred vision',
  'reduced baby movement',
  'convulsions'
];

export const HIGH_AT = 8; // score >= 8  -> HIGH
export const MEDIUM_AT = 4; // score 4-7   -> MEDIUM

export const daysOverdue = (nextVisitDue, today = todayISO()) =>
  nextVisitDue ? Math.max(0, daysBetween(nextVisitDue, today)) : 0;

/**
 * @param {{weeks?:number, nextVisitDue?:string, bp?:{sys:number,dia:number}|null, symptoms?:string[], hb?:number|null}} input
 * @returns {{score:number, level:'HIGH'|'MEDIUM'|'LOW', reasons:string[], overdueDays:number}}
 */
export function scorePatient(input, today = todayISO()) {
  const { weeks, nextVisitDue, bp, symptoms = [], hb } = input;
  let score = 0;
  const reasons = [];

  if (bp && (bp.sys >= 140 || bp.dia >= 90)) {
    score += 5;
    reasons.push(`BP high ${bp.sys}/${bp.dia}`);
  }
  const danger = symptoms.filter((s) => DANGER_SIGNS.includes(String(s).toLowerCase()));
  if (danger.length) {
    score += 5;
    reasons.push(`Danger sign: ${danger.join(', ')}`);
  }
  const overdueDays = daysOverdue(nextVisitDue, today);
  if (overdueDays > 7) {
    score += 3;
    reasons.push(`Visit overdue ${overdueDays} days`);
  }
  if (weeks >= 36) {
    score += 2;
    reasons.push(`${weeks} weeks pregnant`);
  }
  if (hb != null && hb < 11) {
    score += 2;
    reasons.push(`Low Hb ${hb}`);
  }

  const level = score >= HIGH_AT ? 'HIGH' : score >= MEDIUM_AT ? 'MEDIUM' : 'LOW';
  return { score, level, reasons, overdueDays };
}

export const ACTION_BY_LEVEL = {
  HIGH: 'Refer to PHC today',
  MEDIUM: 'Visit this week and recheck',
  LOW: 'Routine follow-up'
};
