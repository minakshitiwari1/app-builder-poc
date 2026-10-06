import { useState } from 'react';
import { appBuilderService as service } from '../appBuilderService';
import { CONSOLE_URLS, PLATFORM_NAMES, SIGNUP_URLS } from '../demo/metadata';
import { copyText } from '../themeUtils';
import { Alert, Icon } from '../ui';

// Prefer the structured invitation metadata supplied by retail-service. Checklist
// detail is a fallback for older servers; never substitute demo credentials.
function invitation(workspace, platform) {
  const prefix = platform === 'ANDROID' ? 'GOOGLE' : 'APPLE';
  const step = workspace.onboarding?.steps?.find(item => item.key === `${prefix}_INVITE`);
  const detail = step?.detail || '';
  const config = workspace.meta?.storeAccounts || {};
  const email = config[platform === 'ANDROID' ? 'googlePlayInviteEmail' : 'appleInviteEmail'] || step?.email || detail.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  return { email, detail, role: config[platform === 'ANDROID' ? 'googlePlayInviteRole' : 'appleInviteRole'] || step?.role || (platform === 'ANDROID' ? 'Release manager / publishing permissions for this app' : 'Admin with Certificates, Identifiers & Profiles access') };
}
function Account({ platform, workspace, run }) {
  const account = workspace.accounts[platform];
  const [busy, setBusy] = useState(false);
  const [granted, setGranted] = useState(false);
  const [notice, setNotice] = useState(null);
  const google = platform === 'ANDROID';
  const invite = invitation(workspace, platform);
  const pending = account.status === 'INVITE_SENT';
  const verified = account.status === 'VERIFIED';
  const mock = (account.verificationMode || workspace.meta?.storeAccounts?.verificationMode) === 'MOCK';
  const act = async callback => { setBusy(true); setNotice(null); try { const result = await callback(); setNotice({ text: result?.message || 'Backend status refreshed.' }); } catch (error) { setNotice({ error: true, text: error.message }); } finally { setBusy(false); } };
  return <article className="account-card"><header className="section-heading"><h3>{PLATFORM_NAMES[platform]}</h3><span className="demo-badge">{account.status.replaceAll('_', ' ')}{mock ? ' · MOCK' : ''}</span></header>
    {verified ? <div className="account-confirmed"><p>{mock ? 'Backend verification passed in MOCK mode. Live Google/Apple access has not been confirmed.' : 'Access verified by the backend.'}</p><strong>{google ? 'Developer account ID' : 'Apple Team ID'}: {account.developerAccountId}</strong>{account.accountLabel && <small>{account.accountLabel}</small>}</div> : <div className="stack">
      <fieldset className="account-question"><legend>Do you already have a developer account?</legend><div className="button-row">{[true, false].map(value => <label className="check" key={String(value)}><input type="radio" name={`live-account-${platform}`} disabled={busy || pending} checked={account.hasAccount === value} onChange={() => act(() => service.setAccountAnswer(platform, value))} />{value ? 'Yes, I have an account' : 'No, create an account'}</label>)}</div></fieldset>
      {account.hasAccount === false && <div className="signup-guide"><h4>Create your developer account</h4><p>Complete enrollment on the official website, then return with your {google ? 'developer account ID' : 'Apple Team ID'}.</p><div className="button-row"><a className="btn btn-primary" href={SIGNUP_URLS[platform]} target="_blank" rel="noreferrer">Create {google ? 'Google Play' : 'Apple Developer'} account <Icon name="external" /></a><button className="btn btn-secondary" disabled={busy} onClick={() => act(() => service.setAccountAnswer(platform, true))}>I have created my account</button></div></div>}
      {(account.hasAccount === true || pending) && <><label className="field" htmlFor={`account-id-${platform}`}><span className="field-label">{google ? 'Developer account ID' : 'Apple Team ID'}</span><input id={`account-id-${platform}`} disabled={busy || pending} value={account.developerAccountId} placeholder={google ? 'Developer ID or Play Console URL' : 'ABCDE12345'} onChange={event => { service.updateAccountId(platform, event.target.value); setGranted(false); setNotice(null); }} /><small>{google ? 'Copy the /developers/ ID from your Play Console URL.' : 'Find the 10-character Team ID under Apple Developer → Membership details.'}</small></label>
        {!pending && <button className="btn btn-secondary self-start" disabled={busy || !account.developerAccountId.trim()} onClick={() => act(() => service.checkAccount(platform, account.developerAccountId))}>{busy ? 'Checking…' : 'Validate ID format'}</button>}
        {(account.checkStatus === 'FORMAT_VALID' || pending) && <div className="access-guide"><h4>Give Pallet access to your account</h4><p>Invite the account provided by your backend so your app team can prepare releases.</p>
          {invite.detail && <p>{invite.detail}</p>}
          {invite.email ? <><ol><li>Open {google ? 'Play Console → Users and permissions.' : 'App Store Connect → Users and Access.'}</li><li>Invite <strong>{invite.email}</strong> with <strong>{invite.role}</strong>.</li><li>Send the invitation and return here.</li></ol><div className="invite-copy"><code>{invite.email}</code><button className="btn btn-secondary" onClick={() => copyText(invite.email, setNotice)}><Icon name="copy" /> Copy email</button></div></> : <Alert tone="warning">The backend did not provide an invitation email. Contact your backend team to configure the Pallet invitation account, then refresh status.</Alert>}
          <a className="btn btn-secondary self-start" href={CONSOLE_URLS[platform]} target="_blank" rel="noreferrer">Open {google ? 'Play Console' : 'App Store Connect'} <Icon name="external" /></a>
          {!pending && <><label className="check"><input type="checkbox" disabled={!invite.email || busy} checked={granted} onChange={event => setGranted(event.target.checked)} />I have sent the invitation and granted the required access</label><button className="btn btn-primary self-start" disabled={busy || !granted || !invite.email} onClick={() => act(() => service.connectAccount(platform, null, granted))}>{busy ? 'Connecting…' : 'Connect'}</button></>}
        </div>}
      </>}
      {pending && <Alert tone="warning">Invitation submitted. Pallet must confirm access before this platform is connected. Refresh status after confirmation; clicking Connect again does not grant access.</Alert>}
      {['FAILED', 'REVOKED'].includes(account.status) && <Alert tone="warning">{account.lastError || 'Access is unavailable. Review the invitation permissions and reconnect.'}</Alert>}
    </div>}
    {notice && <Alert tone={notice.error ? 'danger' : 'info'}>{notice.text}</Alert>}
    <div className="button-row"><button className="btn btn-secondary" disabled={busy} onClick={() => act(() => service.reverifyAccount(platform))}>{busy ? 'Refreshing…' : 'Refresh status'}</button>
      {(verified || pending) && <button className="text-button" disabled={busy} onClick={() => { if (window.confirm('Disconnect this store account? This affects every app under this retailer.')) run('Store account disconnected.', () => service.resetAccount(platform)); }}>Disconnect account</button>}</div>
  </article>;
}
export default function LiveAccounts({ app, workspace, permissions, run }) {
  const onboarding = workspace.onboarding;
  return <div className="stack"><h2>Your developer accounts</h2><p className="muted">{permissions.connectedCount} of {app.platforms.length} selected platforms verified.</p>
    <Alert>The current backend supports invitation-based connection. ID format validation does not verify account existence or grant publishing access.</Alert>
    <label className="field"><span className="field-label">Developer account type</span><select value={onboarding?.accountType || ''} onChange={event => run('Account type saved.', () => service.updateOnboardingAnswers({ accountType: event.target.value }))}><option value="" disabled>Choose account type</option><option value="ORGANIZATION">Organization</option><option value="INDIVIDUAL">Individual</option></select></label>
    {onboarding?.warnings?.map((warning, index) => <Alert tone="warning" key={index}>{typeof warning === 'string' ? warning : warning.message || warning.detail}</Alert>)}
    {app.platforms.map(platform => <Account key={platform} platform={platform} workspace={workspace} run={run} />)}
  </div>;
}
