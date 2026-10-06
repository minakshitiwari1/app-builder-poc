import LiveAccounts from './services/LiveAccounts';
import { useState } from 'react';
import { copyText } from './themeUtils';
import { appBuilderService as demoService } from './appBuilderService';
import { CONSOLE_URLS, INVITE_DETAILS, PLATFORM_NAMES, SCENARIOS, SIGNUP_URLS } from './demo/metadata';
import { Alert, Icon } from './ui';

function AccountCard({ platform, account, run }) {
  const [scenario, setScenario] = useState('happy');
  const [granted, setGranted] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);
  const google = platform === 'ANDROID';
  const connected = account.status === 'VERIFIED';
  const confirmed = account.checkStatus === 'CONFIRMED';
  const invite = INVITE_DETAILS[platform];
  const act = async (kind, callback) => {
    setBusy(kind); setMessage(null);
    try { const result = await callback(); setMessage({ text: result?.message || 'Demo account updated.' }); }
    catch (error) { setMessage({ text: error.message, error: true }); }
    finally { setBusy(''); }
  };
  const changeId = value => { demoService.updateAccountId(platform, value); setGranted(false); setMessage(null); };
  const idField = (
    <label className="field" htmlFor={`account-id-${platform}`}>
      <span className="field-label">{google ? 'Developer account ID' : 'Apple Team ID'}</span>
      <input id={`account-id-${platform}`} value={account.developerAccountId} disabled={Boolean(busy)}
        placeholder={google ? 'Your developer ID or Play Console URL' : 'e.g. ABCDE12345'} onChange={event => changeId(event.target.value)} />
      {!connected && <small>{google ? 'Copy the ID from the /developers/ part of your Play Console URL.' : 'Find your Team ID in Apple Developer → Membership details.'}</small>}
    </label>
  );
  return (
    <article className="account-card">
      <header className="section-heading"><h3>{PLATFORM_NAMES[platform]}</h3><span className="demo-badge">{connected ? 'Connected' : account.status === 'INVITE_SENT' ? 'Pending' : 'Not connected'} · Demo</span></header>
      {connected ? (
        <div className="account-confirmed"><p>Connected and Verified · Demo mode. No live account access was performed. To use a different account, edit its ID and check again.</p>{idField}</div>
      ) : (
        <div className="stack">
          <fieldset className="account-question"><legend>Do you already have a developer account?</legend><div className="button-row">
            {[true, false].map(value => <label className="check" key={String(value)}><input type="radio" name={`has-account-${platform}`} checked={account.hasAccount === value}
              onChange={() => demoService.setAccountAnswer(platform, value)} />{value ? 'Yes, I have an account' : 'No, create an account'}</label>)}
          </div></fieldset>
          {account.hasAccount === false && <div className="signup-guide"><h4>Create your developer account</h4><p>Register on the official website, complete its enrollment steps, then return here with your account ID.</p>
            <div className="button-row"><a className="btn btn-primary" href={SIGNUP_URLS[platform]} target="_blank" rel="noreferrer">Create {google ? 'Google Play' : 'Apple Developer'} account <Icon name="external" /></a>
              <button className="btn btn-secondary" onClick={() => demoService.setAccountAnswer(platform, true)}>I have created my account</button></div></div>}
          {account.hasAccount === true && <>{idField}
            <button className="btn btn-secondary self-start" disabled={Boolean(busy) || !account.developerAccountId.trim()}
              onClick={() => act('check', () => demoService.checkAccount(platform, account.developerAccountId, scenario))}>{busy === 'check' ? 'Checking…' : 'Check Account'}</button>
            {confirmed && <div className="access-guide"><h4>Give Pallet access to your account</h4><p>One invitation lets your app team prepare releases under your own store account.</p>
              <ol><li>Open {google ? 'Play Console → Users and permissions → Invite new users.' : 'App Store Connect → Users and Access → Add user.'}</li>
                <li>Invite the email below with <strong>{invite.role}</strong>.</li><li>Send the invitation, return here, and connect.</li></ol>
              <div className="invite-copy"><code>{invite.email}</code><button className="btn btn-secondary" onClick={() => copyText(invite.email, setMessage)}><Icon name="copy" /> Copy email</button></div>
              <small>Demo invitation address. Your backend will supply the real account email when APIs are connected.</small>
              <a className="btn btn-secondary self-start" href={CONSOLE_URLS[platform]} target="_blank" rel="noreferrer">Open {google ? 'Play Console' : 'App Store Connect'} <Icon name="external" /></a>
              <label className="check"><input type="checkbox" checked={granted} onChange={event => setGranted(event.target.checked)} />I have sent the invitation and granted the required access</label>
              <button className="btn btn-primary self-start" disabled={Boolean(busy) || !granted}
                onClick={() => act('connect', () => demoService.connectAccount(platform, scenario, granted))}>{busy === 'connect' ? 'Connecting…' : account.status === 'INVITE_SENT' ? 'Check connection again' : 'Connect'}</button>
            </div>}
          </>}
          {account.lastError && !message && <Alert tone="danger">{account.lastError}</Alert>}
          {account.status === 'INVITE_SENT' && <Alert tone="warning">Confirmation is pending · Demo. Choose Happy path and check connection again to demonstrate verified access.</Alert>}
        </div>
      )}
      {message && <Alert tone={message.error ? 'danger' : 'success'}>{message.text}</Alert>}
      <div className="scenario-row"><label className="field" htmlFor={`scenario-${platform}`}><span className="field-label">Simulated outcome</span>
        <select id={`scenario-${platform}`} value={scenario} onChange={event => setScenario(event.target.value)}>{Object.entries(SCENARIOS).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
        <p className="info-note">Only affects simulated account checks and connections.</p></div>
      {connected && <button className="text-button" onClick={() => run('Account setup reset for this demo platform.', async () => demoService.resetAccount(platform))}>Try the account setup flow</button>}
    </article>
  );
}

export default function StoreAccounts({ app, workspace, permissions, run }) {
  if (demoService.mode === 'real') return <LiveAccounts app={app} workspace={workspace} permissions={permissions} run={run} />;
  return <div className="stack"><h2>Your developer accounts</h2><p className="muted">{permissions.connectedCount} of {app.platforms.length} selected platforms connected.</p>
    {!app.platforms.length && <Alert tone="warning">Choose at least one platform in step 1.</Alert>}
    {app.platforms.map(platform => <AccountCard key={platform} platform={platform} account={workspace.accounts[platform]} run={run} />)}
  </div>;
}
