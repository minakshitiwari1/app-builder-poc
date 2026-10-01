import { useCallback, useEffect, useState } from 'react';
import { api, copyText, formatDate } from './api';
import { Alert, EmptyState, Icon, Pill, Spinner, StoreLogo } from './ui';

const STORE_NAME = { GOOGLE_PLAY: 'Google Play', APPLE: 'Apple' };

function QueueRow({ item, staff, onDone }) {
  const [reason, setReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const failed = item.status === 'FAILED';

  const act = async (label, action) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ text: label });
      onDone();
    } catch (error) {
      setMessage({ text: error.message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const reasonId = `reason-${item.retailId}-${item.storeType}`;
  return (
    <>
      <tr>
        <td><b>{item.retailName}</b><small className="mono">{item.retailId}</small></td>
        <td>
          <span className="with-logo"><StoreLogo storeType={item.storeType} size="sm" />{STORE_NAME[item.storeType]}</span>
          <small>{item.connectionMethod === 'API_KEY' ? 'API key' : 'Invite'}</small>
        </td>
        <td>
          <span className="copy-cell">
            <code>{item.developerAccountId || '—'}</code>
            {item.developerAccountId && (
              <button type="button" className="icon-button" aria-label="Copy ID" onClick={() => copyText(item.developerAccountId, setMessage)}><Icon name="copy" size={14} /></button>
            )}
          </span>
          <small>{item.storeType === 'APPLE' ? 'Team ID' : 'Developer ID'} · invite to {item.accountLabel}</small>
        </td>
        <td>{formatDate(item.lastCheckedAt)}</td>
        <td><Pill tone={failed ? 'danger' : 'warning'}>{failed ? 'Needs attention' : 'Waiting'}</Pill></td>
        <td>
          <div className="row-buttons">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act('Access confirmed.', () => api.launchConfirm(item.retailId, item.storeType, staff))}>
              <Icon name="check" size={14} /> Confirm
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} aria-expanded={reporting} onClick={() => setReporting(!reporting)}>Report problem</button>
          </div>
        </td>
      </tr>
      {(reporting || item.lastError || message) && (
        <tr className="row-detail">
          <td colSpan={6}>
            {item.lastError && <Alert tone="danger" title="Last problem sent">{item.lastError}</Alert>}
            {reporting && (
              <div className="report-form">
                <label htmlFor={reasonId} className="field">
                  <span className="field-label">What should the merchant fix?</span>
                  <input id={reasonId} value={reason} placeholder="e.g. Invite not received. Please invite again with the Admin role."
                    onChange={e => setReason(e.target.value)} />
                </label>
                <button type="button" className="btn btn-danger" disabled={busy || !reason.trim()}
                  onClick={() => act('Problem sent to the merchant.', () => api.launchProblem(item.retailId, item.storeType, reason.trim(), staff))}>
                  Send to merchant
                </button>
              </div>
            )}
            {message && <Alert tone={message.error ? 'danger' : 'success'}>{message.text}</Alert>}
          </td>
        </tr>
      )}
    </>
  );
}

/** Pallet staff: accept merchant invites in Play Console / App Store Connect, then confirm here. */
export default function LaunchConsole({ user }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setItems(await api.launchQueue());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.launchQueue().then(list => active && setItems(list)).catch(err => active && setError(err.message));
    return () => { active = false; };
  }, []);

  const waiting = items?.filter(item => item.status !== 'FAILED').length ?? '–';
  const attention = items?.filter(item => item.status === 'FAILED').length ?? '–';

  return (
    <div className="page stack">
      <Alert tone="info" title="How to confirm access">
        Accept the merchant's invite in Play Console or App Store Connect, check you can see their account, then press <b>Confirm</b>.
        If something is wrong, use <b>Report problem</b> and tell the merchant what to fix.
      </Alert>
      <div className="stat-grid three">
        <div className="stat stat-warning"><span className="stat-icon"><Icon name="clock" /></span><span><b>{waiting}</b><small>Waiting</small></span></div>
        <div className="stat stat-danger"><span className="stat-icon"><Icon name="alert" /></span><span><b>{attention}</b><small>Needs attention</small></span></div>
        <div className="stat stat-neutral"><span className="stat-icon"><Icon name="user" /></span><span><b>{user.name}</b><small>Signed in as staff</small></span></div>
      </div>
      <section className="card">
        <div className="toolbar">
          <b className="toolbar-title">Access queue</b>
          <button type="button" className="btn btn-secondary" onClick={load}><Icon name="refresh" size={16} /> Refresh</button>
        </div>
        {error && <Alert tone="danger">{error}</Alert>}
        {!items ? <div className="pad"><Spinner /></div> : !items.length ? (
          <EmptyState icon="shield" title="Nothing waiting">All merchant invites are handled.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table static">
              <thead><tr><th>Merchant</th><th>Store</th><th>Account</th><th>Waiting since</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map(item => <QueueRow key={`${item.retailId}-${item.storeType}`} item={item} staff={user.id} onDone={load} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
