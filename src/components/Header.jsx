export default function Header({ online, pending, syncing, onSync, title, subtitle, onBack }) {
  return (
    <header className="app-header no-print">
      <div className="row between">
        {onBack ? (
          <button className="link-btn" onClick={onBack}>
            Back
          </button>
        ) : (
          <span className="brand">GramCare</span>
        )}
        <span className={`chip ${online ? 'chip-online' : 'chip-offline'}`}>{online ? 'Online' : 'Offline'}</span>
      </div>
      <h1>{title}</h1>
      <div className="row between">
        <p className="sub">{subtitle}</p>
        {pending > 0 && (
          <button className="sync-btn" onClick={onSync} disabled={!online || syncing}>
            {syncing ? 'Syncing…' : `${pending} to sync`}
          </button>
        )}
      </div>
    </header>
  );
}
