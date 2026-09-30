import { useEffect, useState } from 'react';
import { API_BASE, api } from './api';
import AppBuilder from './AppBuilder';
import Builds from './Builds';
import './App.css';
import './integration.css';

const SETTINGS_KEY = 'app-builder-settings';
const DEFAULT_SETTINGS = { retailId: 'RET_2', branchId: 'RLC_3', userId: 'dinesh', userName: 'Dinesh' };

const loadSettings = () => {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export default function App() {
  const [page, setPage] = useState('builder');
  const [settings, setSettings] = useState(loadSettings);
  const [draft, setDraft] = useState(settings);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.meta().then(setMeta).catch(err => setError(err.message));
  }, []);

  const applySettings = () => {
    setSettings(draft);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(draft)); } catch { /* storage unavailable */ }
  };

  const user = { id: settings.userId, name: settings.userName };

  return (
    <div className="shell">
      <nav>
        <div className="brand"><span>▰</span> BUILDLY</div>
        <p className="menu-label">WORKSPACE</p>
        <button className={page === 'builder' ? 'active' : ''} onClick={() => setPage('builder')}><span>✦</span> App Builder</button>
        <button className={page === 'builds' ? 'active' : ''} onClick={() => setPage('builds')}><span>▦</span> Builds</button>
        <div className="nav-bottom">
          <span className="avatar">{settings.userName.slice(0, 1).toUpperCase()}</span>
          <div><b>{settings.userName}</b><small>{settings.userId}</small></div>
        </div>
      </nav>
      <div className="content">
        <header className="topbar settings-bar">
          <div>
            <b>App Builder Workspace</b>
            <small>API: {API_BASE} {meta ? '· connected' : ''}</small>
          </div>
          <div className="settings">
            {[['retailId', 'Retail ID'], ['branchId', 'Default branch'], ['userId', 'User ID'], ['userName', 'User name']].map(([key, label]) => (
              <label key={key} htmlFor={`setting-${key}`}>
                {label}
                <input id={`setting-${key}`} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value.trim() })} />
              </label>
            ))}
            <button className="secondary" onClick={applySettings}>Apply</button>
          </div>
        </header>
        <main>
          {error && <p className="error">{error}</p>}
          {!meta && !error && <p>Connecting to retail-service…</p>}
          {meta && (page === 'builder'
            ? <AppBuilder key={settings.retailId} meta={meta} settings={settings} user={user} openBuilds={() => setPage('builds')} />
            : <Builds key={settings.retailId} meta={meta} settings={settings} />)}
        </main>
      </div>
    </div>
  );
}
