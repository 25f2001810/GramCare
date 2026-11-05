import { ArrowRight, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useLanguage } from '../i18n/index.js';

export default function Landing() {
  const { t } = useLanguage();
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" to="/" aria-label="GramCare home">
          <span className="landing-logo"><HeartPulse size={28} aria-hidden="true" /></span>
          <span>GramCare <strong>AI</strong></span>
        </Link>
        <LanguageToggle />
      </header>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy">
          <span className="landing-kicker"><ShieldCheck size={17} aria-hidden="true" /> {t('landing.offline')}</span>
          <h1 id="landing-title">{t('landing.title')}</h1>
          <p>{t('landing.purpose')}</p>
        </div>
        <section className="role-section" aria-labelledby="role-heading">
          <h2 id="role-heading">{t('landing.chooseRole')}</h2>
          <div className="role-grid">
            <Link className="role-card admin-role" to="/login/admin">
              <span className="role-icon"><ShieldCheck size={30} aria-hidden="true" /></span>
              <span className="role-card-copy"><strong>{t('landing.adminLabel')}</strong><span>{t('landing.adminDescription')}</span></span>
              <ArrowRight className="role-arrow" size={22} aria-hidden="true" />
            </Link>
            <Link className="role-card doctor-role" to="/login/doctor">
              <span className="role-icon"><Stethoscope size={30} aria-hidden="true" /></span>
              <span className="role-card-copy"><strong>{t('landing.doctorLabel')}</strong><span>{t('landing.doctorDescription')}</span></span>
              <ArrowRight className="role-arrow" size={22} aria-hidden="true" />
            </Link>
          </div>
        </section>
        <footer className="landing-footer">{t('login.demoNotice')}</footer>
      </section>
    </main>
  );
}
