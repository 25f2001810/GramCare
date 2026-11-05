export default function VisitList({ patients, onRecord, onReferral, onReset }) {
  return (
    <>
      <ul className="cards">
        {patients.map((p) => (
          <li key={p.id} className={`card risk-${p.risk.level.toLowerCase()}`}>
            <div className="row between">
              <h2>{p.name}</h2>
              <span className={`badge badge-${p.risk.level.toLowerCase()}`}>{p.risk.level}</span>
            </div>
            <p className="meta">
              {p.weeks} weeks · {p.village}
              {p.latest?.bp ? ` · BP ${p.latest.bp.sys}/${p.latest.bp.dia}` : ''}
            </p>
            <p className="reason">
              {p.risk.reasons.length ? p.risk.reasons.join(' · ') : 'On track'}
            </p>
            <div className="row gap">
              <button className="btn primary" onClick={() => onRecord(p.id)}>
                Record visit
              </button>
              {p.risk.level !== 'LOW' && (
                <button className="btn" onClick={() => onReferral(p.id)}>
                  Referral
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
