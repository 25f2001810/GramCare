import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.js';
import { seedIfEmpty, resetDemoData } from './lib/seed.js';
import { buildPatientViews } from './lib/patients.js';
import { syncPending } from './lib/sync.js';
import { useOnline } from './lib/speech.js';
import { addDays, todayISO, uid } from './lib/util.js';
import Consent from './components/Consent.jsx';
import Header from './components/Header.jsx';
import VisitList from './components/VisitList.jsx';
import RecordVisit from './components/RecordVisit.jsx';
import Referral from './components/Referral.jsx';

const NEXT_VISIT_DAYS = { HIGH: 7, MEDIUM: 14, LOW: 28 };

export default function App() {
  const [consented, setConsented] = useState(() => localStorage.getItem('gc-consent') === '1');
  const [view, setView] = useState({ name: 'home' });
  const [toast, setToast] = useState('');
  const [syncing, setSyncing] = useState(false);
  const online = useOnline();

  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const visits = useLiveQuery(() => db.visits.toArray(), []);
  const pending = useLiveQuery(() => db.visits.where('synced').equals(0).count(), [], 0);

  useEffect(() => {
    seedIfEmpty();
  }, []);

  const runSync = async () => {
    setSyncing(true);
    try {
      const r = await syncPending();
      if (r.synced) setToast(`Synced ${r.synced} visit${r.synced > 1 ? 's' : ''}.`);
    } catch (e) {
      setToast(`${e.message}. Will retry.`);
    } finally {
      setSyncing(false);
    }
  };

  // Sync automatically whenever we are online and something is waiting
  useEffect(() => {
    if (online && pending > 0) runSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, pending]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const accept = () => {
    localStorage.setItem('gc-consent', '1');
    setConsented(true);
  };

  if (!consented) return <Consent onAccept={accept} />;
  if (!patients || !visits) return <p className="loading">Loading…</p>;

  const views = buildPatientViews(patients, visits);
  const byId = (id) => views.find((p) => p.id === id);

  const saveVisit = async (v) => {
    const today = todayISO();
    await db.transaction('rw', db.patients, db.visits, async () => {
      await db.visits.add({
        id: uid(),
        patientId: v.patientId,
        date: today,
        bp: v.bp,
        symptoms: v.symptoms,
        medicines: v.medicines,
        weight: v.weight,
        hb: v.hb,
        transcript: v.transcript,
        synced: 0,
        updatedAt: Date.now()
      });
      await db.patients.update(v.patientId, {
        weeks: v.weeks,
        nextVisitDue: addDays(today, NEXT_VISIT_DAYS[v.risk.level])
      });
    });
    setToast(online ? 'Visit saved.' : 'Visit saved on this phone. It will sync when you are online.');
    setView({ name: 'home' });
  };

  const home = () => setView({ name: 'home' });
  let screen;
  let title = "Today's visits";
  let subtitle = `${views.length} homes, ranked by risk`;

  if (view.name === 'record') {
    title = 'Record visit';
    subtitle = 'Speak or type, then confirm';
    screen = <RecordVisit patients={views} initialId={view.patientId} onSave={saveVisit} />;
  } else if (view.name === 'referral' && byId(view.patientId)) {
    title = 'Referral summary';
    subtitle = 'Ready to share';
    screen = <Referral patient={byId(view.patientId)} />;
  } else {
    screen = (
      <VisitList
        patients={views}
        onRecord={(id) => setView({ name: 'record', patientId: id })}
        onReferral={(id) => setView({ name: 'referral', patientId: id })}
        onReset={async () => {
          await resetDemoData();
          setToast('Demo data reset.');
        }}
      />
    );
  }

  return (
    <div className="app">
      <Header
        online={online}
        pending={pending}
        syncing={syncing}
        onSync={runSync}
        title={title}
        subtitle={subtitle}
        onBack={view.name === 'home' ? null : home}
        activeView={view.name}
        onNavigate={(name) => setView({ name })}
      />
      <main>{screen}</main>
      {toast && (
        <div className="toast no-print" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
