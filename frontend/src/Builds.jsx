import { useCallback, useEffect, useState } from 'react';
import { api, canSimulateCi, formatDate } from './api';

const BADGE = { QUEUED: 'queued', BUILDING: 'building', SUCCESS: 'built', FAILED: 'failed' };

function Badge({ status }) {
  return <span className={`badge ${BADGE[status] || 'saved'}`}>{status}</span>;
}

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
    return () => { active = false; };
  }, [buildId]);

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

  if (!build) return null;
  const done = build.status === 'SUCCESS' || build.status === 'FAILED';

  return (
    <div className="backdrop" onClick={close}>
      <section className="modal" onClick={e => e.stopPropagation()}>
        <button className="x secondary" onClick={close} aria-label="Close">×</button>
        <h1>{build.appName}</h1>
        <p><code>{build.buildId}</code> <Badge status={build.status} /></p>
        <div className="facts">
          {[['Platform', build.platform], ['Environment', build.environment], ['File type', build.artifactType],
            ['Version', `${build.versionName} (${build.versionCode})`], ['Merchant key', build.merchantKey], ['Created by', build.createdBy],
            ['Created', formatDate(build.created)], ['Started', formatDate(build.triggeredAt)], ['Finished', formatDate(build.completedAt)]]
            .map(([label, value]) => <p key={label}><b>{label}</b>{value}</p>)}
        </div>
        {build.statusMessage && <p className={build.status === 'FAILED' ? 'error' : ''}>{build.statusMessage}</p>}
        {build.artifactUrl && <p><a href={build.artifactUrl} target="_blank" rel="noreferrer">Download app file</a></p>}
        {build.githubRunUrl && <p><a href={build.githubRunUrl} target="_blank" rel="noreferrer">GitHub run {build.githubRunId}</a></p>}

        <div className="button-row">
          {build.status === 'QUEUED' && (
            <button onClick={() => act('GitHub trigger retried.', () => api.retryDispatch(build.buildId))}>Retry GitHub trigger</button>
          )}
        </div>

        {canSimulateCi && (
          <div className="simulate">
            <h2>Local testing: act as GitHub Actions</h2>
            <small>Uses VITE_CI_TOKEN. Only for local testing.</small>
            <div className="button-row">
              <button className="secondary" disabled={done} onClick={() => act('Loaded the config CI would receive.', async () => setConfig(await api.ciConfig(build.buildId)))}>Show build config</button>
              <button className="secondary" disabled={done} onClick={() => act('Marked BUILDING.', () => api.ciStatus(build.buildId, { status: 'BUILDING', githubRunId: 'local-test', message: 'Simulated from App Builder UI' }))}>Mark BUILDING</button>
              <button disabled={done} onClick={() => act('Marked SUCCESS.', () => api.ciStatus(build.buildId, { status: 'SUCCESS', artifactUrl: `https://example.com/local-test/${build.buildId}.${build.artifactType.toLowerCase()}`, message: 'Simulated success' }))}>Mark SUCCESS</button>
              <button className="danger" disabled={done} onClick={() => act('Marked FAILED.', () => api.ciStatus(build.buildId, { status: 'FAILED', message: 'Simulated failure' }))}>Mark FAILED</button>
            </div>
            {config && <pre>{JSON.stringify(config, null, 2)}</pre>}
          </div>
        )}
        {message && <p className={message.error ? 'error' : 'ok'}>{message.text}</p>}
      </section>
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

  const select = (key, label, values) => (
    <select aria-label={label} value={filters[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })}>
      <option value="">All {label}</option>
      {values.map(value => <option key={value}>{value}</option>)}
    </select>
  );

  const builds = data?.builds.content ?? [];
  return (
    <section className="builds">
      <div className="heading">
        <div><h1>Builds</h1><p>Retail <code>{settings.retailId}</code> · refreshes every 8 seconds</p></div>
        <button className="secondary" onClick={load}>Refresh</button>
      </div>
      <div className="counts">
        {['TOTAL', 'QUEUED', 'BUILDING', 'SUCCESS', 'FAILED'].map(key => (
          <div key={key}><b>{data?.counts[key] ?? '–'}</b><small>{key === 'TOTAL' ? 'Total builds' : key}</small></div>
        ))}
      </div>
      <div className="filters filters-4">
        <input placeholder="Search build ID, app name or merchant key" value={filters.search}
          onChange={e => setFilters({ ...filters, search: e.target.value })} />
        {select('status', 'statuses', meta.enums.buildStatuses)}
        {select('environment', 'environments', meta.enums.environments)}
        {select('platform', 'platforms', meta.enums.platforms)}
      </div>
      {error && <p className="error">{error}</p>}
      {!data ? <p>Loading builds…</p> : !builds.length ? <p>No builds match.</p> : (
        <div className="list">
          {builds.map(build => (
            <article key={build.buildId}>
              <div>
                <h2>{build.appName}</h2>
                <p>{build.platform} · {build.environment} · {build.artifactType} · v{build.versionName} ({build.versionCode})</p>
                <code>{build.buildId}</code>
                <small>Created {formatDate(build.created)} · Finished {formatDate(build.completedAt)}</small>
              </div>
              <div className="actions">
                <Badge status={build.status} />
                <button className="secondary" onClick={() => setOpen(build.buildId)}>View details</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {open && <BuildDetails buildId={open} close={() => setOpen(null)} refresh={load} />}
    </section>
  );
}
