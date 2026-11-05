// Turns a transcript into structured fields.
// 1) Optional LLM endpoint (VITE_LLM_ENDPOINT) 2) regex fallback that works offline.
// The regex path understands English with digits. For Tamil/Hindi, use the LLM endpoint.
import { DOMAINS } from '../config/domains.js';

const SYMPTOM_PATTERNS = [
  ['headache', /head ?ache|head pain/i],
  ['bleeding', /bleeding|spotting/i],
  ['swelling', /swelling|swollen|oedema|edema/i],
  ['blurred vision', /blur(?:red|ry)? vision|vision (?:is )?blur/i],
  ['reduced baby movement', /(?:baby|foetal|fetal)[^.,]{0,20}(?:not moving|less|reduced|no movement)|reduced (?:baby )?movement/i],
  ['convulsions', /convuls|seizure|\bfits?\b/i],
  ['fever', /fever/i],
  ['vomiting', /vomit/i],
  ['dizziness', /dizz/i],
  ['abdominal pain', /(?:stomach|abdominal|belly) pain/i]
];

const MEDICINE_PATTERNS = [
  ['iron tablets', /\biron\b|\bifa\b/i],
  ['calcium', /calcium/i],
  ['folic acid', /folic/i],
  ['paracetamol', /paracetamol/i]
];

const num = (s) => (s == null ? null : Number(s));

export function extractFromTranscript(text = '', patients = []) {
  const t = text.replace(/\s+/g, ' ').trim();
  const out = { patientId: null, weeks: null, bp: null, symptoms: [], medicines: [], weight: null, hb: null };

  // Patient: match a known first name in the sentence
  const hit = patients.find((p) => new RegExp(`\\b${p.name.split(' ')[0]}\\b`, 'i').test(t));
  if (hit) out.patientId = hit.id;

  // BP: "150/100", "150 by 100", "150 over 100"
  const bp = t.match(/\b(\d{2,3})\s*(?:\/|by|over)\s*(\d{2,3})\b/i);
  if (bp) {
    const sys = num(bp[1]);
    const dia = num(bp[2]);
    if (sys >= 70 && sys <= 260 && dia >= 40 && dia <= 160) out.bp = { sys, dia };
  }

  // Pregnancy: weeks win over months
  const wk = t.match(/\b(\d{1,2})\s*weeks?\b/i);
  const mo = t.match(/\b(\d{1,2})\s*months?\b/i);
  if (wk) out.weeks = num(wk[1]);
  else if (mo) out.weeks = Math.round(num(mo[1]) * 4.345);

  const kg = t.match(/\b(\d{2,3}(?:\.\d)?)\s*(?:kg|kgs|kilos?)\b/i);
  if (kg) out.weight = num(kg[1]);

  const hb = t.match(/\b(?:hb|haemoglobin|hemoglobin)\s*(?:is|was|of)?\s*(\d{1,2}(?:\.\d)?)/i);
  if (hb) out.hb = num(hb[1]);

  out.symptoms = SYMPTOM_PATTERNS.filter(([, re]) => re.test(t)).map(([name]) => name);
  out.medicines = MEDICINE_PATTERNS.filter(([, re]) => re.test(t)).map(([name]) => name);
  return out;
}

/** Fields the worker should double-check before saving. */
export function reviewFlags(f) {
  const flags = [];
  if (!f.bp) flags.push('BP not recorded');
  else {
    const thresholds = DOMAINS.pregnancy.rules.bloodPressure;
    if (f.bp.sys >= thresholds.systolicAtLeast || f.bp.dia >= thresholds.diastolicAtLeast) flags.push('High BP');
  }
  if (f.weight == null) flags.push('Weight not recorded');
  return flags;
}

/** Try the LLM endpoint first, fall back to regex on any failure (offline, timeout, bad JSON). */
export async function extractWithFallback(text, patients, endpoint, lang = 'en-IN') {
  if (endpoint && globalThis.navigator?.onLine !== false) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, lang }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const base = extractFromTranscript(text, patients); // keeps patient match
      return { ...base, ...data, source: 'llm' };
    } catch {
      /* fall through to regex */
    }
  }
  return { ...extractFromTranscript(text, patients), source: 'regex' };
}
