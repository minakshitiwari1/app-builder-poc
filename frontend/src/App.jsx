import { useEffect, useRef, useState } from 'react';
import { API_BASE, api, canUseLaunchConsole } from './api';
import AppBuilder from './AppBuilder';
import Builds from './Builds';
import LaunchConsole from './LaunchConsole';
import { Alert, Icon, Spinner } from './ui';
import './App.css';

const SETTINGS_KEY = 'app-builder-settings';
const DEFAULT_SETTINGS = { retailId: 'RET_2', branchId: 'RLC_3', userId: 'dinesh', userName: 'Dinesh' };

const PAGES = {
  builder: { title: 'App Builder', subtitle: 'Design, brand and publish your store app', icon: 'phone' },
  builds: { title: 'Builds', subtitle: 'Every app version built for your stores', icon: 'layers' },
  launch: { title: 'Launch Console', subtitle: 'Pallet staff: confirm merchant store access', icon: 'shield' },
};

const loadSettings = () => {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

function WorkspaceMenu({ settings, onApply }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(settings);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = event => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const toggle = () => {
    if (!open) setDraft(settings);
    setOpen(!open);
  };

  const apply = event => {
    event.preventDefault();
    onApply(draft);
    setOpen(false);
  };

  return (
    <div className="workspace" ref={ref}>
      <button type="button" className="workspace-button" onClick={toggle} aria-expanded={open}>
        <span className="workspace-avatar">{settings.userName.slice(0, 1).toUpperCase()}</span>
        <span className="workspace-text"><b>{settings.retailId}</b><small>{settings.userName}</small></span>
        <Icon name="down" size={16} />
      </button>
      {open && (
        <form className="popover" onSubmit={apply}>
          <b>Workspace</b>
          <small>Local testing: choose the retail and user the App Builder acts as.</small>
          {[['retailId', 'Retail ID'], ['branchId', 'Default store (branch ID)'], ['userId', 'User ID'], ['userName', 'User name']].map(([key, label]) => (
            <label key={key} htmlFor={`setting-${key}`}>
              {label}
              <input id={`setting-${key}`} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value.trim() })} />
            </label>
          ))}
          <div className="button-row end">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Apply</button>
          </div>
        </form>
      )}
    </div>
  );
}

// Each page has its own URL (#builder, #builds, #launch) so refresh and the back button work.
const pageFromHash = () => {
  const key = window.location.hash.replace(/^#\/?/, '');
  return PAGES[key] && (key !== 'launch' || canUseLaunchConsole) ? key : 'builder';
};

export default function App() {
  const [page, setPageState] = useState(pageFromHash);
  const setPage = key => {
    if (key !== page) window.history.pushState(null, '', `#${key}`);
    setPageState(key);
  };

  useEffect(() => {
    const onHash = () => setPageState(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.title = `${PAGES[page].title} · Pallet App Builder`;
  }, [page]);
  const [settings, setSettings] = useState(loadSettings);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');

  const connect = () => {
    setError('');
    api.meta().then(setMeta).catch(err => setError(err.message));
  };

  useEffect(() => {
    api.meta().then(setMeta).catch(err => setError(err.message));
  }, []);

  const applySettings = next => {
    setSettings(next);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };

  const user = { id: settings.userId, name: settings.userName };
  const current = PAGES[page];
  const navItem = key => (
    <button type="button" className={`nav-item ${page === key ? 'active' : ''}`} onClick={() => setPage(key)}
      aria-current={page === key ? 'page' : undefined}>
      <Icon name={PAGES[key].icon} /> <span>{PAGES[key].title}</span>
    </button>
  );

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Main">
        <div className="brand">
          <span className="brand-mark"><Icon name="phone" size={18} /></span>
          <span><b>Pallet</b><small>App Builder</small></span>
        </div>
        <p className="menu-label">Workspace</p>
        {navItem('builder')}
        {navItem('builds')}
        {canUseLaunchConsole && (
          <>
            <p className="menu-label">Pallet staff</p>
            {navItem('launch')}
          </>
        )}
        <div className="sidebar-foot">
          <small>Apps publish under your own Google Play and Apple accounts.</small>
        </div>
      </nav>
      <div className="content">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{current.title}</h1>
            <small>{current.subtitle}</small>
          </div>
          <div className="topbar-actions">
            <span className={`connection ${meta ? 'online' : error ? 'offline' : ''}`} title={API_BASE}>
              <i />{meta ? 'Connected' : error ? 'Offline' : 'Connecting'}
            </span>
            <WorkspaceMenu settings={settings} onApply={applySettings} />
          </div>
        </header>
        <main>
          {error && (
            <Alert tone="danger" title="Cannot load the App Builder"
              action={<button type="button" className="btn btn-secondary" onClick={connect}><Icon name="refresh" size={16} /> Retry</button>}>
              {error}
            </Alert>
          )}
          {!meta && !error && <div className="card loading-card"><Spinner label="Connecting to retail-service…" /></div>}
          {meta && page === 'builder' && (
            <AppBuilder key={`${settings.retailId}-${settings.branchId}`} meta={meta} settings={settings} user={user} openBuilds={() => setPage('builds')} />
          )}
          {meta && page === 'builds' && <Builds key={settings.retailId} meta={meta} settings={settings} />}
          {meta && page === 'launch' && canUseLaunchConsole && <LaunchConsole user={user} />}
        </main>
      </div>
    </div>
  );
}
