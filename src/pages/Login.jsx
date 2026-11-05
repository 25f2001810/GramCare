import { useState } from 'react';
import { Eye, EyeOff, HeartPulse } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onLogin(email, password);
    } catch (reason) {
      setError(reason.message || 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="login-logo"><HeartPulse size={30} aria-hidden="true" /></span>
          <h1 id="login-title">GramCare AI</h1>
        </div>
        <p className="lead">Sign in to review referrals and high-risk patients</p>
        <form className="login-form" onSubmit={submit}>
          <label className="field" htmlFor="login-email">
            <span>Email</span>
            <input id="login-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field" htmlFor="login-password">
            <span>Password</span>
            <span className="password-field">
              <input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </span>
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary block" type="submit" disabled={busy}>
            {busy ? <><span className="spinner" aria-hidden="true" /> Signing in…</> : 'Sign in'}
          </button>
        </form>
        <details className="demo-credentials">
          <summary>Demo credentials</summary>
          <div className="demo-list">
            <p><strong>Doctor:</strong> dr.kumar@demo.gramcare · doctor123</p>
            <p><strong>Doctor:</strong> dr.mehta@demo.gramcare · doctor123</p>
            <p><strong>Doctor:</strong> dr.rao@demo.gramcare · doctor123</p>
            <p><strong>Health worker:</strong> worker@demo.gramcare · worker123</p>
          </div>
        </details>
        <p className="demo-notice">Demo build, no real patient data.</p>
      </section>
    </main>
  );
}
