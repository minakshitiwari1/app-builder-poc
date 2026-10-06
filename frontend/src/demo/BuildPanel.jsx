import { useState } from 'react';
import { appBuilderService as demoService } from '../appBuilderService';
import { CONSOLE_URLS } from './metadata';
import { formatDate } from '../themeUtils';
import { Alert, BuildPill, Icon } from '../ui';

function downloadReport(build) {
  const report = JSON.stringify({ mode: 'demo', notice: 'Sample build report only. This is not an installable app or a store submission.', ...build }, null, 2);
  const url = URL.createObjectURL(new Blob([report], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${build.buildId}-demo-report.json`;
  // Keep the download within the active modal so native dialog inertness cannot block it.
  (document.querySelector('dialog[open]') || document.body).append(anchor);
  anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BuildSummary({ build, onTest, onRetry }) {
  return <article className="build-summary"><div className="section-heading"><h3>{build.platform === 'IOS' ? 'iOS' : 'Android'} · {build.versionName}</h3><BuildPill status={build.status} /></div>
    <small>{build.buildId} · {build.environment} · {build.artifactType} · {formatDate(build.created)}</small>
    <p>{build.statusMessage}</p>
    <div className="button-row">{build.status === 'SUCCESS' && <button className="btn btn-secondary" onClick={() => downloadReport(build)}><Icon name="download" /> Download demo report</button>}
      {build.status === 'SUCCESS' && build.environment !== 'PRODUCTION' && <button className={`btn ${build.tested ? 'btn-secondary' : 'btn-primary'}`} disabled={build.tested} onClick={() => onTest(build.buildId)}>{build.tested ? 'Test acknowledged' : 'I tested this build'}</button>}
      {build.status === 'FAILED' && onRetry && <button className="btn btn-secondary" onClick={() => onRetry(build)}>Retry as a new build</button>}
      {build.status === 'SUCCESS' && build.environment === 'PRODUCTION' && <a className="btn btn-primary" href={CONSOLE_URLS[build.platform]} target="_blank" rel="noreferrer">Open store console <Icon name="external" /></a>}
    </div>
  </article>;
}

export default function BuildPanel({ app, workspace, permissions, production, run, onBuilds }) {
  const [draft, setDraft] = useState({ platform: app.platforms[0], environment: 'STAGE', artifactType: app.platforms[0] === 'IOS' ? 'IPA' : 'APK', versionName: '1.0.0', outcome: 'happy' });
  const [busy, setBusy] = useState(false);
  const builds = workspace.builds.filter(build => build.appId === app.appId && (production ? build.environment === 'PRODUCTION' : build.environment !== 'PRODUCTION'));
  const create = async (body = draft) => {
    setBusy(true);
    await run(production ? 'Production build queued · Demo.' : 'Test build queued · Demo.', () => demoService.createBuild(app.appId, { ...body, environment: production ? 'PRODUCTION' : body.environment }));
    setBusy(false);
  };
  const checks = [
    ['Selected accounts connected and verified', permissions.allConnected], ['App details and branding completed', Boolean(app.detailsSaved && app.assets.ICON && app.assets.SPLASH)],
    ['Theme published with no unpublished edits', Boolean(app.publishedTheme && !app.themeDirty)], ['Current test builds validated for all selected platforms', permissions.testsReady],
    ['Store package access checked · Demo', app.productionAccessRevision === app.revision],
  ];
  return <div className="stack"><h2>{production ? 'Production checks' : 'Create a test build'}</h2><p className="muted">{production ? 'Complete every check before preparing your production build.' : 'Prepare a sample build, review its progress, then acknowledge your test.'}</p>
    {production && <><div className="production-checks">{checks.map(([label, ready]) => <div key={label}><span className={`readiness-dot ${ready ? 'ready' : ''}`}><Icon name={ready ? 'check' : 'clock'} size={16} /></span>{label}<span>{ready ? 'Ready' : 'Required'}</span></div>)}</div>
      <button className="btn btn-secondary self-start" disabled={busy || !permissions.allowedSteps[6]} onClick={async () => { setBusy(true); await run('Store access check passed · Demo. No Google or Apple request was made.', () => demoService.checkProductionAccess(app.appId)); setBusy(false); }}>Check store access</button>
      <Alert>Production build success means a build is ready. Upload through the store console; this demo does not publish an app to a store.</Alert></>}
    <div className="form-grid"><label className="field"><span className="field-label">Platform</span><select value={draft.platform} onChange={event => setDraft({ ...draft, platform: event.target.value, artifactType: event.target.value === 'IOS' ? 'IPA' : 'APK' })}>{app.platforms.map(platform => <option key={platform} value={platform}>{platform === 'IOS' ? 'iOS' : 'Android'}</option>)}</select></label>
      {!production && <label className="field"><span className="field-label">Environment</span><select value={draft.environment} onChange={event => setDraft({ ...draft, environment: event.target.value })}><option value="DEVELOPMENT">Development</option><option value="STAGE">Stage</option></select></label>}
      <label className="field"><span className="field-label">File type</span><select value={draft.artifactType} onChange={event => setDraft({ ...draft, artifactType: event.target.value })}>{(draft.platform === 'IOS' ? ['IPA'] : ['APK', 'AAB']).map(type => <option key={type}>{type}</option>)}</select></label>
      <label className="field"><span className="field-label">Version name</span><input value={draft.versionName} onChange={event => setDraft({ ...draft, versionName: event.target.value })} placeholder="1.0.0" /></label>
      <label className="field"><span className="field-label">Simulated build outcome</span><select value={draft.outcome} onChange={event => setDraft({ ...draft, outcome: event.target.value })}><option value="happy">Happy path</option><option value="failed">Build failed</option></select></label>
    </div>
    <div className="button-row"><button className="btn btn-primary" disabled={busy || (production ? !permissions.canProduce : !permissions.canBuild)} onClick={() => { if (!production || window.confirm('Prepare a demo production build? No app will be published.')) create(); }}>{busy ? 'Creating…' : production ? 'Create production build' : 'Create test build'}</button><button className="btn btn-secondary" onClick={onBuilds}>View all builds</button></div>
    {builds.map(build => <BuildSummary key={build.buildId} build={build} onTest={id => run('Test acknowledged for this demo build.', async () => demoService.acknowledgeTest(id))} onRetry={build => create({ ...build, outcome: draft.outcome })} />)}
    {!builds.length && <p className="empty-inline">No {production ? 'production' : 'test'} builds yet.</p>}
  </div>;
}
