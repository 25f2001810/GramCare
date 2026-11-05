import { useEffect, useRef, useState } from 'react';
import { AudioLines, Mic, Sparkles, Square } from 'lucide-react';
import { useSpeech } from '../lib/speech.js';
import { extractWithFallback, reviewFlags } from '../lib/extract.js';
import { scorePatient } from '../lib/scoring.js';
import { splitList } from '../lib/util.js';
import { useLanguage } from '../i18n/index.js';

const LANGS = [
  ['en-IN', 'English'],
  ['ta-IN', 'Tamil'],
  ['hi-IN', 'Hindi']
];
const LLM_ENDPOINT = import.meta.env.VITE_LLM_ENDPOINT;
const union = (a, b) => [...new Set([...a, ...b])];

export default function RecordVisit({ patients, initialId, onSave }) {
  const { t } = useLanguage();
  const [patientId, setPatientId] = useState(initialId || '');
  const [lang, setLang] = useState('en-IN');
  const [transcript, setTranscript] = useState('');
  const [form, setForm] = useState({ sys: '', dia: '', weight: '', hb: '', weeks: '', symptoms: '', medicines: '' });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState('');
  const speech = useSpeech(lang);
  const wasListening = useRef(false);

  const patient = patients.find((p) => p.id === patientId);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Read the form as typed values
  const bp = form.sys && form.dia ? { sys: Number(form.sys), dia: Number(form.dia) } : null;
  const symptoms = splitList(form.symptoms);
  const medicines = splitList(form.medicines);
  const weight = form.weight === '' ? null : Number(form.weight);
  const hb = form.hb === '' ? null : Number(form.hb);
  const weeks = form.weeks === '' ? patient?.weeks : Number(form.weeks);

  const flags = reviewFlags({ bp, weight });
  const risk = patient ? scorePatient({ weeks, nextVisitDue: patient.nextVisitDue, bp, symptoms, hb }) : null;

  async function fillFrom(text) {
    if (!text.trim()) return;
    setBusy(true);
    const x = await extractWithFallback(text, patients, LLM_ENDPOINT, lang);
    setSource(x.source);
    setPatientId((id) => id || x.patientId || '');
    setForm((f) => ({
      ...f,
      sys: x.bp ? String(x.bp.sys) : f.sys,
      dia: x.bp ? String(x.bp.dia) : f.dia,
      weight: x.weight != null ? String(x.weight) : f.weight,
      hb: x.hb != null ? String(x.hb) : f.hb,
      weeks: x.weeks != null ? String(x.weeks) : f.weeks,
      symptoms: union(splitList(f.symptoms), x.symptoms || []).join(', '),
      medicines: union(splitList(f.medicines), x.medicines || []).join(', ')
    }));
    setBusy(false);
  }

  // When the microphone stops, fill the form automatically
  useEffect(() => {
    if (wasListening.current && !speech.listening) fillFrom(transcript);
    wasListening.current = speech.listening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.listening]);

  const toggleMic = () => {
    if (speech.listening) speech.stop();
    else speech.start((text) => setTranscript((t) => (t ? `${t} ` : '') + text.trim()));
  };

  const canSave = Boolean(patient) && consent && !busy;
  const save = () =>
    onSave({ patientId, weeks, bp, symptoms, medicines, weight, hb, transcript, risk });

  return (
    <section className="record">
      <label className="field">
        <span>Patient</span>
        <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">Choose a patient</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.village}
            </option>
          ))}
        </select>
      </label>

      {speech.supported && (
        <div className="mic-hero">
          <button
            type="button"
            className={`mic-button ${speech.listening ? 'recording' : ''}`}
            onClick={toggleMic}
            aria-label={speech.listening ? t('button.stopRecording') : t('button.speak')}
            aria-pressed={speech.listening}
          >
            {speech.listening ? <Square size={30} fill="currentColor" aria-hidden="true" /> : <Mic size={34} aria-hidden="true" />}
            <span>{speech.listening ? t('button.stopRecording') : t('button.speak')}</span>
          </button>
          <p className="recording-state" aria-live="polite">
            {speech.listening ? 'Listening. Speak clearly, then tap stop.' : 'Record the visit in your own words.'}
          </p>
          <div className={`level-indicator ${speech.listening ? 'active' : ''}`} aria-hidden="true">
            <AudioLines size={22} />
            <span /><span /><span /><span />
          </div>
        </div>
      )}

      <div className="field transcript-field">
        <div className="row between">
          <label htmlFor="transcript">What you saw and heard</label>
          <select aria-label="Speaking language" className="lang" value={lang} onChange={(e) => setLang(e.target.value)}>
            {LANGS.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <textarea
          id="transcript"
          rows={4}
          value={transcript + (speech.interim ? ` ${speech.interim}` : '')}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Example: BP 150 by 100, headache since yesterday, taking iron tablets"
        />
        {speech.error && <p className="error" role="alert">{speech.error}</p>}
        {!speech.supported && <p className="hint">Voice is not available in this browser. Type the visit instead.</p>}
        <div className="row gap">
          <button type="button" className="btn secondary" onClick={() => fillFrom(transcript)} disabled={!transcript.trim() || busy} aria-busy={busy}>
            <Sparkles size={19} aria-hidden="true" /> {busy ? 'Reading…' : t('button.fillForm')}
          </button>
        </div>
        {source && (
          <p className="hint">
            Filled using {source === 'llm' ? 'the AI service' : 'on-device rules'}. Check every value before saving.
          </p>
        )}
      </div>

      <fieldset className="form">
        <legend>Confirm what was captured</legend>
        <div className="grid2">
          <label className="field">
            <span>BP top</span>
            <input inputMode="numeric" value={form.sys} onChange={set('sys')} placeholder="150" />
          </label>
          <label className="field">
            <span>BP bottom</span>
            <input inputMode="numeric" value={form.dia} onChange={set('dia')} placeholder="100" />
          </label>
          <label className="field">
            <span>Weight (kg)</span>
            <input inputMode="decimal" value={form.weight} onChange={set('weight')} />
          </label>
          <label className="field">
            <span>Hb</span>
            <input inputMode="decimal" value={form.hb} onChange={set('hb')} />
          </label>
          <label className="field">
            <span>Weeks pregnant</span>
            <input inputMode="numeric" value={form.weeks} onChange={set('weeks')} placeholder={patient ? String(patient.weeks) : ''} />
          </label>
        </div>
        <label className="field">
          <span>Symptoms (comma separated)</span>
          <input value={form.symptoms} onChange={set('symptoms')} placeholder="headache, swelling" />
        </label>
        <label className="field">
          <span>Medicines (comma separated)</span>
          <input value={form.medicines} onChange={set('medicines')} placeholder="iron tablets" />
        </label>
        {flags.length > 0 && (
          <div className="chips">
            {flags.map((f) => (
              <span key={f} className={f === 'High BP' ? 'flag flag-red' : 'flag flag-amber'}>
                {f}
              </span>
            ))}
          </div>
        )}
      </fieldset>

      {risk && (
        <div className={`banner banner-${risk.level.toLowerCase()}`} aria-live="polite">
          <strong>{risk.level}</strong>
          {risk.reasons.length ? ` · ${risk.reasons.join(' · ')}` : ' · On track'}
        </div>
      )}

      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>The patient agreed to this being recorded.</span>
      </label>

      <div className="save-visit-bar">
        <button className="btn primary block" onClick={save} disabled={!canSave}>
          {t('button.saveVisit')}
        </button>
      </div>
      {!patient && <p className="hint">Choose a patient to save.</p>}
    </section>
  );
}
