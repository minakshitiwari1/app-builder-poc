// Small shared UI pieces so every screen looks and behaves the same.

const ICONS = {
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M11 18h2',
  layers: 'M12 2 2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4',
  check: 'M20 6 9 17l-5-5',
  store: 'M3 9l1.5-5h15L21 9 M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9z M9 21v-6h6v6',
  image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21',
  palette: 'M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.5 3.3A1.6 1.6 0 0 1 12 22z M7.5 10.5h.01 M12 7.5h.01 M16.5 10.5h.01',
  rocket: 'M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z M12 15l-3-3a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0 M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5',
  sliders: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8 M21 3v5h-5',
  x: 'M18 6 6 18 M6 6l12 12',
  alert: 'M12 9v4 M12 17h.01 M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01',
  success: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M8 12l3 3 5-6',
  copy: 'M9 9h11v11H9z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14 21 3',
  trash: 'M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.3-4.3',
  right: 'M9 18l6-6-6-6',
  left: 'M15 18l-6-6 6-6',
  down: 'M6 9l6 6 6-6',
  plus: 'M12 5v14 M5 12h14',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2',
  play: 'M6 3l14 9-14 9V3z',
  apple: 'M16 3c-1.2.1-2.6.9-3.4 1.9-.7.9-1.3 2.2-1.1 3.4 1.3.1 2.6-.7 3.4-1.7.8-1 1.3-2.3 1.1-3.6z M12 8.6c-1-.1-2.4-.9-3.7-.9C5.9 7.7 4 9.8 4 13.3 4 17 6.6 21 8.6 21c1.1 0 1.6-.7 3.2-.7s1.9.7 3.2.7c1.9 0 3.6-3.1 4.2-5-1.7-.7-2.8-2.3-2.8-4.2 0-1.7.9-3 2.2-3.8-.9-1.3-2.3-1.9-3.6-1.9-1.3 0-2.2.6-3 .5z',
  user: 'M20 21a8 8 0 0 0-16 0 M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
};

export function Icon({ name, size = 18, className = '' }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] || ICONS.info} />
    </svg>
  );
}

const ALERT_ICON = { info: 'info', success: 'success', warning: 'alert', danger: 'alert' };

export function Alert({ tone = 'info', title, children, action, onClose }) {
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={ALERT_ICON[tone]} />
      <div className="alert-body">
        {title && <b>{title}</b>}
        {children && <div>{children}</div>}
      </div>
      {action}
      {onClose && <button type="button" className="icon-button" onClick={onClose} aria-label="Dismiss"><Icon name="x" size={16} /></button>}
    </div>
  );
}

/** Shows a {text, error} message from an action. */
export function Status({ state }) {
  if (!state?.text) return null;
  return <Alert tone={state.error ? 'danger' : 'success'}>{state.text}</Alert>;
}

export function Pill({ tone = 'neutral', children }) {
  return <span className={`pill pill-${tone}`}><i />{children}</span>;
}

const BUILD_TONE = { QUEUED: 'warning', BUILDING: 'info', SUCCESS: 'success', FAILED: 'danger' };
const BUILD_LABEL = { QUEUED: 'Queued', BUILDING: 'Building', SUCCESS: 'Ready', FAILED: 'Failed' };

export function BuildPill({ status }) {
  return <Pill tone={BUILD_TONE[status] || 'neutral'}>{BUILD_LABEL[status] || status}</Pill>;
}

export function Spinner({ label = 'Loading…' }) {
  return <span className="spinner-wrap"><span className="spinner" aria-hidden="true" />{label}</span>;
}

export function EmptyState({ icon = 'info', title, children, action }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon name={icon} size={24} /></span>
      <b>{title}</b>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function StoreLogo({ storeType, size = 'md' }) {
  const google = storeType === 'GOOGLE_PLAY' || storeType === 'ANDROID';
  return (
    <span className={`store-logo ${google ? 'google' : 'apple'} ${size}`} aria-hidden="true">
      <Icon name={google ? 'play' : 'apple'} size={size === 'sm' ? 14 : 18} />
    </span>
  );
}
