import { useCallback, useEffect, useState } from 'react';
import { api, formatDate } from './api';

const STORE_NAME = { GOOGLE_PLAY: 'Google Play', APPLE: 'Apple' };

function QueueItem({ item, staff, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

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

  return (
    <article>
      <div>
        <h2>{item.retailName} <small>({item.retailId})</small></h2>
        <p>{STORE_NAME[item.storeType]} · {item.connectionMethod === 'API_KEY' ? 'API key' : 'Invite'} ·
          {item.storeType === 'APPLE' ? ' Team ID ' : ' Developer ID '}<code>{item.developerAccountId || '—'}</code></p>
        <small>Waiting since {formatDate(item.lastCheckedAt)} · invite to accept from {item.accountLabel}</small>
        {item.lastError && <p className="error">{item.lastError}</p>}
        <label htmlFor={`reason-${item.retailId}-${item.storeType}`}>Problem for the merchant <small>(only for "Report problem")</small>
          <input id={`reason-${item.retailId}-${item.storeType}`} value={reason} placeholder="e.g. Invite not received. Please invite again with the Admin role."
            onChange={e => setReason(e.target.value)} />
        </label>
        {message && <p className={message.error ? 'error' : 'ok'}>{message.text}</p>}
      </div>
      <div className="actions">
        <span className={`badge ${item.status === 'FAILED' ? 'failed' : 'queued'}`}>{item.status === 'FAILED' ? 'Needs attention' : 'Waiting'}</span>
        <button disabled={busy} onClick={() => act('Access confirmed.', () => api.launchConfirm(item.retailId, item.storeType, staff))}>Confirm access</button>
        <button className="danger" disabled={busy || !reason.trim()} onClick={() => act('Problem sent to the merchant.', () => api.launchProblem(item.retailId, item.storeType, reason.trim(), staff))}>Report problem</button>
      </div>
    </article>
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

  return (
    <section className="builds">
      <div className="heading">
        <div>
          <h1>Launch Console</h1>
          <p>Pallet staff only. Accept the merchant's invite in Play Console or App Store Connect, check you can see their account, then confirm here.</p>
        </div>
        <button className="secondary" onClick={load}>Refresh</button>
      </div>
      {error && <p className="error">{error}</p>}
      {!items ? <p>Loading…</p> : !items.length ? <p>Nothing waiting. All merchant invites are handled.</p> : (
        <div className="list">
          {items.map(item => <QueueItem key={`${item.retailId}-${item.storeType}`} item={item} staff={user.id} onDone={load} />)}
        </div>
      )}
    </section>
  );
}
