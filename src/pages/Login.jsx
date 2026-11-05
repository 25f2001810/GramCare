import { useState } from 'react';
import { Eye, EyeOff, HeartPulse } from 'lucide-react';
import { useLanguage } from '../i18n/index.js';

export default function Login({ onLogin }) {
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
      await onLogin(email, password);
    } catch (reason) {
      setError(reason.message === 'Email or password is incorrect.' ? t('login.credentialsIncorrect') : reason.message || 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="login-logo"><HeartPulse size={30} aria-hidden="true" /></span>
          <h1 id="login-title">{t('login.title')}</h1>
        </div>
        <p className="lead">{t('login.purpose')}</p>
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
          <label className="field" htmlFor="login-password">
            <span>{t('login.password')}</span>
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
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary block" type="submit" disabled={busy}>
            {busy ? <><span className="spinner" aria-hidden="true" /> {t('login.signingIn')}</> : t('login.signIn')}
          </button>
        </form>
        <details className="demo-credentials">
          <summary>{t('login.demoCredentials')}</summary>
          <div className="demo-list">
            <p><strong>{t('login.doctor')}:</strong> dr.kumar@demo.gramcare · doctor123</p>
            <p><strong>{t('login.doctor')}:</strong> dr.mehta@demo.gramcare · doctor123</p>
            <p><strong>{t('login.doctor')}:</strong> dr.rao@demo.gramcare · doctor123</p>
            <p><strong>{t('login.healthWorker')}:</strong> worker@demo.gramcare · worker123</p>
          </div>
        </details>
        <p className="demo-notice">{t('login.demoNotice')}</p>
      </section>
    </main>
  );
}
