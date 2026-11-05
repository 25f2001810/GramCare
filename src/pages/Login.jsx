import { useState } from 'react';
import { Eye, EyeOff, HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useLanguage } from '../i18n/index.js';

const DEMO_ACCOUNTS = {
  admin: [
    { label: 'login.demoAdminOne', email: 'admin@demo.gramcare', password: 'admin123' },
    { label: 'login.demoAdminTwo', email: 'admin2@demo.gramcare', password: 'admin123' }
  ],
  doctor: [
    { label: 'login.doctor', email: 'dr.kumar@demo.gramcare', password: 'doctor123' },
    { label: 'login.doctor', email: 'dr.mehta@demo.gramcare', password: 'doctor123' },
    { label: 'login.doctor', email: 'dr.rao@demo.gramcare', password: 'doctor123' }
  ]
};

export default function Login({ role, onLogin }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    setEmailError(validEmail ? '' : t('login.invalidEmail'));
    setPasswordError(password ? '' : t('login.enterPassword'));
    if (!validEmail || !password) return;
    setBusy(true);
    try {
      await onLogin(email, password, role);
    } catch (reason) {
      setError(reason.message === 'Email or password is incorrect.' ? t('login.credentialsIncorrect') : reason.message || 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <LanguageToggle />
        <Link className="login-back" to="/">← {t('login.back')}</Link>
        <div className="login-brand">
          <span className="login-logo"><HeartPulse size={30} aria-hidden="true" /></span>
          <h1 id="login-title">{t(role === 'admin' ? 'login.adminTitle' : 'login.doctorTitle')}</h1>
        </div>
        <p className="lead">{t(role === 'admin' ? 'login.adminPurpose' : 'login.doctorPurpose')}</p>
        <form className="login-form" onSubmit={submit} noValidate>
          <label className="field" htmlFor="login-email">
            <span>{t('login.email')}</span>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'login-email-error' : undefined}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
              onBlur={() => {
                if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) setEmailError(t('login.invalidEmail'));
              }}
            />
            {emailError && <span className="error" id="login-email-error">{emailError}</span>}
          </label>
          <div className="field">
            <label htmlFor="login-password">{t('login.password')}</label>
            <span className="password-field">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'login-password-error' : undefined}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
              />
              <button type="button" className="password-toggle" aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')} onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </span>
            {passwordError && <span className="error" id="login-password-error">{passwordError}</span>}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary block" type="submit" disabled={busy}>
            {busy ? <><span className="spinner" aria-hidden="true" /> {t('login.signingIn')}</> : t('login.signIn')}
          </button>
        </form>
        <details className="demo-credentials">
          <summary>{t('login.demoCredentials')}</summary>
          <div className="demo-list">
            {DEMO_ACCOUNTS[role].map((account) => (
              <p key={account.email}><strong>{t(account.label)}:</strong> {account.email}<br /><strong>{t('login.demoPassword')}:</strong> {account.password}</p>
            ))}
          </div>
        </details>
        <p className="demo-notice">{t('login.demoNotice')}</p>
      </section>
    </main>
  );
}
