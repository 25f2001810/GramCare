import { AlertCircle, CalendarPlus, CheckCircle2, FileText } from 'lucide-react';

export default function VisitList({ patients, onRecord, onReferral, onReset }) {
  if (!patients.length) {
    return (
      <section className="empty-state">
        <CheckCircle2 size={36} aria-hidden="true" />
        <p><strong>No urgent referrals. Nice work.</strong></p>
        <p>Keep recording visits to keep this list up to date.</p>
      </section>
    );
  }
  return (
    <>
      <ul className="cards">
        {patients.map((p) => (
          <li key={p.id} className={`card risk-${p.risk.level.toLowerCase()}`}>
            <div className="row between">
              <div className="visit-card-title">
                <span className={`visit-status-icon status-${p.risk.level.toLowerCase()}`}>
                  {p.risk.level === 'HIGH' ? <AlertCircle size={22} aria-hidden="true" /> : p.risk.level === 'MEDIUM' ? <CalendarPlus size={22} aria-hidden="true" /> : <CheckCircle2 size={22} aria-hidden="true" />}
                </span>
                <h2>{p.name}</h2>
              </div>
              <span className={`badge badge-${p.risk.level.toLowerCase()}`}>{p.risk.level}</span>
            </div>
            <p className="meta">{p.weeks} weeks · {p.village}</p>
            <p className="reason">
              {p.risk.reasons.length ? p.risk.reasons.join(' · ') : 'On track'}
            </p>
            <p className="visit-bp">Last BP: {p.latest?.bp ? `${p.latest.bp.sys}/${p.latest.bp.dia}` : 'Not recorded'}</p>
            <div className="row gap visit-actions">
              <button className="btn primary" onClick={() => onRecord(p.id)} aria-label={`Record visit for ${p.name}`}>
                <CalendarPlus size={19} aria-hidden="true" /> Record visit
              </button>
              {p.risk.level !== 'LOW' && (
                <button className="btn secondary" onClick={() => onReferral(p.id)} aria-label={`View referral for ${p.name}`}>
                  <FileText size={19} aria-hidden="true" /> Referral
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="footnote no-print">
        Demo data is fake.{' '}
        <button className="link-btn" onClick={onReset}>
          Reset demo data
        </button>
      </p>
    </>
  );
}
