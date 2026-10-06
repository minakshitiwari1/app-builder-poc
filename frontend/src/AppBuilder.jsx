import { useState } from 'react';
import StoreAccounts from './StoreAccounts';
import ThemeEditor from './ThemeEditor';
import Preview from './Preview';
import BuildPanel from './demo/BuildPanel';
import { appBuilderService as demoService } from './appBuilderService';
import { CONTEXT, STEPS, THEME_FIELDS, TEMPLATES } from './demo/metadata';
import { readImage } from './demo/validation';
import { themeFromFields } from './themeUtils';
import { Alert, Icon } from './ui';

function Branding({ app, run }) {
  const [busy, setBusy] = useState('');
  const choose = async (kind, file) => {
    if (!file) return;
    setBusy(kind);
    await run('Brand image selected and validated · Demo.', async () => { const asset = await readImage(file, kind); demoService.setAsset(app.appId, kind, asset); });
    setBusy('');
  };
  return <div className="stack"><h2>Brand assets</h2><p className="muted">PNG/JPEG, maximum 5 MB. Files stay in memory and must be selected again after refresh.</p>
    <div className="asset-list">{[['ICON', 'App icon', 'Square, 512–4096 px. Backend output would be 1024 px.', 'Choose app icon'], ['SPLASH', 'Splash screen artwork', 'Maximum 4096 px in either dimension.', 'Choose splash image']].map(([kind, title, hint, action]) => {
      const asset = app.assets[kind];
      return <div className="asset-row" key={kind}><div className={`asset-thumb ${kind === 'SPLASH' ? 'splash-thumb' : ''}`}>{asset ? <img src={asset.url} alt={`${title} selected`} /> : <span>{kind === 'ICON' ? 'No icon' : <>No<br />splash</>}</span>}</div>
        <div className="asset-description"><h3>{title}</h3><p className="muted">{hint}</p>{asset && <small>{asset.name} · {asset.width} × {asset.height} px</small>}
          <div className="button-row"><label className={`btn btn-secondary file-button ${busy ? 'disabled' : ''}`}>{busy === kind ? 'Validating…' : asset ? `Replace ${kind === 'ICON' ? 'app icon' : 'splash image'}` : action}<input type="file" aria-label={action} accept="image/png,image/jpeg" disabled={Boolean(busy)} onChange={event => { choose(kind, event.target.files?.[0]); event.target.value = ''; }} /></label>
            {asset && <button className="text-button" disabled={Boolean(busy)} onClick={() => demoService.setAsset(app.appId, kind, null)}>Remove</button>}</div>
        </div></div>;
    })}</div>
    <p className="info-note">Selecting an image runs demo validation; no image is uploaded or converted by a backend.</p>
  </div>;
}

export default function AppBuilder({ app, workspace, step, permissions, onStep, run, message, busy, previewScreen, onPreview, onBuilds }) {
  const template = TEMPLATES.find(item => item.id === app.templateId);
  const next = step + 1;
  const canContinue = step === 0 ? app.platforms.length > 0 : step < 6 && permissions.allowedSteps[next];
  const isLocked = !permissions.allowedSteps[step];
  const resetTheme = () => {
    if (!window.confirm('Reset the draft theme to template defaults?')) return;
    const theme = themeFromFields(THEME_FIELDS); theme.colors.brand = template.brand; theme.colors.accent = template.accent;
    demoService.setTheme(app.appId, theme);
  };
  return <main className="editor-page">
    {(step === 0 || step === 1) && <div className="editor-page-heading"><h2>App Builder</h2><p>{app.appName} · {STEPS[step]}</p><span className="demo-badge">Demo</span></div>}
    {message && <div className={`page-notice ${message.error ? 'error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</div>}
    <nav className="wizard-tabs" aria-label="App Builder steps">{STEPS.map((name, index) => <button key={name} className={index === step ? 'active' : ''} aria-current={index === step ? 'step' : undefined}
      disabled={!permissions.allowedSteps[index]} onClick={() => onStep(index)}><span>{String(index + 1).padStart(2, '0')} {name}</span>{!permissions.allowedSteps[index] && <Icon name="lock" size={13} />}</button>)}</nav>
    <div className="editor-columns"><section className="editor-card" aria-label={`${STEPS[step]} configuration`}>
      {isLocked ? <div className="stack"><h2>Complete the earlier steps</h2><Alert tone="warning">This step is locked. Connect selected accounts, save app details, add both brand images, and publish your theme as required.</Alert><button className="btn btn-secondary self-start" onClick={() => onStep(permissions.allowedSteps.findLastIndex(Boolean))}>Go to the next available step</button></div> : <>
        {step === 0 && <div className="stack"><h2>Choose your platforms</h2><p className="muted">Connect only the accounts for your selected platforms.</p>
          <div className="platform-choices">{[['ANDROID', 'Android', 'Android customers'], ['IOS', 'iOS', 'iPhone and iPad customers']].map(([platform, title, subtitle]) => <label key={platform} className={`platform-option ${app.platforms.includes(platform) ? 'selected' : ''}`}>
            <input type="checkbox" checked={app.platforms.includes(platform)} onChange={event => demoService.setPlatforms(app.appId, event.target.checked ? [...app.platforms, platform] : app.platforms.filter(item => item !== platform))} /><span><strong>{title}</strong><small>{subtitle}</small></span></label>)}</div>
          <p className="muted">App details unlock when all selected accounts are connected. Changing platforms keeps your saved accounts.</p>
          {!app.platforms.length && <Alert tone="warning">Select Android, iOS, or both to continue.</Alert>}
        </div>}
        {step === 1 && <StoreAccounts app={app} workspace={workspace} permissions={permissions} run={run} />}
        {step === 2 && <form className="stack" onSubmit={event => { event.preventDefault(); run('App details saved · Demo.', () => demoService.saveDetails(app.appId)); }}>
          <h2>App details</h2><p className="muted">These details are saved to this retailer’s demo workspace.</p>
          <label className="field" htmlFor="app-name"><span className="field-label">App name</span><input id="app-name" value={app.appName} maxLength={30} required onChange={event => demoService.updateDetails(app.appId, { appName: event.target.value })} /><small>{app.appName.length}/30 characters</small></label>
          <fieldset className="branch-choice"><legend>RMS branch</legend><label><input type="checkbox" checked={app.defaultBranchId === CONTEXT.branchId} onChange={event => demoService.updateDetails(app.appId, { defaultBranchId: event.target.checked ? CONTEXT.branchId : '' })} /><span>{CONTEXT.branchName} ·<br />{CONTEXT.branchId}</span></label></fieldset>
          <button className="btn btn-primary wide" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save app details'}</button>
          <details className="advanced-identity"><summary>Advanced · generated app identity</summary><dl><div><dt>Merchant key</dt><dd>{app.appName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourstore'}</dd></div><div><dt>Android package / iOS bundle</dt><dd>com.{app.appName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourstore'}</dd></div><div><dt>Identity</dt><dd>Illustrative generated IDs; final values come from your backend.</dd></div></dl></details>
        </form>}
        {step === 3 && <Branding app={app} run={run} />}
        {step === 4 && <div className="stack"><div className="section-heading"><h2>Theme</h2><span className="demo-badge">{app.themeDirty ? 'Unpublished edits' : app.themeVersion ? `Published v${app.themeVersion}` : 'Draft'}</span></div><p className="muted">Customize your storefront. Draft changes appear in the preview immediately.</p><ThemeEditor fields={THEME_FIELDS} theme={app.theme} onChange={theme => demoService.setTheme(app.appId, theme)} /><div className="button-row"><button className="btn btn-secondary" disabled={busy} onClick={() => run('Theme draft saved · Demo.', () => demoService.saveTheme(app.appId))}>Save theme draft</button><button className="btn btn-primary" disabled={busy} onClick={() => run('Theme published · Demo. No mobile rebuild was requested.', () => demoService.publishTheme(app.appId))}>Publish theme</button><button className="text-button" onClick={resetTheme}>Reset to defaults</button></div></div>}
        {(step === 5 || step === 6) && <BuildPanel key={`${app.appId}-${step}-${app.platforms.join(',')}`} app={app} workspace={workspace} permissions={permissions} production={step === 6} run={run} onBuilds={onBuilds} />}
      </>}
      <footer className="step-footer"><button className="btn btn-secondary" disabled={step === 0 || busy} onClick={() => onStep(step - 1)}><Icon name="arrowLeft" /> Back</button><p>Step {step + 1} of 7 · {permissions.connectedCount} of {app.platforms.length} selected platforms connected</p>
        {step < 6 ? <button className="btn btn-primary" disabled={!canContinue || busy} onClick={() => onStep(next)}>Continue <Icon name="right" /></button> : <button className="btn btn-primary" onClick={onBuilds}>View builds <Icon name="right" /></button>}</footer>
      {!canContinue && !isLocked && step < 6 && <p className="step-blocker">{step === 1 ? 'Connect every selected platform to continue.' : step === 2 ? 'Save your app details to continue.' : step === 3 ? 'Choose a valid app icon and splash image to continue.' : step === 4 ? 'Publish your theme to continue.' : step === 5 ? 'Validate a successful current test build for each selected platform to continue.' : 'Choose at least one platform.'}</p>}
    </section><Preview appName={app.appName} theme={app.theme} iconUrl={app.assets.ICON?.url} splashUrl={app.assets.SPLASH?.url} screen={previewScreen} onScreenChange={onPreview} /></div>
  </main>;
}
