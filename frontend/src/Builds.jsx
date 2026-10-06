import { useEffect, useRef, useState } from 'react';
import { BuildPill, Icon } from './ui';
import { appBuilderService as demoService } from './appBuilderService';
import { BuildSummary } from './demo/BuildPanel';
import { formatDate } from './themeUtils';

function Details({ build, onClose, run }) {
  const dialog = useRef(null);
  useEffect(() => { const element = dialog.current; element.showModal(); return () => element.close(); }, []);
  return <dialog className="build-dialog" ref={dialog} onClose={() => { if (!dialog.current?.open) onClose(); }} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}>
    <div className="section-heading"><h2>Build details</h2><button className="icon-button" aria-label="Close build details" onClick={() => dialog.current.close()}><Icon name="x" /></button></div>
    <p className="muted">{build.appName}</p><BuildSummary build={build} onTest={id => run('Test acknowledged for this demo build.', async () => demoService.acknowledgeTest(id))} />
    <dl className="build-facts">{[['App ID', build.appId], ['Version code', build.versionCode], ['Created', formatDate(build.created)], ['Finished', formatDate(build.completedAt)], ['Mode', 'Demo · no installable artifact']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </dialog>;
}

export default function Builds({ workspace, run, onApp }) {
  const [filters, setFilters] = useState({ search: '', status: '', platform: '', environment: '', appId: '' });
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(null);
  const size = 10;
  const filtered = workspace.builds.filter(build => Object.entries(filters).every(([key, value]) => !value || (key === 'search' ? `${build.appName} ${build.buildId}`.toLowerCase().includes(value.toLowerCase()) : build[key] === value)));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / size) - 1));
  const rows = filtered.slice(currentPage * size, (currentPage + 1) * size);
  const build = workspace.builds.find(item => item.buildId === open);
  const update = (key, value) => { setFilters({ ...filters, [key]: value }); setPage(0); };
  return <main className="editor-page dashboard-page"><div className="section-heading"><div><h2>Builds</h2><p className="muted">Build history for your demo shopping apps.</p></div><span className="demo-badge">Demo</span></div>
    <div className="build-counts">{['TOTAL', 'QUEUED', 'BUILDING', 'SUCCESS', 'FAILED'].map(status => <button key={status} className={filters.status === status ? 'active' : ''} onClick={() => update('status', status === 'TOTAL' ? '' : filters.status === status ? '' : status)}><strong>{status === 'TOTAL' ? workspace.builds.length : workspace.builds.filter(item => item.status === status).length}</strong><span>{status === 'TOTAL' ? 'Total builds' : status === 'SUCCESS' ? 'Ready' : status.charAt(0) + status.slice(1).toLowerCase()}</span></button>)}</div>
    <section className="editor-card"><div className="build-filters"><label className="search-field"><Icon name="search" /><input aria-label="Search builds" placeholder="Search app or build ID" value={filters.search} onChange={event => update('search', event.target.value)} /></label>
      <select aria-label="Filter app" value={filters.appId} onChange={event => update('appId', event.target.value)}><option value="">All apps</option>{workspace.apps.map(app => <option key={app.appId} value={app.appId}>{app.appName}</option>)}</select>
      <select aria-label="Filter platform" value={filters.platform} onChange={event => update('platform', event.target.value)}><option value="">All platforms</option><option value="ANDROID">Android</option><option value="IOS">iOS</option></select>
      <select aria-label="Filter environment" value={filters.environment} onChange={event => update('environment', event.target.value)}><option value="">All environments</option>{['DEVELOPMENT', 'STAGE', 'PRODUCTION'].map(value => <option key={value}>{value}</option>)}</select>
      <button className="btn btn-secondary" onClick={() => run('Demo build statuses refreshed.', async () => demoService.advanceBuilds())}><Icon name="refresh" /> Refresh</button></div>
      {!rows.length ? <div className="empty-state"><Icon name="layers" size={36} /><h2>{workspace.builds.length ? 'No builds match your filters' : 'No builds yet'}</h2><p>{workspace.builds.length ? 'Try a different filter or search.' : 'Complete app setup, then create your first test build.'}</p><button className="btn btn-secondary" onClick={() => { if (workspace.builds.length) { setFilters({ search: '', status: '', platform: '', environment: '', appId: '' }); setPage(0); } else onApp(workspace.apps[0]?.appId); }}>{workspace.builds.length ? 'Clear filters' : 'Go to App Builder'}</button></div> : <div className="table-scroll"><table><thead><tr><th>App</th><th>Platform</th><th>Environment</th><th>Version</th><th>Status</th><th>Created</th><th>Details</th></tr></thead><tbody>{rows.map(item => <tr key={item.buildId}><td><strong>{item.appName}</strong><small>{item.buildId}</small></td><td>{item.platform === 'IOS' ? 'iOS' : 'Android'} · {item.artifactType}</td><td>{item.environment}</td><td>{item.versionName}<small>Code {item.versionCode}</small></td><td><BuildPill status={item.status} /></td><td>{formatDate(item.created)}</td><td><button className="icon-button" aria-label={`Open ${item.buildId}`} onClick={() => setOpen(item.buildId)}><Icon name="right" /></button></td></tr>)}</tbody></table></div>}
      {filtered.length > 0 && <footer className="pagination"><span>{filtered.length} builds · Page {currentPage + 1} of {Math.max(1, Math.ceil(filtered.length / size))}</span><div className="button-row"><button className="btn btn-secondary" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><button className="btn btn-secondary" disabled={(currentPage + 1) * size >= filtered.length} onClick={() => setPage(currentPage + 1)}>Next</button></div></footer>}
    </section>{build && <Details build={build} onClose={() => setOpen(null)} run={run} />}
  </main>;
}
