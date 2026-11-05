import { useEffect, useState } from 'react';
import { HashRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { HeartPulse } from 'lucide-react';
import { db } from './db.js';
import { DOMAINS } from './config/domains.js';
import { AuthProvider, canAccessRole, getRoleHome, useAuth } from './lib/auth.js';
import { resetDemoData } from './lib/seed.js';
import { buildPatientViews } from './lib/patients.js';
import { syncPending } from './lib/sync.js';
import { useOnline } from './lib/speech.js';
import { addDays, todayISO, uid } from './lib/util.js';
import Consent from './components/Consent.jsx';
import Header from './components/Header.jsx';
import VisitList from './components/VisitList.jsx';
import RecordVisit from './components/RecordVisit.jsx';
import Referral from './components/Referral.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import { LanguageProvider, useLanguage } from './i18n/index.js';

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
  if (!user) return <Navigate to="/" replace />;
  if (!canAccessRole(user.role, role)) return <Navigate to={getRoleHome(user.role)} replace />;
  return <Outlet />;
}

function LoginRoute({ role }) {
  const auth = useAuth();
  if (auth.loading) return <Loading />;
  if (auth.user) return <Navigate to={getRoleHome(auth.user.role)} replace />;
  return <Login role={role} onLogin={auth.login} />;
}

function AdminLayout() {
  const { user, logout } = useAuth();
  const online = useOnline();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [consented, setConsented] = useState(() => sessionStorage.getItem(ADMIN_CONSENT_KEY) === user.id);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState('');
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const visits = useLiveQuery(() => db.visits.toArray(), []);
  const pendingVisits = useLiveQuery(() => db.visits.where('synced').equals(0).count(), [], 0);
  const pendingReviews = useLiveQuery(() => db.reviews.where('synced').equals(0).count(), [], 0);
  const pending = pendingVisits + pendingReviews;

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const acceptConsent = () => {
    sessionStorage.setItem(ADMIN_CONSENT_KEY, user.id);
    setConsented(true);
  };
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
  const goLogout = () => {
    if (pending > 0 && !window.confirm(`You have ${pending} unsynced item${pending === 1 ? '' : 's'}. Log out anyway? They will stay on this phone.`)) return;
    sessionStorage.removeItem(ADMIN_CONSENT_KEY);
    logout();
    navigate('/', { replace: true });
  };

  if (!consented) return <Consent onAccept={acceptConsent} />;
  if (!patients || !visits) return <Loading />;
  const patientViews = buildPatientViews(patients, visits);
  const saveVisit = async (visit) => {
    const today = todayISO();
    const updatedAt = Date.now();
    const nextDueDate = addDays(today, DOMAINS.pregnancy.defaultFollowUpDays[visit.risk.level]);
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
        nextVisitDue: nextDueDate,
        conditions,
        domains: [...new Set(conditions.map((condition) => condition.domain))],
        updatedAt
      });
    });
    setToast(online ? 'Visit saved.' : 'Visit saved on this phone. It will sync when you are online.');
    navigate('/admin');
  };
  const path = location.pathname.startsWith('/admin/record') ? 'record' : location.pathname.startsWith('/admin/referrals') ? 'referrals' : 'visits';
  const titles = {
    visits: [t('dashboard.adminTitle'), t('dashboard.adminSubtitle')],
    record: [t('tab.record'), t('dashboard.adminSubtitle')],
    referrals: [t('tab.referrals'), t('dashboard.adminSubtitle')]
  };
  const [title, subtitle] = titles[path];
  const navigateTab = (name) => navigate(name === 'home' ? '/admin' : name === 'referral' ? '/admin/referrals' : '/admin/record');

  return (
    <div className="app">
      <Header online={online} pending={pending} syncing={syncing} onSync={runSync} title={title} subtitle={subtitle}
        activeView={path === 'visits' ? 'home' : path === 'referrals' ? 'referral' : 'record'} onNavigate={navigateTab}
        user={user} onLogout={goLogout} />
      <main><Outlet context={{ patients: patientViews, visits, saveVisit, setToast }} /></main>
      {toast && <div className="toast no-print" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}

function AdminVisits() {
  const { patients, setToast } = useOutletContext();
  const navigate = useNavigate();
  return <VisitList patients={patients} onRecord={(id) => navigate('/admin/record', { state: { patientId: id } })}
    onReferral={(id) => navigate(`/admin/referrals/${id}`)} onReset={async () => { await resetDemoData(); setToast('Demo data reset.'); }} />;
}

function AdminRecord() {
  const { patients, saveVisit } = useOutletContext();
  const location = useLocation();
  return <RecordVisit patients={patients} initialId={location.state?.patientId} onSave={saveVisit} />;
}

function AdminReferrals() {
  const { patients } = useOutletContext();
  const navigate = useNavigate();
  const referred = patients.filter((patient) => patient.risk.level !== 'LOW');
  return referred.length ? <VisitList patients={referred} onRecord={(id) => navigate('/admin/record', { state: { patientId: id } })}
    onReferral={(id) => navigate(`/admin/referrals/${id}`)} /> : <p className="empty-state">No urgent referrals. Keep recording visits to update patient needs.</p>;
}

function AdminReferralDetail() {
  const { patients } = useOutletContext();
  const location = useLocation();
  const patient = patients.find((entry) => entry.id === location.pathname.split('/').pop());
  return patient ? <Referral patient={patient} /> : <p className="empty-state">This patient is not available on this phone.</p>;
}

function DoctorDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const online = useOnline();
  const pendingVisits = useLiveQuery(() => db.visits.where('synced').equals(0).count(), [], 0);
  const pendingReviews = useLiveQuery(() => db.reviews.where('synced').equals(0).count(), [], 0);
  const pending = pendingVisits + pendingReviews;
  const goLogout = () => {
    if (pending > 0 && !window.confirm(`You have ${pending} unsynced item${pending === 1 ? '' : 's'}. Log out anyway? They will stay on this phone.`)) return;
    logout();
    navigate('/', { replace: true });
  };
  return (
    <div className="app doctor-app">
      <Header online={online} pending={pending} title={t('dashboard.doctorTitle')} subtitle={t('dashboard.doctorSubtitle')} user={user} onLogout={goLogout} />
      <main>
        <section className="dashboard-placeholder">
          <HeartPulse size={40} aria-hidden="true" />
          <h2>{t('dashboard.doctorTitle')}</h2>
          <p>{t('dashboard.doctorPlaceholder')}</p>
          <p className="meta">{user.hospital}</p>
          <Link className="btn secondary" to="/">{t('button.backHome')}</Link>
        </section>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={getRoleHome(user.role)} replace /> : <Landing />} />
      <Route path="/login/admin" element={<LoginRoute role="admin" />} />
      <Route path="/login/doctor" element={<LoginRoute role="doctor" />} />
      <Route element={<RequireRole role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminVisits />} />
          <Route path="visits" element={<AdminVisits />} />
          <Route path="record" element={<AdminRecord />} />
          <Route path="referrals" element={<AdminReferrals />} />
          <Route path="referrals/:patientId" element={<AdminReferralDetail />} />
        </Route>
      </Route>
      <Route element={<RequireRole role="doctor" />}><Route path="/doctor" element={<DoctorDashboard />} /></Route>
      <Route path="*" element={<Navigate to={user ? getRoleHome(user.role) : '/'} replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><LanguageProvider><HashRouter><AppRoutes /></HashRouter></LanguageProvider></AuthProvider>;
}
