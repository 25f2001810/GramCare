import { CalendarDays, ClipboardPlus, FileText, Settings as SettingsIcon } from 'lucide-react';
import { useLanguage } from '../i18n/index.js';

const TABS = [
  { id: 'home', label: 'tab.visits', icon: CalendarDays },
  { id: 'record', label: 'tab.record', icon: ClipboardPlus },
  { id: 'referral', label: 'tab.referrals', icon: FileText }
];

export default function Header({ online, pending, syncing, onSync, title, subtitle, onBack, activeView, onNavigate, user, onLogout, onSettings }) {
  const { t } = useLanguage();
  return (
    <>
      <header className="app-header no-print">
      <div className="header-top">
        {onBack ? (
          <button className="header-btn" onClick={onBack}>
            Back
          </button>
        ) : (
          <span className="brand">GramCare AI</span>
        )}
        <div className="header-actions">
          <span className={`chip ${online ? 'chip-online' : 'chip-offline'}`}>{online ? 'Online' : 'Offline'}</span>
          {user && <span className="header-user">{user.name}</span>}
          {onSettings && <button className="header-btn icon-header-btn" type="button" aria-label={t('tab.settings')} onClick={onSettings}><SettingsIcon size={20} aria-hidden="true" /></button>}
          {onLogout && <button className="header-btn logout-btn" onClick={onLogout}>{t('button.logout')}</button>}
          {pending > 0 && (
            <button className="sync-btn" onClick={onSync} disabled={!online || syncing}>
              {syncing ? 'Syncing…' : `${pending} waiting`}
            </button>
          )}
          {pending === 0 && <span className="sync-status">{localStorage.getItem('gramcare-last-synced') ? 'Synced just now' : online ? 'All saved' : 'Saved on this phone'}</span>}
        </div>
      </div>
      <h1>{title}</h1>
      <p className="sub">{subtitle}</p>
    </header>
    {!online && <p className="offline-banner" role="status">You are offline. Visits are saved on this phone.</p>}
    {onNavigate && (
      <nav className="bottom-tabs no-print" aria-label="Main navigation">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className="tab-link" aria-current={activeView === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
            <Icon size={22} aria-hidden="true" />
            <span>{t(label)}</span>
          </button>
        ))}
      </nav>
    )}
    </>
  );
}
