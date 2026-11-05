import { ACTION_BY_LEVEL } from './scoring.js';

export const bpText = (bp) => (bp ? `${bp.sys}/${bp.dia}` : 'not recorded');
export const buildWhatsAppUrl = (text) => `https://wa.me/?text=${encodeURIComponent(String(text))}`;

/** Plain-text summary used for WhatsApp share and copy. Assistive, never a diagnosis. */
export function buildReferralText(p) {
  const l = p.latest;
  const lines = [
    `GramCare referral: ${p.risk.level} priority`,
    `Patient: ${p.name}, ${p.age} yrs, ${p.village}`,
    `Pregnancy: ${p.weeks} weeks`,
    `BP: ${bpText(l?.bp)}`,
    `Symptoms: ${l?.symptoms?.length ? l.symptoms.join(', ') : 'none reported'}`,
    `Medicines: ${l?.medicines?.length ? l.medicines.join(', ') : 'none reported'}`
  ];
  if (l?.hb != null) lines.push(`Hb: ${l.hb}`);
  if (p.risk.reasons.length) lines.push(`Flags: ${p.risk.reasons.join('; ')}`);
  lines.push(`Suggested action: ${ACTION_BY_LEVEL[p.risk.level]}`);
  lines.push('Assistive summary, not a diagnosis. Confirmed by the health worker.');
  return lines.join('\n');
}
