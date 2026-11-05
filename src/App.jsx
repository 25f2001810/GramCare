import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.js';
import { AuthProvider, getRoleHome, useAuth } from './lib/auth.js';
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
import Login from './pages/Login.jsx';
import DoctorDashboard from './pages/Doctor/Dashboard.jsx';
import PatientDetail from './pages/Doctor/PatientDetail.jsx';
import SettingsPage from './pages/Settings.jsx';
import { LanguageProvider } from './i18n/index.js';

const NEXT_VISIT_DAYS = { HIGH: 7, MEDIUM: 14, LOW: 28 };
const titles = {
  visits: ["Today's visits", 'Homes ranked by health needs'],
  record: ['Record visit', 'Speak or type, then confirm'],
  referrals: ['Referrals', 'Patients who may need extra care']
};

function Loading({ message = 'Loading GramCare…' }) {
  return <main className="loading" role="status">{message}</main>;
}

function RequireRole({ role }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={getRoleHome(user.role)} replace />;
  return <Outlet />;
}

function LoginRoute() {
  const auth = useAuth();
  if (auth.loading) return <Loading />;
  if (auth.user) return <Navigate to={getRoleHome(auth.user.role)} replace />;
  return <Login onLogin={auth.login} />;
}

function WorkerLayout() {
  const { user, logout } = useAuth();
  const online = useOnline();
  const navigate = useNavigate();
  const location = useLocation();
  const [consented, setConsented] = useState(() => localStorage.getItem('gc-consent') === '1');
  const [toast, setToast] = useState('');
  const [syncing, setSyncing] = useState(false);
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const visits = useLiveQuery(() => db.visits.toArray(), []);
  const pending = useLiveQuery(() => db.visits.where('synced').equals(0).count(), [], 0);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const runSync = async () => {
    setSyncing(true);
    try {
      const result = await syncPending();
      if (result.synced) setToast(`Synced ${result.synced} item${result.synced === 1 ? '' : 's'}.`);
    } catch (error) {
      setToast(`${error.message}. Will retry.`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (online && pending > 0) runSync();
    // Sync when connectivity returns or the number of waiting visits changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, pending]);

  const acceptConsent = () => {
    localStorage.setItem('gc-consent', '1');
    setConsented(true);
  };

  if (!consented) return <Consent onAccept={acceptConsent} />;
  if (!patients || !visits) return <Loading />;

  const patientViews = buildPatientViews(patients, visits);
  const saveVisit = async (visit) => {
    const today = todayISO();
    await db.transaction('rw', db.patients, db.visits, async () => {
      await db.visits.add({
        id: uid(),
        patientId: visit.patientId,
        date: today,
        bp: visit.bp,
        symptoms: visit.symptoms,
        medicines: visit.medicines,
        weight: visit.weight,
        hb: visit.hb,
        transcript: visit.transcript,
        synced: 0,
        updatedAt: Date.now()
      });
      await db.patients.update(visit.patientId, {
        weeks: visit.weeks,
        nextVisitDue: addDays(today, NEXT_VISIT_DAYS[visit.risk.level])
      });
    });
    setToast(online ? 'Visit saved.' : 'Visit saved on this phone. It will sync when you are online.');
    navigate('/visits');
  };

  const path = location.pathname.startsWith('/record') ? 'record' : location.pathname.startsWith('/referrals') ? 'referrals' : 'visits';
  const [title, subtitle] = titles[path];
  const goLogout = () => {
    if (pending > 0 && !window.confirm(`You have ${pending} unsynced visit${pending === 1 ? '' : 's'}. Log out anyway? They will stay on this phone.`)) return;
    logout();
    navigate('/login', { replace: true });
  };
  const navigateTab = (name) => navigate(name === 'home' ? '/visits' : name === 'referral' ? '/referrals' : '/record');

  return (
    <div className="app">
      <Header
        online={online}
        pending={pending}
        syncing={syncing}
        onSync={runSync}
        title={title}
        subtitle={subtitle}
        activeView={path === 'visits' ? 'home' : path === 'referrals' ? 'referral' : 'record'}
        onNavigate={navigateTab}
        user={user}
        onLogout={goLogout}
        onSettings={() => navigate('/settings')}
      />
      <main>
        <Outlet context={{ patients: patientViews, visits, saveVisit, setToast }} />
      </main>
      {toast && <div className="toast no-print" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}

function WorkerVisits() {
  const { patients, setToast } = useOutletContext();
  const navigate = useNavigate();
  return (
    <VisitList
      patients={patients}
      onRecord={(id) => navigate('/record', { state: { patientId: id } })}
      onReferral={(id) => navigate(`/referrals/${id}`)}
      onReset={async () => {
        await resetDemoData();
        setToast('Demo data reset.');
      }}
    />
  );
}

function WorkerRecord() {
  const { patients, saveVisit } = useOutletContext();
  const location = useLocation();
  return <RecordVisit patients={patients} initialId={location.state?.patientId} onSave={saveVisit} />;
}

function WorkerReferrals() {
  const { patients } = useOutletContext();
  const navigate = useNavigate();
  return (
    <section aria-label="Referral list">
      {patients.some((patient) => patient.risk.level !== 'LOW') ? (
        <VisitList
          patients={patients.filter((patient) => patient.risk.level !== 'LOW')}
          onRecord={(id) => navigate('/record', { state: { patientId: id } })}
          onReferral={(id) => navigate(`/referrals/${id}`)}
        />
      ) : <p className="empty-state"><strong>No urgent referrals. Nice work.</strong><br />Keep recording visits to update patient needs.</p>}
    </section>
  );
}

function WorkerReferralDetail() {
  const { patients } = useOutletContext();
  const location = useLocation();
  const id = location.pathname.split('/').pop();
  const patient = patients.find((entry) => entry.id === id);
  return patient ? <Referral patient={patient} /> : <p className="empty-state">This patient is not available on this phone.</p>;
}

function DoctorLayout() {
  const { user, logout } = useAuth();
  const online = useOnline();
  const navigate = useNavigate();
  const location = useLocation();
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState('');
  const visits = useLiveQuery(() => db.visits.toArray(), []);
  const reviews = useLiveQuery(() => db.reviews.toArray(), []);
  const pendingVisits = useLiveQuery(() => db.visits.where('synced').equals(0).count(), [], 0);
  const pendingReviews = useLiveQuery(() => db.reviews.where('synced').equals(0).count(), [], 0);
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const pending = pendingVisits + pendingReviews;
  const patientViews = patients && visits ? buildPatientViews(patients, visits) : undefined;

  const runSync = async () => {
    setSyncing(true);
    try {
      const result = await syncPending();
      if (result.synced) setToast(`Synced ${result.synced} item${result.synced === 1 ? '' : 's'}.`);
    } catch (error) {
      setToast(`${error.message}. Will retry.`);
    } finally {
      setSyncing(false);
    }
  };
  useEffect(() => {
    if (online && pending > 0) runSync();
    // Sync when connectivity returns or the number of waiting items changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, pending]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const goLogout = () => {
    if (pending > 0 && !window.confirm(`You have ${pending} unsynced item${pending === 1 ? '' : 's'}. Log out anyway? They will stay on this phone.`)) return;
    logout();
    navigate('/login', { replace: true });
  };
  const title = location.pathname === '/doctor' ? 'Doctor dashboard' : 'Patient details';
  const subtitle = location.pathname === '/doctor' ? 'Review referrals and high-risk patients' : 'Review visit history and care notes';

  return (
    <div className="app doctor-app">
      <Header online={online} pending={pending} syncing={syncing} onSync={runSync} title={title} subtitle={subtitle} user={user} onLogout={goLogout} onSettings={() => navigate('/settings')} />
      <main>
        <p className="phc-label">{user.phc}</p>
        <Outlet context={{ patients: patientViews, visits, reviews, setToast }} />
      </main>
      {toast && <div className="toast no-print" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}

function AppRoutes() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    seedIfEmpty().then(() => setReady(true)).catch((reason) => setError(reason.message || 'Unable to load demo data.'));
  }, []);
  const { user, loading } = useAuth();
  if (error) return <main className="error" role="alert">{error}</main>;
  if (!ready || loading) return <Loading />;

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<RequireUser />}>
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route element={<RequireRole role="worker" />}>
        <Route element={<WorkerLayout />}>
          <Route path="/visits" element={<WorkerVisits />} />
          <Route path="/record" element={<WorkerRecord />} />
          <Route path="/referrals" element={<WorkerReferrals />} />
          <Route path="/referrals/:patientId" element={<WorkerReferralDetail />} />
        </Route>
      </Route>
      <Route element={<RequireRole role="doctor" />}>
        <Route path="/doctor" element={<DoctorLayout />}>
          <Route index element={<DoctorDashboard />} />
          <Route path=":patientId" element={<PatientDetail />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={user ? getRoleHome(user.role) : '/login'} replace />} />
    </Routes>
  );
}

function RequireUser() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}
