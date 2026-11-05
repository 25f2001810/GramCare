import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';
import { resetDemoData } from '../lib/seed.js';
import { syncPending } from '../lib/sync.js';
import { useOnline } from '../lib/speech.js';
import { db } from '../db.js';
import { loadTextSize, saveTextSize, useLanguage } from '../i18n/index.js';
import Header from '../components/Header.jsx';

const APP_VERSION = '0.1.0';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const online = useOnline();
  const navigate = useNavigate();
  const [textSize, setTextSize] = useState(loadTextSize);
  const [toast, setToast] = useState('');
  const [syncing, setSyncing] = useState(false);
  const pendingVisits = useLiveQuery(() => db.visits.where('synced').equals(0).count(), [], 0);
  const pendingReviews = useLiveQuery(() => db.reviews.where('synced').equals(0).count(), [], 0);
  const pending = pendingVisits + pendingReviews;

  const changeTextSize = (value) => {
    setTextSize(value);
    saveTextSize(value);
  };
  const handleReset = async () => {
    if (!window.confirm(t('settings.resetConfirm'))) return;
    try {
      await resetDemoData();
      setToast(t('settings.resetDone'));
    } catch (error) {
      setToast(`Unable to reset demo data: ${error.message}`);
    }
  };
  const runSync = async () => {
    setSyncing(true);
    try {
      const result = await syncPending();
      if (result.synced) setToast(`Synced ${result.synced} items.`);
    } catch (error) {
      setToast(`${error.message}. Will retry.`);
    } finally {
      setSyncing(false);
    }
  };
  const handleLogout = () => {
    if (pending && !window.confirm(`You have ${pending} unsynced items. Log out anyway?`)) return;
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app">
      <Header
        online={online}
        pending={pending}
        syncing={syncing}
        onSync={runSync}
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        onBack={() => navigate(user.role === 'doctor' ? '/doctor' : '/visits')}
        user={user}
        onLogout={handleLogout}
      />
      <main className="settings-page">
        <section className="settings-card">
          <label className="field" htmlFor="language-select">
            <span>{t('settings.language')}</span>
            <select id="language-select" value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="en">{t('settings.english')}</option>
              <option value="ta">{t('settings.tamil')}</option>
              <option value="hi">{t('settings.hindi')}</option>
            </select>
          </label>
        </section>

        <fieldset className="settings-card setting-options">
          <legend>{t('settings.textSize')}</legend>
          {['normal', 'large'].map((value) => (
            <label className="setting-choice" key={value}>
              <input type="radio" name="text-size" value={value} checked={textSize === value} onChange={() => changeTextSize(value)} />
              <span>{t(`settings.${value}`)}</span>
            </label>
          ))}
        </fieldset>

        <section className="settings-card settings-danger">
          <h2>{t('settings.resetDemo')}</h2>
          <p>Restore the original fake patients and remove locally saved visits and notes.</p>
          <button type="button" className="btn danger" onClick={handleReset}>{t('settings.resetDemo')}</button>
        </section>

        <section className="settings-card app-version">
          <span>{t('settings.version')}</span>
          <strong>{APP_VERSION}</strong>
        </section>
      </main>
      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}
