import { useState } from 'react';

export default function Consent({ onAccept }) {
  const [ok, setOk] = useState(false);
  return (
    <main className="consent">
      <h1>GramCare AI</h1>
      <p className="lead">Speak a visit, get a record, and see who to visit next. Works without internet.</p>
      <div className="notice">
        <strong>Demo build.</strong> All patients here are made up. Do not enter real patient information.
      </div>
      <label className="check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>I will ask each patient for permission before recording their health information.</span>
      </label>
      <button className="btn primary block" disabled={!ok} onClick={onAccept}>
        Start
      </button>
    </main>
  );
}
