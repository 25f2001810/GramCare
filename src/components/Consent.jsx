import { useState } from 'react';
import { useLanguage } from '../i18n/index.js';

export default function Consent({ onAccept }) {
  const { t } = useLanguage();
  const [ok, setOk] = useState(false);
  return (
    <main className="consent">
      <h1>{t('consent.title')}</h1>
      <p className="lead">{t('consent.lead')}</p>
      <div className="notice">
        <strong>Demo build.</strong> All patients here are made up. Do not enter real patient information.
      </div>
      <label className="check">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>I will ask each patient for permission before recording their health information.</span>
      </label>
      <button className="btn primary block" disabled={!ok} onClick={onAccept}>
        {t('consent.start')}
      </button>
    </main>
  );
}
