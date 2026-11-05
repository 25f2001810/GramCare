import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ClipboardList, Save } from 'lucide-react';
import { useAuth } from '../../lib/auth.js';
import { buildReferralText, bpText } from '../../lib/referral.js';
import { db } from '../../db.js';
import { uid } from '../../lib/util.js';

export default function PatientDetail() {
  const { patients, visits, reviews, setToast } = useOutletContext();
  const { user } = useAuth();
  const { patientId } = useParams();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  if (!patients || !visits || !reviews) return <div className="skeleton skeleton-list" aria-label="Loading patient details" />;

  const patient = patients.find((item) => item.id === patientId);
  if (!patient) return <section className="empty-state"><p>Patient not found on this phone.</p><Link className="btn" to="/doctor">Back to dashboard</Link></section>;

  const patientVisits = visits.filter((visit) => visit.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date));
  const patientReviews = reviews.filter((review) => review.patientId === patient.id).sort((a, b) => b.createdAt - a.createdAt);
  const reviewed = patientReviews.some((review) => review.status === 'reviewed');
  const referralText = buildReferralText(patient);

  const saveReview = async (reviewNote) => {
    setSaving(true);
    try {
      await db.reviews.add({
        id: uid(),
        patientId: patient.id,
        doctorId: user.id,
        status: 'reviewed',
        note: reviewNote,
        createdAt: Date.now(),
        synced: 0
      });
      setNote('');
      setToast(reviewNote ? 'Review note saved on this phone.' : 'Patient marked as reviewed.');
    } catch (error) {
      setToast(`Unable to save review: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="patient-detail">
      <Link to="/doctor" className="back-link"><ArrowLeft size={20} aria-hidden="true" /> Back to patients</Link>
      <section className="detail-heading">
        <div>
          <span className={`badge badge-${patient.risk.level.toLowerCase()}`}>{patient.risk.level} RISK</span>
          <h2>{patient.name}</h2>
          <p className="meta">{patient.age} years · {patient.weeks} weeks pregnant · {patient.village}</p>
        </div>
        {reviewed && <span className="reviewed-state"><CheckCircle2 size={18} aria-hidden="true" /> Reviewed</span>}
      </section>

      <div className="detail-grid">
        <section className="detail-panel" aria-labelledby="vitals-title">
          <h3 id="vitals-title">Vitals history</h3>
          {patientVisits.length ? (
            <ol className="vitals-history">
              {patientVisits.map((visit) => (
                <li key={visit.id}>
                  <time dateTime={visit.date}>{new Date(`${visit.date}T00:00:00`).toLocaleDateString()}</time>
                  <span><strong>BP</strong> {bpText(visit.bp)}</span>
                  {visit.weight != null && <span><strong>Weight</strong> {visit.weight} kg</span>}
                  {visit.hb != null && <span><strong>Hb</strong> {visit.hb}</span>}
                </li>
              ))}
            </ol>
          ) : <p>No vitals recorded yet.</p>}
        </section>

        <section className="detail-panel" aria-labelledby="clinical-title">
          <h3 id="clinical-title">Latest visit details</h3>
          <dl className="facts">
            <dt>Symptoms</dt><dd>{patient.latest?.symptoms?.length ? patient.latest.symptoms.join(', ') : 'None reported'}</dd>
            <dt>Medicines</dt><dd>{patient.latest?.medicines?.length ? patient.latest.medicines.join(', ') : 'None reported'}</dd>
            <dt>Last BP</dt><dd>{bpText(patient.latest?.bp)}</dd>
          </dl>
          <h4>Risk reasons</h4>
          {patient.risk.reasons.length ? <ul className="risk-reasons">{patient.risk.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : <p>No risk flags recorded.</p>}
        </section>

        <section className="detail-panel" aria-labelledby="transcript-title">
          <h3 id="transcript-title">Original transcript</h3>
          <p className="transcript">{patient.latest?.transcript || 'No transcript was saved for the latest visit.'}</p>
        </section>

        <section className="detail-panel" aria-labelledby="summary-title">
          <h3 id="summary-title">Referral summary</h3>
          <pre className="referral-text">{referralText}</pre>
          <p className="footnote">Assistive summary, not a diagnosis. Confirm with the care team.</p>
        </section>
      </div>

      <section className="review-panel" aria-labelledby="review-title">
        <h3 id="review-title"><ClipboardList size={22} aria-hidden="true" /> Review actions</h3>
        <label className="field" htmlFor="doctor-note">
          <span>Add a note</span>
          <textarea id="doctor-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write a follow-up note for the care team" />
        </label>
        <div className="row gap review-actions">
          <button type="button" className="btn primary" disabled={saving || !note.trim()} onClick={() => saveReview(note.trim())}><Save size={18} aria-hidden="true" /> Save note</button>
          <button type="button" className="btn secondary" disabled={saving || reviewed} onClick={() => saveReview('')}><CheckCircle2 size={18} aria-hidden="true" /> {reviewed ? 'Already reviewed' : 'Mark reviewed'}</button>
        </div>
        {patientReviews.length > 0 && (
          <div className="review-history">
            <h4>Saved notes</h4>
            <ul>{patientReviews.filter((review) => review.note).map((review) => <li key={review.id}><time>{new Date(review.createdAt).toLocaleString()}</time><p>{review.note}</p></li>)}</ul>
          </div>
        )}
        <p className="hint">Changes are saved on this phone and will sync when online.</p>
      </section>
    </article>
  );
}
