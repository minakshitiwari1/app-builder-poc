import { useState } from 'react';
import { api, formatDate } from './api';

const STATUS = {
  NOT_CONNECTED: { label: 'Not connected', badge: 'saved' },
  INVITE_SENT: { label: 'Waiting for Pallet', badge: 'queued' },
  VERIFIED: { label: 'Access confirmed', badge: 'built' },
  FAILED: { label: 'Needs attention', badge: 'failed' },
  REVOKED: { label: 'Disconnected', badge: 'saved' },
};

const STEP_ICON = { DONE: '✓', TODO: '○', WAITING: '⏳', PROBLEM: '!', SKIPPED: '–' };
const STAGE = {
  SETUP: 'Set up your store accounts',
  INVITE_PALLET: 'Invite Pallet to your store accounts',
  WAITING_FOR_PALLET: 'Waiting for Pallet to confirm access',
  NEEDS_ATTENTION: 'Something needs your attention',
  READY: 'Ready to publish',
};

const copy = async (text, setMessage) => {
  try {
    await navigator.clipboard.writeText(text);
    setMessage({ text: 'Copied.' });
  } catch {
    setMessage({ text: 'Copy failed; select the text and copy it.', error: true });
  }
};

function InviteEmail({ email, role, missingHint, setMessage }) {
  return (
    <div className="invite-email">
      <small>Invite this account ({role})</small>
      <code>{email || missingHint}</code>
      {email && <button className="secondary" type="button" onClick={() => copy(email, setMessage)}>Copy</button>}
    </div>
  );
}

function StoreCard({ meta, account, retailId, user, onChanged }) {
  const google = account.storeType === 'GOOGLE_PLAY';
  const connected = ['INVITE_SENT', 'VERIFIED', 'FAILED'].includes(account.status);
  const [showForm, setShowForm] = useState(!connected);
  const [appleMethod, setAppleMethod] = useState(account.connectionMethod === 'API_KEY' ? 'key' : 'invite');
  const [form, setForm] = useState({
    file: null, developerAccountId: account.developerAccountId || '', invited: false,
    keyId: '', issuerId: '', teamId: account.storeType === 'APPLE' ? account.developerAccountId || '' : '',
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const store = meta.storeAccounts || {};
  const status = STATUS[account.status] || STATUS.NOT_CONNECTED;

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
    if (google || appleMethod === 'invite') {
      const id = google ? form.developerAccountId.trim() : form.teamId.trim();
      if (!id) {
        setMessage({ text: google ? 'Enter the developer account ID' : 'Enter the Team ID', error: true });
        return;
      }
      if (!form.invited) {
        setMessage({ text: 'Send the invite first, then tick the box', error: true });
        return;
      }
      act('Invite recorded. Pallet will accept it and confirm access.', () => (google
        ? api.connectGooglePlay(retailId, id, true, user)
        : api.connectAppleInvite(retailId, id, true, user)));
      return;
    }
    if (!form.file) {
      setMessage({ text: 'Choose the .p8 key file', error: true });
      return;
    }
    act('Key verified. Access confirmed.', () =>
      api.connectApple(retailId, { ...form, keyId: form.keyId.trim(), issuerId: form.issuerId.trim(), teamId: form.teamId.trim() }, user));
  };

  const id = key => `${account.storeType}-${key}`;
  const inviteChecked = (
    <label htmlFor={id('invited')} className="checkbox">
      <input id={id('invited')} type="checkbox" checked={form.invited} onChange={e => setForm({ ...form, invited: e.target.checked })} />
      I have sent the invite
    </label>
  );

  return (
    <article className="store-card">
      <div className="store-head">
        <div><h3>{google ? 'Google Play' : 'Apple App Store'}</h3><small>Needed to publish {google ? 'Android' : 'iOS'} apps</small></div>
        <span className={`badge ${status.badge}`}>{status.label}</span>
      </div>

      {account.status === 'INVITE_SENT' && (
        <p className="waiting-note">Pallet's launch team will accept your invite and confirm access, usually within one working day.
          You can create the app and run test builds meanwhile.</p>
      )}

      {connected && (
        <div className="facts store-facts">
          <p><b>{google ? 'Developer account ID' : 'Team ID'}</b>{account.developerAccountId || '—'}</p>
          <p><b>Connected by</b>{account.connectionMethod === 'API_KEY' ? 'API key' : 'Invite'}</p>
          {account.apiKeyStored && <p><b>API key</b>{account.keyId} (issuer {account.accountLabel})</p>}
          {account.connectionMethod !== 'API_KEY' && <p><b>Invited Pallet account</b>{account.accountLabel}</p>}
          {account.accessConfirmedAt && (
            <p><b>Access confirmed</b>{formatDate(account.accessConfirmedAt)} · {account.accessConfirmedBy === 'automatic-check' ? 'automatically' : `by ${account.accessConfirmedBy}`}</p>
          )}
          <p><b>Last checked</b>{formatDate(account.lastCheckedAt)}{account.verificationMode === 'MOCK' && ' (local test mode)'}</p>
        </div>
      )}
      {account.lastError && <p className="error">{account.lastError}</p>}

      {showForm ? (
        <div className="store-form">
          {!google && (
            <div className="segmented" role="tablist" aria-label="How to connect Apple">
              <button type="button" className={appleMethod === 'invite' ? 'selected' : ''} onClick={() => setAppleMethod('invite')}>Invite Pallet (recommended)</button>
              <button type="button" className={appleMethod === 'key' ? 'selected' : ''} onClick={() => setAppleMethod('key')}>Use an API key</button>
            </div>
          )}

          {google && (
            <>
              <ol>
                <li>Open Play Console &gt; <b>Users and permissions</b> &gt; <b>Invite new users</b>.</li>
                <li>Invite the account below with <b>{store.googlePlayInviteRole || 'Admin'}</b> permissions and send the invite.</li>
                <li>Copy your developer account ID from the Play Console URL: play.google.com/console/u/0/developers/<b>ID</b>/…</li>
              </ol>
              <InviteEmail email={store.googlePlayInviteEmail} role={store.googlePlayInviteRole || 'Admin'}
                missingHint="Not configured: set APP_BUILDER_GOOGLE_PLAY_KEY_FILE on retail-service" setMessage={setMessage} />
              <label htmlFor={id('developer')}>Developer account ID
                <input id={id('developer')} inputMode="numeric" value={form.developerAccountId} placeholder="4726473283492637482"
                  onChange={e => setForm({ ...form, developerAccountId: e.target.value })} />
              </label>
              {inviteChecked}
            </>
          )}

          {!google && appleMethod === 'invite' && (
            <>
              <ol>
                <li>Open App Store Connect &gt; <b>Users and Access</b> &gt; <b>+</b>.</li>
                <li>Invite the Apple ID below with the <b>Admin</b> role and tick <b>Certificates, Identifiers &amp; Profiles</b>.</li>
                <li>Copy your Team ID from developer.apple.com &gt; Account &gt; <b>Membership details</b>.</li>
              </ol>
              <InviteEmail email={store.appleInviteEmail} role={store.appleInviteRole || 'Admin'}
                missingHint="Not configured: set APP_BUILDER_APPLE_INVITE_EMAIL on retail-service" setMessage={setMessage} />
              <label htmlFor={id('team')}>Team ID
                <input id={id('team')} value={form.teamId} placeholder="A1B2C3D4E5" onChange={e => setForm({ ...form, teamId: e.target.value.toUpperCase() })} />
              </label>
              {inviteChecked}
            </>
          )}

          {!google && appleMethod === 'key' && (
            <>
              <ol>
                <li>App Store Connect &gt; Users and Access &gt; Integrations &gt; <b>Keys</b>: generate a key with the App Manager role.</li>
                <li>Download the .p8 file (Apple allows this only once) and note the Key ID and Issuer ID.</li>
              </ol>
              <div className="theme-grid">
                <label htmlFor={id('keyId')}>Key ID<input id={id('keyId')} value={form.keyId} placeholder="2X9R4HXF34" onChange={e => setForm({ ...form, keyId: e.target.value })} /></label>
                <label htmlFor={id('issuerId')}>Issuer ID<input id={id('issuerId')} value={form.issuerId} placeholder="57246542-96fe-1a63-e053-0824d011072a" onChange={e => setForm({ ...form, issuerId: e.target.value })} /></label>
                <label htmlFor={id('teamIdKey')}>Team ID <small>(optional)</small><input id={id('teamIdKey')} value={form.teamId} onChange={e => setForm({ ...form, teamId: e.target.value.toUpperCase() })} /></label>
              </div>
              <label htmlFor={id('file')}>
                Private key (.p8)
                <input id={id('file')} type="file" accept=".p8" onChange={e => setForm({ ...form, file: e.target.files[0] || null })} />
              </label>
            </>
          )}

          <div className="button-row">
            <button disabled={busy} onClick={connect}>{busy ? 'Saving…' : (google || appleMethod === 'invite') ? 'Done, I sent the invite' : 'Verify key and connect'}</button>
            {connected && <button className="secondary" onClick={() => setShowForm(false)}>Cancel</button>}
          </div>
        </div>
      ) : (
        <div className="button-row">
          {connected && (google || account.apiKeyStored) && (
            <button className="secondary" disabled={busy} onClick={() => act('Checked again.', () => api.reverifyStore(retailId, account.storeType, user))}>Verify again</button>
          )}
          <button className="secondary" onClick={() => setShowForm(true)}>{connected ? 'Change' : 'Connect'}</button>
          {connected && <button className="danger" disabled={busy} onClick={() => act('Disconnected.', () => api.disconnectStore(retailId, account.storeType, user))}>Disconnect</button>}
        </div>
      )}
      {message && <p className={message.error ? 'error' : 'ok'}>{message.text}</p>}
    </article>
  );
}

function Checklist({ onboarding, retailId, user, onChanged }) {
  const [answers, setAnswers] = useState({
    accountType: onboarding.accountType || '',
    wantsAndroid: onboarding.wantsAndroid,
    wantsIos: onboarding.wantsIos,
    googleAccountCreated: onboarding.googleAccountCreated,
    appleAccountCreated: onboarding.appleAccountCreated,
    dunsNumber: onboarding.dunsNumber || '',
  });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await api.updateOnboarding({ retailId, ...answers, accountType: answers.accountType || null }, user);
      setMessage({ text: 'Saved.' });
      onChanged();
    } catch (error) {
      setMessage({ text: error.message, error: true });
    } finally {
      setBusy(false);
    }
  };

  const tick = (key, label) => (
    <label htmlFor={`ob-${key}`} className="checkbox">
      <input id={`ob-${key}`} type="checkbox" checked={Boolean(answers[key])} onChange={e => setAnswers({ ...answers, [key]: e.target.checked })} />
      {label}
    </label>
  );
  const percent = onboarding.totalSteps ? Math.round((onboarding.completedSteps / onboarding.totalSteps) * 100) : 0;

  return (
    <div className="checklist">
      <div className="checklist-head">
        <div>
          <b>{STAGE[onboarding.stage] || onboarding.stage}</b>
          <small>{onboarding.completedSteps} of {onboarding.totalSteps} steps done</small>
        </div>
        <div className="progress" aria-label={`${percent}% complete`}><span style={{ width: `${percent}%` }} /></div>
      </div>
      <ol className="steps">
        {onboarding.steps.map(step => (
          <li key={step.key} className={`step-${step.status.toLowerCase()}`}>
            <span className="step-icon">{STEP_ICON[step.status]}</span>
            <span>{step.title}{step.detail && <small> · {step.detail}</small>}</span>
          </li>
        ))}
      </ol>
      {onboarding.warnings.map(warning => <p key={warning} className="gate-note">{warning}</p>)}

      <div className="checklist-form">
        <div>
          <b>Stores</b>
          {tick('wantsAndroid', 'Google Play (Android)')}
          {tick('wantsIos', 'App Store (iOS)')}
        </div>
        <div>
          <b>Account type</b>
          {['ORGANIZATION', 'INDIVIDUAL'].map(type => (
            <label key={type} htmlFor={`ob-type-${type}`} className="checkbox">
              <input id={`ob-type-${type}`} type="radio" name="accountType" checked={answers.accountType === type}
                onChange={() => setAnswers({ ...answers, accountType: type })} />
              {type === 'ORGANIZATION' ? 'Organization (recommended)' : 'Individual'}
            </label>
          ))}
        </div>
        <div>
          <b>Accounts created</b>
          {answers.wantsAndroid && tick('googleAccountCreated', 'Google Play Console account')}
          {answers.wantsIos && tick('appleAccountCreated', 'Apple Developer Program')}
          {answers.wantsIos && answers.accountType === 'ORGANIZATION' && (
            <label htmlFor="ob-duns">D-U-N-S number <small>(9 digits)</small>
              <input id="ob-duns" value={answers.dunsNumber} onChange={e => setAnswers({ ...answers, dunsNumber: e.target.value })} />
            </label>
          )}
        </div>
      </div>
      <div className="button-row">
        <button className="secondary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save checklist'}</button>
      </div>
      {message && <p className={message.error ? 'error' : 'ok'}>{message.text}</p>}
    </div>
  );
}

export default function StoreAccounts({ meta, retailId, user, accounts, onboarding, onChanged }) {
  const mock = meta.storeAccounts?.verificationMode === 'MOCK';
  const wanted = account => !onboarding || (account.storeType === 'GOOGLE_PLAY' ? onboarding.wantsAndroid : onboarding.wantsIos);
  return (
    <section className="store-accounts">
      <h2>0. Launch setup</h2>
      <p><small>
        Your app is published under your own Google Play and Apple developer accounts. You invite Pallet as a team member,
        Pallet confirms access, and then your app can go live. You can design the app and run test builds while you wait.
      </small></p>
      {mock && <p className="mock-note">Local test mode: nothing is checked with Google or Apple.</p>}
      {onboarding && <Checklist key={JSON.stringify(onboarding)} onboarding={onboarding} retailId={retailId} user={user} onChanged={onChanged} />}
      <div className="store-grid">
        {accounts.filter(wanted).map(account => (
          <StoreCard key={`${account.storeType}-${account.status}-${account.connectionMethod}`} meta={meta} account={account}
            retailId={retailId} user={user} onChanged={onChanged} />
        ))}
      </div>
    </section>
  );
}
