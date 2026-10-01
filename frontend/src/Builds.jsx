import { useCallback, useEffect, useState } from 'react';
import { api, canSimulateCi, formatDate } from './api';
import { Alert, BuildPill, EmptyState, Icon, Spinner, StoreLogo } from './ui';

const COUNTS = [
  ['TOTAL', 'Total builds', 'layers', 'neutral'],
  ['QUEUED', 'Queued', 'clock', 'warning'],
  ['BUILDING', 'Building', 'refresh', 'info'],
  ['SUCCESS', 'Ready', 'check', 'success'],
  ['FAILED', 'Failed', 'alert', 'danger'],
];
const LABELS = { IOS: 'iOS', AAB: 'AAB', APK: 'APK', IPA: 'IPA' };
const titleCase = value => (value ? LABELS[value] || value.charAt(0) + value.slice(1).toLowerCase() : '—');

function BuildDetails({ buildId, close, refresh }) {
  const [build, setBuild] = useState(null);
  const [config, setConfig] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      setBuild(await api.getBuild(buildId));
    } catch (error) {
      setMessage({ text: error.message, error: true });
    }
  }, [buildId]);

  useEffect(() => {
    let active = true;
    api.getBuild(buildId)
      .then(loaded => active && setBuild(loaded))
      .catch(error => active && setMessage({ text: error.message, error: true }));
    const onKey = event => event.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => {
      active = false;
      document.removeEventListener('keydown', onKey);
    };
  }, [buildId, close]);

  const act = async (label, action) => {
    try {
      await action();
      setMessage({ text: label });
      await load();
      refresh();
    } catch (error) {
      setMessage({ text: error.message, error: true });
    }
  };

  const done = build && (build.status === 'SUCCESS' || build.status === 'FAILED');

  return (
    <div className="drawer-backdrop" onClick={close}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Build details" onClick={e => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <small className="eyebrow">Build</small>
            <h2>{build?.appName || 'Loading…'}</h2>
            {build && <p><code>{build.buildId}</code> <BuildPill status={build.status} /></p>}
          </div>
          <button type="button" className="icon-button" onClick={close} aria-label="Close"><Icon name="x" /></button>
        </header>
        {!build && !message && <Spinner />}
        {build && (
          <div className="drawer-body stack">
            {build.statusMessage && <Alert tone={build.status === 'FAILED' ? 'danger' : 'info'}>{build.statusMessage}</Alert>}
            <dl className="facts">
              {[['Platform', titleCase(build.platform)], ['Release', titleCase(build.environment)], ['File type', build.artifactType],
                ['Version', `${build.versionName} (${build.versionCode})`], ['App ID', build.merchantKey], ['Created by', build.createdBy],
                ['Created', formatDate(build.created)], ['Started', formatDate(build.triggeredAt)], ['Finished', formatDate(build.completedAt)]]
                .map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}
            </dl>
            <div className="button-row">
              {build.artifactUrl && <a className="btn btn-primary" href={build.artifactUrl} target="_blank" rel="noreferrer"><Icon name="download" size={16} /> Download app file</a>}
              {build.githubRunUrl && <a className="btn btn-secondary" href={build.githubRunUrl} target="_blank" rel="noreferrer">GitHub run {build.githubRunId} <Icon name="external" size={14} /></a>}
              {build.status === 'QUEUED' && (
                <button type="button" className="btn btn-secondary" onClick={() => act('GitHub trigger retried.', () => api.retryDispatch(build.buildId))}>
                  <Icon name="refresh" size={16} /> Retry GitHub trigger
                </button>
              )}
            </div>

            {canSimulateCi && (
              <div className="simulate">
                <b>Local testing: act as GitHub Actions</b>
                <small>Uses VITE_CI_TOKEN. Only for local testing.</small>
                <div className="button-row">
                  <button type="button" className="btn btn-secondary btn-sm" disabled={done} onClick={() => act('Loaded the config CI would receive.', async () => setConfig(await api.ciConfig(build.buildId)))}>Show build config</button>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={done} onClick={() => act('Marked BUILDING.', () => api.ciStatus(build.buildId, { status: 'BUILDING', githubRunId: 'local-test', message: 'Simulated from App Builder UI' }))}>Mark building</button>
                  <button type="button" className="btn btn-primary btn-sm" disabled={done} onClick={() => act('Marked SUCCESS.', () => api.ciStatus(build.buildId, { status: 'SUCCESS', artifactUrl: `https://example.com/local-test/${build.buildId}.${build.artifactType.toLowerCase()}`, message: 'Simulated success' }))}>Mark success</button>
                  <button type="button" className="btn btn-danger btn-sm" disabled={done} onClick={() => act('Marked FAILED.', () => api.ciStatus(build.buildId, { status: 'FAILED', message: 'Simulated failure' }))}>Mark failed</button>
                </div>
                {config && <pre>{JSON.stringify(config, null, 2)}</pre>}
              </div>
            )}
          </div>
        )}
        {message && <Alert tone={message.error ? 'danger' : 'success'}>{message.text}</Alert>}
      </aside>
    </div>
  );
}

export default function Builds({ meta, settings }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '', environment: '', platform: '' });
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await api.dashboard({ retailId: settings.retailId, ...filters, page: 0, size: 50 }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [settings.retailId, filters]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]);

  const close = useCallback(() => setOpen(null), []);

  const select = (key, label, values) => (
    <select aria-label={label} value={filters[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })}>
      <option value="">All {label}</option>
      {values.map(value => <option key={value} value={value}>{titleCase(value)}</option>)}
    </select>
  );

  const builds = data?.builds.content ?? [];
  const filtered = Object.values(filters).some(Boolean);
  return (
    <div className="page stack">
      <div className="stat-grid">
        {COUNTS.map(([key, label, icon, tone]) => (
          <button type="button" key={key} className={`stat stat-${tone} ${filters.status === key ? 'active' : ''}`}
            onClick={() => setFilters({ ...filters, status: key === 'TOTAL' || filters.status === key ? '' : key })}>
            <span className="stat-icon"><Icon name={icon} size={18} /></span>
            <span><b>{data?.counts[key] ?? '–'}</b><small>{label}</small></span>
          </button>
        ))}
      </div>

      <section className="card">
        <div className="toolbar">
          <div className="search">
            <Icon name="search" size={16} />
            <input aria-label="Search builds" placeholder="Search build ID, app name or app ID" value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value })} />
          </div>
          {select('status', 'statuses', meta.enums.buildStatuses)}
          {select('environment', 'releases', meta.enums.environments)}
          {select('platform', 'platforms', meta.enums.platforms)}
          <button type="button" className="btn btn-secondary" onClick={load} title="Refreshes every 8 seconds"><Icon name="refresh" size={16} /> Refresh</button>
        </div>
        {error && <Alert tone="danger">{error}</Alert>}
        {!data ? <div className="pad"><Spinner label="Loading builds…" /></div> : !builds.length ? (
          <EmptyState icon="layers" title={filtered ? 'No builds match these filters' : 'No builds yet'}
            action={filtered && <button type="button" className="btn btn-secondary" onClick={() => setFilters({ search: '', status: '', environment: '', platform: '' })}>Clear filters</button>}>
            {filtered ? 'Try a different search or filter.' : 'Start a build from step 5 (Publish) in the App Builder.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>App</th><th>Platform</th><th>Release</th><th>Version</th><th>Status</th><th>Created</th><th aria-label="Open" /></tr>
              </thead>
              <tbody>
                {builds.map(build => (
                  <tr key={build.buildId} tabIndex={0} onClick={() => setOpen(build.buildId)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(build.buildId); } }}>
                    <td><b>{build.appName}</b><small className="mono">{build.buildId}</small></td>
                    <td><span className="with-logo"><StoreLogo storeType={build.platform} size="sm" />{titleCase(build.platform)} · {build.artifactType}</span></td>
                    <td>{titleCase(build.environment)}</td>
                    <td>{build.versionName}<small>code {build.versionCode}</small></td>
                    <td><BuildPill status={build.status} /></td>
                    <td>{formatDate(build.created)}</td>
                    <td className="row-action"><Icon name="right" size={16} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {open && <BuildDetails buildId={open} close={close} refresh={load} />}
    </div>
  );
}
