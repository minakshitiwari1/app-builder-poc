import { useState } from 'react';
import { api, copyText, formatDate } from './api';
import { Alert, Icon, Pill, StoreLogo } from './ui';

const STATUS = {
  NOT_CONNECTED: { label: 'Not connected', tone: 'neutral' },
  INVITE_SENT: { label: 'Waiting for Pallet', tone: 'warning' },
  VERIFIED: { label: 'Access confirmed', tone: 'success' },
  FAILED: { label: 'Needs attention', tone: 'danger' },
  REVOKED: { label: 'Disconnected', tone: 'neutral' },
};

const STEP_ICON = { DONE: <Icon name="check" size={13} />, TODO: '', WAITING: <Icon name="clock" size={13} />, PROBLEM: '!', SKIPPED: '–' };
const STAGE = {
  SETUP: ['Set up your store accounts', 'info'],
  INVITE_PALLET: ['Invite Pallet to your store accounts', 'info'],
  WAITING_FOR_PALLET: ['Waiting for Pallet to confirm access', 'warning'],
  NEEDS_ATTENTION: ['Something needs your attention', 'danger'],
  READY: ['Ready to publish', 'success'],
};

function InviteEmail({ email, role, missingHint, setMessage }) {
  return (
    <div className="invite-email">
      <span className="invite-label">Invite this account · {role}</span>
      <div className="invite-row">
        <code>{email || missingHint}</code>
        {email && (
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => copyText(email, setMessage)}>
            <Icon name="copy" size={14} /> Copy
          </button>
        )}
      </div>
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
    <label htmlFor={id('invited')} className="check">
      <input id={id('invited')} type="checkbox" checked={form.invited} onChange={e => setForm({ ...form, invited: e.target.checked })} />
      <span>I have sent the invite</span>
    </label>
  );

  return (
    <article className={`store-card status-${status.tone}`}>
      <div className="store-head">
        <StoreLogo storeType={account.storeType} />
        <div className="store-title"><h3>{google ? 'Google Play' : 'Apple App Store'}</h3><small>Needed to publish {google ? 'Android' : 'iOS'} apps</small></div>
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>

      {account.status === 'INVITE_SENT' && (
        <Alert tone="warning">Pallet's launch team will accept your invite and confirm access, usually within one working day.
          You can create the app and run test builds meanwhile.</Alert>
      )}

      {connected && (
        <dl className="facts single">
          <div><dt>{google ? 'Developer account ID' : 'Team ID'}</dt><dd>{account.developerAccountId || '—'}</dd></div>
          <div><dt>Connected by</dt><dd>{account.connectionMethod === 'API_KEY' ? 'API key' : 'Invite'}</dd></div>
          {account.apiKeyStored && <div><dt>API key</dt><dd>{account.keyId} (issuer {account.accountLabel})</dd></div>}
          {account.connectionMethod !== 'API_KEY' && <div><dt>Invited Pallet account</dt><dd>{account.accountLabel}</dd></div>}
          {account.accessConfirmedAt && (
            <div><dt>Access confirmed</dt><dd>{formatDate(account.accessConfirmedAt)} · {account.accessConfirmedBy === 'automatic-check' ? 'automatically' : `by ${account.accessConfirmedBy}`}</dd></div>
          )}
          <div><dt>Last checked</dt><dd>{formatDate(account.lastCheckedAt)}{account.verificationMode === 'MOCK' && ' (local test mode)'}</dd></div>
        </dl>
      )}
      {account.lastError && <Alert tone="danger">{account.lastError}</Alert>}

      {showForm ? (
        <div className="store-form">
          {!google && (
            <div className="segmented" role="tablist" aria-label="How to connect Apple">
              <button type="button" role="tab" aria-selected={appleMethod === 'invite'} className={appleMethod === 'invite' ? 'selected' : ''} onClick={() => setAppleMethod('invite')}>Invite Pallet (recommended)</button>
              <button type="button" role="tab" aria-selected={appleMethod === 'key'} className={appleMethod === 'key' ? 'selected' : ''} onClick={() => setAppleMethod('key')}>Use an API key</button>
            </div>
          )}

          {google && (
            <>
              <ol className="numbered">
                <li>Open Play Console &gt; <b>Users and permissions</b> &gt; <b>Invite new users</b>.</li>
                <li>Invite the account below with <b>{store.googlePlayInviteRole || 'Admin'}</b> permissions and send the invite.</li>
                <li>Copy your developer account ID from the Play Console URL: play.google.com/console/u/0/developers/<b>ID</b>/…</li>
              </ol>
              <InviteEmail email={store.googlePlayInviteEmail} role={store.googlePlayInviteRole || 'Admin'}
                missingHint="Not configured: set APP_BUILDER_GOOGLE_PLAY_KEY_FILE on retail-service" setMessage={setMessage} />
              <label htmlFor={id('developer')} className="field">
                <span className="field-label">Developer account ID</span>
                <input id={id('developer')} inputMode="numeric" value={form.developerAccountId} placeholder="4726473283492637482"
                  onChange={e => setForm({ ...form, developerAccountId: e.target.value })} />
              </label>
              {inviteChecked}
            </>
          )}

          {!google && appleMethod === 'invite' && (
            <>
              <ol className="numbered">
                <li>Open App Store Connect &gt; <b>Users and Access</b> &gt; <b>+</b>.</li>
                <li>Invite the Apple ID below with the <b>Admin</b> role and tick <b>Certificates, Identifiers &amp; Profiles</b>.</li>
                <li>Copy your Team ID from developer.apple.com &gt; Account &gt; <b>Membership details</b>.</li>
              </ol>
              <InviteEmail email={store.appleInviteEmail} role={store.appleInviteRole || 'Admin'}
                missingHint="Not configured: set APP_BUILDER_APPLE_INVITE_EMAIL on retail-service" setMessage={setMessage} />
              <label htmlFor={id('team')} className="field">
                <span className="field-label">Team ID</span>
                <input id={id('team')} value={form.teamId} placeholder="A1B2C3D4E5" onChange={e => setForm({ ...form, teamId: e.target.value.toUpperCase() })} />
              </label>
              {inviteChecked}
            </>
          )}

          {!google && appleMethod === 'key' && (
            <>
              <ol className="numbered">
                <li>App Store Connect &gt; Users and Access &gt; Integrations &gt; <b>Keys</b>: generate a key with the App Manager role.</li>
                <li>Download the .p8 file (Apple allows this only once) and note the Key ID and Issuer ID.</li>
              </ol>
              <div className="form-grid">
                <label htmlFor={id('keyId')} className="field"><span className="field-label">Key ID</span><input id={id('keyId')} value={form.keyId} placeholder="2X9R4HXF34" onChange={e => setForm({ ...form, keyId: e.target.value })} /></label>
                <label htmlFor={id('issuerId')} className="field"><span className="field-label">Issuer ID</span><input id={id('issuerId')} value={form.issuerId} placeholder="57246542-96fe-1a63-e053-0824d011072a" onChange={e => setForm({ ...form, issuerId: e.target.value })} /></label>
                <label htmlFor={id('teamIdKey')} className="field"><span className="field-label">Team ID <small>(optional)</small></span><input id={id('teamIdKey')} value={form.teamId} onChange={e => setForm({ ...form, teamId: e.target.value.toUpperCase() })} /></label>
                <label htmlFor={id('file')} className="field">
                  <span className="field-label">Private key (.p8)</span>
                  <input id={id('file')} type="file" accept=".p8" onChange={e => setForm({ ...form, file: e.target.files[0] || null })} />
                </label>
              </div>
            </>
          )}

          <div className="button-row">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={connect}>{busy ? 'Saving…' : (google || appleMethod === 'invite') ? 'Done, I sent the invite' : 'Verify key and connect'}</button>
            {connected && <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>}
          </div>
        </div>
      ) : (
        <div className="button-row">
          {connected && (google || account.apiKeyStored) && (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => act('Checked again.', () => api.reverifyStore(retailId, account.storeType, user))}>
              <Icon name="refresh" size={16} /> Verify again
            </button>
          )}
          <button type="button" className={`btn ${connected ? 'btn-secondary' : 'btn-primary'}`} onClick={() => setShowForm(true)}>{connected ? 'Change' : 'Connect'}</button>
          {connected && <button type="button" className="btn btn-danger-ghost" disabled={busy} onClick={() => act('Disconnected.', () => api.disconnectStore(retailId, account.storeType, user))}>Disconnect</button>}
        </div>
      )}
      {message && <Alert tone={message.error ? 'danger' : 'success'}>{message.text}</Alert>}
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
  const [editing, setEditing] = useState(!onboarding.accountType);

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
    <label htmlFor={`ob-${key}`} className="check">
      <input id={`ob-${key}`} type="checkbox" checked={Boolean(answers[key])} onChange={e => setAnswers({ ...answers, [key]: e.target.checked })} />
      <span>{label}</span>
    </label>
  );
  const percent = onboarding.totalSteps ? Math.round((onboarding.completedSteps / onboarding.totalSteps) * 100) : 0;
  const [stageLabel, stageTone] = STAGE[onboarding.stage] || [onboarding.stage, 'info'];

  return (
    <div className="checklist">
      <div className="checklist-head">
        <div className="ring" style={{ '--value': percent }} aria-label={`${percent}% complete`}><span>{percent}%</span></div>
        <div>
          <b>{stageLabel}</b>
          <small>{onboarding.completedSteps} of {onboarding.totalSteps} steps done</small>
        </div>
        <Pill tone={stageTone}>{onboarding.stage === 'READY' ? 'Ready' : onboarding.stage === 'WAITING_FOR_PALLET' ? 'Waiting' : onboarding.stage === 'NEEDS_ATTENTION' ? 'Action needed' : 'In progress'}</Pill>
      </div>
      <ol className="timeline">
        {onboarding.steps.map(step => (
          <li key={step.key} className={`tl-${step.status.toLowerCase()}`}>
            <span className="tl-dot">{STEP_ICON[step.status]}</span>
            <span className="tl-text"><b>{step.title}</b>{step.detail && <small>{step.detail}</small>}</span>
          </li>
        ))}
      </ol>
      {onboarding.warnings.map(warning => <Alert key={warning} tone="warning">{warning}</Alert>)}

      <div className="checklist-edit">
        <button type="button" className="disclosure" aria-expanded={editing} onClick={() => setEditing(!editing)}>
          <Icon name={editing ? 'down' : 'right'} size={16} /> Your answers
        </button>
        {editing && (
          <>
            <div className="checklist-form">
              <fieldset>
                <legend>Which stores?</legend>
                {tick('wantsAndroid', 'Google Play (Android)')}
                {tick('wantsIos', 'App Store (iOS)')}
              </fieldset>
              <fieldset>
                <legend>Account type</legend>
                {['ORGANIZATION', 'INDIVIDUAL'].map(type => (
                  <label key={type} htmlFor={`ob-type-${type}`} className="check">
                    <input id={`ob-type-${type}`} type="radio" name="accountType" checked={answers.accountType === type}
                      onChange={() => setAnswers({ ...answers, accountType: type })} />
                    <span>{type === 'ORGANIZATION' ? 'Organization (recommended)' : 'Individual'}</span>
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>Accounts created</legend>
                {answers.wantsAndroid && tick('googleAccountCreated', 'Google Play Console account')}
                {answers.wantsIos && tick('appleAccountCreated', 'Apple Developer Program')}
                {!answers.wantsAndroid && !answers.wantsIos && <small>Choose a store first.</small>}
                {answers.wantsIos && answers.accountType === 'ORGANIZATION' && (
                  <label htmlFor="ob-duns" className="field">
                    <span className="field-label">D-U-N-S number <small>(9 digits)</small></span>
                    <input id="ob-duns" inputMode="numeric" value={answers.dunsNumber} onChange={e => setAnswers({ ...answers, dunsNumber: e.target.value })} />
                  </label>
                )}
              </fieldset>
            </div>
            <div className="button-row">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save answers'}</button>
            </div>
          </>
        )}
        {message && <Alert tone={message.error ? 'danger' : 'success'}>{message.text}</Alert>}
      </div>
    </div>
  );
}

export default function StoreAccounts({ meta, retailId, user, accounts, onboarding, onChanged }) {
  const mock = meta.storeAccounts?.verificationMode === 'MOCK';
  const wanted = account => !onboarding || (account.storeType === 'GOOGLE_PLAY' ? onboarding.wantsAndroid : onboarding.wantsIos);
  const shown = accounts.filter(wanted);
  return (
    <section className="store-accounts stack">
      {mock && <Alert tone="info" title="Local test mode">Nothing is checked with Google or Apple.</Alert>}
      {onboarding && <Checklist key={JSON.stringify(onboarding)} onboarding={onboarding} retailId={retailId} user={user} onChanged={onChanged} />}
      <div className="store-grid">
        {shown.map(account => (
          <StoreCard key={`${account.storeType}-${account.status}-${account.connectionMethod}`} meta={meta} account={account}
            retailId={retailId} user={user} onChanged={onChanged} />
        ))}
      </div>
      {!shown.length && accounts.length > 0 && <Alert tone="info">Choose at least one store under “Your answers”.</Alert>}
    </section>
  );
}
