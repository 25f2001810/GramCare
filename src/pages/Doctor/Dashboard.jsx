import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, CloudUpload, FileText, Search, Users } from 'lucide-react';
import { todayISO } from '../../lib/util.js';

const FILTERS = ['All', 'High', 'Medium', 'Low', 'Needs review'];

function lastVisitText(date) {
  if (!date) return 'No visit recorded';
  const days = Math.max(0, Math.floor((Date.now() - new Date(`${date}T00:00:00`).getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function SkeletonDashboard() {
  return (
    <div className="doctor-skeleton" aria-label="Loading patient dashboard">
      <div className="skeleton-summary">{[1, 2, 3, 4].map((item) => <div className="skeleton" key={item} />)}</div>
      <div className="skeleton skeleton-list" />
      <div className="skeleton skeleton-list" />
    </div>
  );
}

export default function DoctorDashboard() {
  const { patients, visits, reviews, pending } = useOutletContext();
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const latestReviewByPatient = useMemo(() => {
    const latest = new Map();
    for (const review of reviews || []) {
      const current = latest.get(review.patientId);
      if (!current || review.createdAt > current.createdAt) latest.set(review.patientId, review);
    }
    return latest;
  }, [reviews]);
  if (!patients || !visits || !reviews) return <SkeletonDashboard />;
  const counts = {
    HIGH: patients.filter((patient) => patient.risk.level === 'HIGH').length,
    MEDIUM: patients.filter((patient) => patient.risk.level === 'MEDIUM').length,
    LOW: patients.filter((patient) => patient.risk.level === 'LOW').length
  };
  const todaysReferrals = patients.filter((patient) =>
    patient.risk.level !== 'LOW' && patient.latest?.date === todayISO()
  ).length;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredPatients = patients.filter((patient) => {
    const matchesText = !normalizedQuery || `${patient.name} ${patient.village}`.toLocaleLowerCase().includes(normalizedQuery);
    const reviewed = latestReviewByPatient.get(patient.id)?.status === 'reviewed';
    const matchesFilter = (filter === 'All' && patient.risk.level !== 'LOW') ||
      (filter === 'Needs review' ? patient.risk.level !== 'LOW' && !reviewed : patient.risk.level === filter.toUpperCase());
    return matchesText && matchesFilter;
  });

  const emptyText = filter === 'All' || filter === 'High' || filter === 'Medium' || filter === 'Needs review'
    ? 'No urgent referrals. Nice work.'
    : 'No low-risk patients match this search.';

  return (
    <div className="doctor-dashboard">
      <section className="summary-strip" aria-label="Patient summary">
        <article className="summary-card summary-high"><AlertCircle aria-hidden="true" /><span>HIGH</span><strong>{counts.HIGH}</strong><small>patients</small></article>
        <article className="summary-card summary-medium"><Clock3 aria-hidden="true" /><span>MEDIUM</span><strong>{counts.MEDIUM}</strong><small>patients</small></article>
        <article className="summary-card summary-low"><CheckCircle2 aria-hidden="true" /><span>LOW</span><strong>{counts.LOW}</strong><small>patients</small></article>
        <article className="summary-card"><FileText aria-hidden="true" /><span>Referrals today</span><strong>{todaysReferrals}</strong><small>patients</small></article>
        <article className="summary-card"><CloudUpload aria-hidden="true" /><span>Unsynced</span><strong>{pending || 0}</strong><small>items waiting</small></article>
      </section>

      <section className="inbox" aria-labelledby="inbox-title">
        <div className="inbox-heading">
          <div>
            <p className="eyebrow"><Users size={18} aria-hidden="true" /> PATIENT INBOX</p>
            <h2 id="inbox-title">Patients to review</h2>
          </div>
          <span className="inbox-count">{filteredPatients.length} shown</span>
        </div>
        <label className="search-field" htmlFor="patient-search">
          <Search size={20} aria-hidden="true" />
          <span className="visually-hidden">Search by patient or village</span>
          <input id="patient-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or village" />
        </label>
        <div className="filter-chips" role="group" aria-label="Filter patients by risk">
          {FILTERS.map((item) => (
            <button type="button" className={`filter-chip ${filter === item ? 'selected' : ''}`} aria-pressed={filter === item} key={item} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>

        {filteredPatients.length ? (
          <ul className="doctor-patient-list">
            {filteredPatients.map((patient) => {
              const reviewed = latestReviewByPatient.get(patient.id)?.status === 'reviewed';
              const riskClass = patient.risk.level.toLowerCase();
              return (
                <li key={patient.id} className={`doctor-patient-card risk-${riskClass}`}>
                  <Link className="patient-card-link" to={`/doctor/${patient.id}`}>
                    <span className={`patient-status-icon status-${riskClass}`}>
                      {patient.risk.level === 'HIGH' ? <AlertCircle size={22} /> : patient.risk.level === 'MEDIUM' ? <Clock3 size={22} /> : <CheckCircle2 size={22} />}
                    </span>
                    <span className="patient-card-main">
                      <span className="patient-title-row">
                        <strong>{patient.name}</strong>
                        <span className={`badge badge-${riskClass}`}>{patient.risk.level}</span>
                      </span>
                      <span className="patient-meta">{patient.weeks} weeks · {patient.village}</span>
                      <span className="patient-reason">{patient.risk.reasons[0] || 'Routine follow-up'}</span>
                      <span className="patient-last">Last BP: {patient.latest?.bp ? `${patient.latest.bp.sys}/${patient.latest.bp.dia}` : 'Not recorded'} · {lastVisitText(patient.latest?.date)}</span>
                    </span>
                    {reviewed && <span className="reviewed-state"><CheckCircle2 size={18} aria-hidden="true" /> Reviewed</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty-state doctor-empty">
            <CheckCircle2 size={34} aria-hidden="true" />
            <p><strong>{emptyText}</strong></p>
            <p>Try another filter or search a different name or village.</p>
          </div>
        )}
      </section>
    </div>
  );
}
