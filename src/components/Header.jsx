import { CalendarDays, ClipboardPlus, FileText } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Visits', icon: CalendarDays },
  { id: 'record', label: 'Record', icon: ClipboardPlus },
  { id: 'referral', label: 'Referrals', icon: FileText }
];

export default function Header({ online, pending, syncing, onSync, title, subtitle, onBack, activeView, onNavigate, user, onLogout }) {
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
          {onLogout && <button className="header-btn logout-btn" onClick={onLogout}>Log out</button>}
          {pending > 0 && (
            <button className="sync-btn" onClick={onSync} disabled={!online || syncing}>
              {syncing ? 'Syncing…' : `${pending} waiting`}
            </button>
          )}
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
            <span>{label}</span>
          </button>
        ))}
      </nav>
    )}
    </>
  );
}
