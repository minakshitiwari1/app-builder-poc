import { useState } from 'react';
import { api, formatDate } from './api';

const STORES = {
  GOOGLE_PLAY: {
    title: 'Google Play',
    platform: 'Android',
    steps: [
      'Create a Google Play Console developer account ($25 once).',
      'In Play Console > Users and permissions > Invite new users, invite the email below with Release manager access.',
      'Copy your developer account ID from the Play Console URL: play.google.com/console/u/0/developers/<ID>/…',
      'Enter it here and confirm the invite. No key file is needed.',
    ],
  },
  APPLE: {
    title: 'Apple App Store',
    platform: 'iOS',
    steps: [
      'Enroll in the Apple Developer Program ($99/year).',
      'In App Store Connect > Users and Access > Integrations > Keys, generate a key with the App Manager role.',
      'Download the .p8 file (Apple allows this only once) and note the Key ID and Issuer ID.',
      'Enter them here and upload the .p8 file.',
    ],
  },
};

const BADGE = { VERIFIED: 'built', FAILED: 'failed', REVOKED: 'saved', NOT_CONNECTED: 'saved' };

function StoreCard({ meta, account, retailId, user, onChanged }) {
  const store = STORES[account.storeType];
  const google = account.storeType === 'GOOGLE_PLAY';
  const inviteEmail = meta.storeAccounts?.googlePlayInviteEmail;
  const connected = account.status === 'VERIFIED' || account.status === 'FAILED';
  const [showForm, setShowForm] = useState(!connected);
  const [form, setForm] = useState({
    file: null, developerAccountId: account.developerAccountId || '', invited: false, keyId: '', issuerId: '', teamId: '',
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const act = async (label, action) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ text: label });
      setShowForm(false);
      onChanged();
    } catch (error) {
      setMessage({ text: error.message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const connect = () => {
    if (google) {
      if (!form.developerAccountId.trim()) {
        setMessage({ text: 'Enter the developer account ID', error: true });
        return;
      }
      if (!form.invited) {
        setMessage({ text: `Invite ${inviteEmail || "Pallet's service account"} in Play Console first, then tick the box`, error: true });
        return;
      }
      act('Connected. Access to each app is confirmed when you check store access before publishing.',
        () => api.connectGooglePlay(retailId, form.developerAccountId.trim(), true, user));
      return;
    }
    if (!form.file) {
      setMessage({ text: 'Choose the .p8 key file', error: true });
      return;
    }
    act('Verified and connected.', () =>
      api.connectApple(retailId, { ...form, keyId: form.keyId.trim(), issuerId: form.issuerId.trim(), teamId: form.teamId.trim() }, user));
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(inviteEmail);
      setMessage({ text: 'Email copied.' });
    } catch {
      setMessage({ text: 'Copy failed; select the email and copy it.', error: true });
    }
  };

  const id = key => `${account.storeType}-${key}`;
  return (
    <article className="store-card">
      <div className="store-head">
        <div><h3>{store.title}</h3><small>Needed to publish {store.platform} apps</small></div>
        <span className={`badge ${BADGE[account.status]}`}>{account.status.replace('_', ' ')}</span>
      </div>

      {connected && (
        <div className="facts store-facts">
          {google ? (
            <>
              <p><b>Developer account</b>{account.developerAccountId}</p>
              <p><b>Invited Pallet account</b>{account.accountLabel}</p>
            </>
          ) : (
            <>
              <p><b>Issuer ID</b>{account.accountLabel}</p>
              <p><b>Key ID</b>{account.keyId}</p>
              <p><b>Team ID</b>{account.developerAccountId || '—'}</p>
            </>
          )}
          <p><b>Verified</b>{formatDate(account.verifiedAt)}{account.verificationMode === 'MOCK' && ' (format only)'}</p>
          <p><b>Last checked</b>{formatDate(account.lastCheckedAt)}</p>
        </div>
      )}
      {account.lastError && <p className="error">{account.lastError}</p>}

      {showForm ? (
        <div className="store-form">
          <ol>{store.steps.map(step => <li key={step}>{step}</li>)}</ol>
          {account.storeType === 'APPLE' && (
            <div className="theme-grid">
              <label htmlFor={id('keyId')}>Key ID<input id={id('keyId')} value={form.keyId} placeholder="2X9R4HXF34" onChange={e => setForm({ ...form, keyId: e.target.value })} /></label>
              <label htmlFor={id('issuerId')}>Issuer ID<input id={id('issuerId')} value={form.issuerId} placeholder="57246542-96fe-1a63-e053-0824d011072a" onChange={e => setForm({ ...form, issuerId: e.target.value })} /></label>
              <label htmlFor={id('teamId')}>Team ID <small>(optional)</small><input id={id('teamId')} value={form.teamId} onChange={e => setForm({ ...form, teamId: e.target.value })} /></label>
            </div>
          )}
          {google ? (
            <>
              <div className="invite-email">
                <small>Invite this email (Release manager)</small>
                <code>{inviteEmail || 'Not configured: set APP_BUILDER_GOOGLE_PLAY_KEY_FILE on retail-service'}</code>
                {inviteEmail && <button className="secondary" type="button" onClick={copyEmail}>Copy</button>}
              </div>
              <label htmlFor={id('developer')}>Developer account ID
                <input id={id('developer')} inputMode="numeric" value={form.developerAccountId} placeholder="4726473283492637482"
                  onChange={e => setForm({ ...form, developerAccountId: e.target.value })} />
              </label>
              <label htmlFor={id('invited')} className="checkbox">
                <input id={id('invited')} type="checkbox" checked={form.invited} onChange={e => setForm({ ...form, invited: e.target.checked })} />
                I have invited this email in Play Console
              </label>
            </>
          ) : (
            <label htmlFor={id('file')}>
              Private key (.p8)
              <input id={id('file')} type="file" accept=".p8" onChange={e => setForm({ ...form, file: e.target.files[0] || null })} />
            </label>
          )}
          <div className="button-row">
            <button disabled={busy} onClick={connect}>{busy ? 'Verifying…' : 'Verify and connect'}</button>
            {connected && <button className="secondary" onClick={() => setShowForm(false)}>Cancel</button>}
          </div>
        </div>
      ) : (
        <div className="button-row">
          {connected && <button className="secondary" disabled={busy} onClick={() => act('Checked again.', () => api.reverifyStore(retailId, account.storeType, user))}>Verify again</button>}
          <button className="secondary" onClick={() => setShowForm(true)}>{connected ? 'Replace key' : 'Connect'}</button>
          {connected && <button className="danger" disabled={busy} onClick={() => act('Disconnected. The stored key was deleted.', () => api.disconnectStore(retailId, account.storeType, user))}>Disconnect</button>}
        </div>
      )}
      {message && <p className={message.error ? 'error' : 'ok'}>{message.text}</p>}
    </article>
  );
}

export default function StoreAccounts({ meta, retailId, user, accounts, onChanged }) {
  const mock = meta.storeAccounts?.verificationMode === 'MOCK';
  return (
    <section className="store-accounts">
      <h2>0. Merchant store accounts</h2>
      <p><small>
        The app is published under the merchant's own Google Play and Apple accounts. For Google Play the merchant invites
        Pallet's account (no key needed). For Apple the merchant's API key is checked with Apple and kept in the secret store.
        {meta.storeAccounts?.required && ' An app can be created once one account is verified; each platform needs its own account to publish.'}
      </small></p>
      {mock && <p className="mock-note">Local test mode: keys are checked for the right format only, not with Google or Apple.</p>}
      <div className="store-grid">
        {accounts.map(account => (
          <StoreCard key={`${account.storeType}-${account.status}`} meta={meta} account={account} retailId={retailId} user={user} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}
