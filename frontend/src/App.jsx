import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import AppBuilder from './AppBuilder';
import Builds from './Builds';
import Preview from './Preview';
import RmsShell from './demo/RmsShell';
import { appBuilderService as demoService } from './appBuilderService';
import { STEP_PATHS, TEMPLATES } from './demo/metadata';
import { themeFromFields } from './themeUtils';
import { THEME_FIELDS } from './demo/metadata';
import { Icon } from './ui';
import './App.css';

const readRoute = () => {
  const [page = 'builder', appId = '', slug = 'platforms'] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { page: ['apps', 'builds', 'builder'].includes(page) ? page : 'builder', appId, step: Math.max(0, STEP_PATHS.indexOf(slug)) };
};

function Templates({ workspace, onOpen, onCreate }) {
  const [search, setSearch] = useState('');
  const apps = workspace.apps.filter(app => app.appName.toLowerCase().includes(search.toLowerCase()));
  return <main className="editor-page templates-page"><h2>App Builder</h2><p className="muted">Manage your app template or explore another starting point.</p>
    <div className="section-heading template-section-heading"><h2>My Templates</h2><span className="muted">{apps.length}</span></div>
    <label className="template-search"><Icon name="search" /><input aria-label="Search apps" placeholder="Find an app by name" value={search} onChange={event => setSearch(event.target.value)} /></label>
    {apps.map(app => { const template = TEMPLATES.find(item => item.id === app.templateId); return <article className="active-template" key={app.appId}><div><div className="button-row"><h2>{app.appName}</h2><span className="pill pill-success">Draft · {workspace.mode === 'real' ? 'API' : 'Demo'}</span></div><p className="muted">{template.description}</p><div className="button-row"><span className="demo-badge">{template.category}</span><span className="demo-badge">Mobile storefront</span></div><button className="btn btn-primary" onClick={() => onOpen(app.appId, app.step)}>Continue setup <Icon name="right" /></button></div><div className="template-phone-art"><Preview appName={app.appName} theme={app.theme} compact screen="home" onScreenChange={() => onOpen(app.appId, app.step)} /></div></article>; })}
    {!apps.length && <p className="empty-inline">No apps match this search.</p>}
    <div className="section-heading template-section-heading"><h2>Explore Templates</h2><span className="muted">{TEMPLATES.length}</span></div><div className="template-grid">{TEMPLATES.map(template => { const theme = themeFromFields(THEME_FIELDS); theme.colors.brand = template.brand; theme.colors.accent = template.accent; return <article className="template-card" key={template.id}><div className="template-art" style={{ background: `${template.brand}10` }}><Preview compact appName={template.name} theme={theme} screen="home" onScreenChange={() => onCreate(template.id)} /></div><div><small>{template.category}</small><h2>{template.name}</h2><p>{template.description}</p><button className="btn btn-primary" onClick={() => onCreate(template.id)}>Use this template <Icon name="right" /></button></div></article>; })}</div>
  </main>;
}

export default function App() {
  const workspace = useSyncExternalStore(demoService.subscribe, demoService.getSnapshot);
  const [route, setRoute] = useState(readRoute);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewScreen, setPreviewScreen] = useState('home');
  const actionId = useRef(0);
  const app = workspace.apps.find(item => item.appId === route.appId) || (!route.appId ? workspace.apps[0] : null);
  const real = demoService.mode === 'real';
  useEffect(() => { if (real) demoService.initialize(); }, [real]);
  const displayedApp = route.page === 'builder' ? app : null;
  const permissions = demoService.permissions(app?.appId);
  useEffect(() => {
    const changed = () => { actionId.current += 1; setRoute(readRoute()); setMessage(null); setBusy(false); setPublishing(false); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  useEffect(() => { document.title = `${route.page === 'builds' ? 'Builds' : 'App Builder'} · RMS ${real ? 'API' : 'Demo'}`; }, [route.page, real]);
  const building = workspace.builds.some(build => ['QUEUED', 'BUILDING'].includes(build.status));
  const transientEdits = workspace.apps.some(item => (real && item.remoteAppId && item.detailsDirty) || item.assets.ICON?.url?.startsWith('blob:') || item.assets.SPLASH?.url?.startsWith('blob:'));
  useEffect(() => {
    if (!transientEdits) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [transientEdits]);
  useEffect(() => {
    if (!building) return;
    const timer = setInterval(() => demoService.advanceBuilds(), real ? 5000 : 700);
    return () => clearInterval(timer);
  }, [building, real]);
  const navigate = useCallback((page, appId = workspace.apps[0]?.appId, step = 0) => {
    const hash = page === 'builder' ? `#builder/${appId}/${STEP_PATHS[step]}` : `#${page}`;
    if (window.location.hash !== hash) window.location.hash = hash;
  }, [workspace.apps]);
  const run = async (label, callback) => {
    const token = ++actionId.current; setBusy(true); setMessage(null);
    try { const result = await callback(); if (token === actionId.current) setMessage({ text: result?.message || (real ? label.replaceAll(' · Demo.', '.').replaceAll(' · Demo', '').replaceAll('this demo build', 'this build') : label) }); return result; }
    catch (error) { if (token === actionId.current) setMessage({ text: error.message, error: true }); }
    finally { if (token === actionId.current) setBusy(false); }
  };
  const step = index => {
    try { demoService.setStep(app.appId, index); navigate('builder', app.appId, index); }
    catch (error) { setMessage({ text: error.message, error: true }); }
  };
  const publish = async () => {
    setPublishing(true);
    await run('Theme published · Demo. No mobile rebuild was requested.', () => demoService.publishTheme(app.appId));
    setPublishing(false);
  };
  return <RmsShell mode={demoService.mode} context={workspace.context} app={displayedApp} template={TEMPLATES.find(item => item.id === app?.templateId)}
    onBack={() => navigate('apps')} onSave={() => run('Draft saved · Demo.', () => demoService.saveDraft(app.appId))} onPublish={publish}
    onNavigate={page => navigate(page)} onPreview={screen => { setPreviewScreen(screen); if (route.page !== 'builder') navigate('builder'); }} saving={busy && !publishing} publishing={publishing}>
    {demoService.getStorageWarning() && <div className="global-note">{demoService.getStorageWarning()}</div>}
    {real && !workspace.loaded && <main className="editor-page"><h2>{workspace.loading ? 'Loading App Builder…' : 'Cannot load App Builder'}</h2><p className="muted">{workspace.error || 'Reading your retail-service workspace.'}</p>{!workspace.loading && <button className="btn btn-primary" onClick={() => demoService.initialize()}>Retry connection</button>}</main>}
    {real && workspace.loaded && workspace.meta?.storeAccounts?.verificationMode === 'MOCK' && <div className="global-note" role="status">Backend store verification is in MOCK mode. These results do not confirm live Google Play or Apple access.</div>}
    {workspace.pollError && <div className="global-note" role="alert">Build status refresh failed: {workspace.pollError}</div>}
    {(!real || workspace.loaded) && route.page === 'builder' && app && <AppBuilder key={app.appId} app={app} workspace={workspace} step={route.step} permissions={permissions} onStep={step} run={run} message={message} busy={busy} previewScreen={previewScreen} onPreview={setPreviewScreen} onBuilds={() => navigate('builds')} />}
    {(!real || workspace.loaded) && route.page === 'builder' && !app && <main className="editor-page"><h2>App not found</h2><p>This demo draft is unavailable. Choose an existing app or start another.</p><button className="btn btn-primary" onClick={() => navigate('apps')}>View app templates</button></main>}
    {(!real || workspace.loaded) && route.page === 'apps' && <Templates workspace={workspace} onOpen={(id, index) => navigate('builder', id, demoService.permissions(id).allowedSteps[index] ? index : 0)} onCreate={id => navigate('builder', demoService.createApp(id))} />}
    {(!real || workspace.loaded) && route.page === 'builds' && <><div className="dashboard-message">{message && <div className={`page-notice ${message.error ? 'error' : ''}`} role="status">{message.text}</div>}</div><Builds workspace={workspace} run={run} onApp={id => navigate('builder', id)} /></>}
  </RmsShell>;
}
