import { buildReferralText, bpText } from '../lib/referral.js';
import { ACTION_BY_LEVEL } from '../lib/scoring.js';

export default function Referral({ patient }) {
  const text = buildReferralText(patient);
  const l = patient.latest;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(text)}`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Referral: ${patient.name}`, text });
        return;
      } catch {
        /* user cancelled, fall back to WhatsApp link */
      }
    }
    window.open(whatsapp, '_blank', 'noopener');
  };

  return (
    <section className="referral">
      <div className={`banner banner-${patient.risk.level.toLowerCase()}`}>
        {patient.risk.level === 'HIGH' ? 'Urgent: ' : ''}
        {ACTION_BY_LEVEL[patient.risk.level]}
      </div>
      <h2>{patient.name}</h2>
      <p className="meta">
        {patient.age} years · {patient.weeks} weeks pregnant · {patient.village}
      </p>
      <dl className="facts">
        <dt>BP</dt>
        <dd>{bpText(l?.bp)}</dd>
        <dt>Symptoms</dt>
        <dd>{l?.symptoms?.length ? l.symptoms.join(', ') : 'None reported'}</dd>
        <dt>Medicines</dt>
        <dd>{l?.medicines?.length ? l.medicines.join(', ') : 'None reported'}</dd>
        {l?.hb != null && (
          <>
            <dt>Hb</dt>
            <dd>{l.hb}</dd>
          </>
        )}
        <dt>Follow-up</dt>
        <dd>{patient.risk.overdueDays > 0 ? `Overdue ${patient.risk.overdueDays} days` : `Due ${patient.nextVisitDue}`}</dd>
      </dl>
      {patient.risk.reasons.length > 0 && (
        <div className="chips">
          {patient.risk.reasons.map((r) => (
            <span key={r} className="flag">
              {r}
            </span>
          ))}
        </div>
      )}
      <p className="footnote">Assistive summary, not a diagnosis. Confirmed by the health worker.</p>
      <div className="row gap no-print">
        <button className="btn primary" onClick={share}>
          Share on WhatsApp
        </button>
        <button className="btn" onClick={() => window.print()}>
          Print
        </button>
      </div>
    </section>
  );
}
