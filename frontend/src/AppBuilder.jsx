import { useCallback, useEffect, useState } from 'react';
import { api, formatDate, themeFromFields } from './api';
import Preview from './Preview';
import StoreAccounts from './StoreAccounts';
import ThemeEditor from './ThemeEditor';

const STORE_FOR_PLATFORM = { ANDROID: 'GOOGLE_PLAY', IOS: 'APPLE' };
const STORE_NAME = { GOOGLE_PLAY: 'Google Play', APPLE: 'Apple' };

const NEW = 'new';
const emptyDetails = branchId => ({
  appName: '', merchantKey: '', androidPackageName: '', iosBundleId: '', deepLinkScheme: '', defaultBranchId: branchId,
});

// Same rules the backend enforces (from GET /meta), shown per field before saving.
const validateDetails = (details, meta, app) => {
  const errors = {};
  const reserved = (meta.reservedIdentifiers || []).map(value => value.toLowerCase());
  const locked = Boolean(app?.identityLocked);
  const check = (key, required = false) => {
    const value = (details[key] || '').trim();
    if (!value) {
      if (required) errors[key] = 'Required';
      return;
    }
    const rule = meta.identityRules[key];
    if (rule?.pattern && !new RegExp(rule.pattern).test(value)) {
      errors[key] = rule.description;
    } else if (reserved.includes(value.toLowerCase()) && value !== app?.[key]) {
      errors[key] = `"${value}" belongs to an existing app and cannot be used`;
    }
  };
  const name = (details.appName || '').trim();
  if (!name) errors.appName = 'Required';
  else if (name.length > 30) errors.appName = 'At most 30 characters';
  if (!locked) ['merchantKey', 'androidPackageName', 'iosBundleId'].forEach(key => check(key));
  check('deepLinkScheme');
  check('defaultBranchId', true);
  return errors;
};

function Status({ state }) {
  if (!state?.text) return null;
  return <p className={state.error ? 'error' : 'ok'}>{state.text}</p>;
}

export default function AppBuilder({ meta, settings, user, openBuilds }) {
  const [apps, setApps] = useState([]);
  const [appId, setAppId] = useState(NEW);
  const [app, setApp] = useState(null);
  const [details, setDetails] = useState(emptyDetails(settings.branchId));
  const [theme, setTheme] = useState(() => themeFromFields(meta.themeFields, null));
  const [release, setRelease] = useState({ platform: 'ANDROID', environment: 'STAGE', artifactType: 'AAB', versionName: '1.0.0' });
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState({});
  const [attempted, setAttempted] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [onboarding, setOnboarding] = useState(null);
  const [access, setAccess] = useState(null);

  const say = (section, text, error = false) => setStatus(current => ({ ...current, [section]: { text, error } }));

  const fetchLaunchSetup = useCallback(
    () => Promise.all([api.storeAccounts(settings.retailId), api.onboarding(settings.retailId)]),
    [settings.retailId]);

  const loadAccounts = useCallback(async () => {
    try {
      const [list, checklist] = await fetchLaunchSetup();
      setAccounts(list);
      setOnboarding(checklist);
    } catch (error) {
      say('apps', error.message, true);
    }
  }, [fetchLaunchSetup]);

  useEffect(() => {
    let active = true;
    fetchLaunchSetup()
      .then(([list, checklist]) => {
        if (!active) return;
        setAccounts(list);
        setOnboarding(checklist);
      })
      .catch(error => active && say('apps', error.message, true));
    return () => { active = false; };
  }, [fetchLaunchSetup]);

  // Industry-standard gates: create and test builds once Pallet is invited (or confirmed);
  // production only after access is confirmed.
  const gateOn = meta.storeAccounts?.required !== false;
  const statusOf = storeType => accounts.find(a => a.storeType === storeType)?.status;
  const connected = storeType => ['INVITE_SENT', 'VERIFIED'].includes(statusOf(storeType));
  const canCreate = !gateOn || accounts.some(a => ['INVITE_SENT', 'VERIFIED'].includes(a.status));
  const publishStore = STORE_FOR_PLATFORM[release.platform];
  const production = release.environment === 'PRODUCTION';
  const canPublish = !gateOn || (production ? statusOf(publishStore) === 'VERIFIED' : connected(publishStore));

  const loadApps = useCallback(async () => {
    try {
      setApps(await api.listApps(settings.retailId));
    } catch (error) {
      say('apps', error.message, true);
    }
  }, [settings.retailId]);

  useEffect(() => {
    let active = true;
    api.listApps(settings.retailId)
      .then(list => active && setApps(list))
      .catch(error => active && say('apps', error.message, true));
    return () => { active = false; };
  }, [settings.retailId]);

  const showApp = loaded => {
    setApp(loaded);
    setDetails({
      appName: loaded.appName, merchantKey: loaded.merchantKey, androidPackageName: loaded.androidPackageName,
      iosBundleId: loaded.iosBundleId, deepLinkScheme: loaded.deepLinkScheme, defaultBranchId: loaded.defaultBranchId,
    });
    setTheme(themeFromFields(meta.themeFields, loaded.theme));
  };

  const selectApp = async id => {
    setAppId(id);
    setStatus({});
    setAttempted(false);
    if (id === NEW) {
      setApp(null);
      setDetails(emptyDetails(settings.branchId));
      setTheme(themeFromFields(meta.themeFields, null));
      return;
    }
    try {
      showApp(await api.getApp(id));
    } catch (error) {
      say('apps', error.message, true);
    }
  };

  const run = async (section, label, action) => {
    setBusy(section);
    try {
      await action();
    } catch (error) {
      say(section, error.message, true);
    } finally {
      setBusy('');
    }
  };

  const detailErrors = validateDetails(details, meta, app);
  const hasDetailErrors = Object.keys(detailErrors).length > 0;

  const saveDetails = () => {
    setAttempted(true);
    if (hasDetailErrors) {
      say('details', 'Fix the highlighted fields first.', true);
      return;
    }
    submitDetails();
  };

  const submitDetails = () => run('details', 'Saving', async () => {
    const body = Object.fromEntries(Object.entries(details).map(([key, value]) => [key, value?.trim() ? value.trim() : null]));
    if (!app) {
      const created = await api.createApp({ ...body, retailId: settings.retailId }, user);
      showApp(created);
      setAppId(created.appId);
      await loadApps();
      say('details', `Created ${created.appId}. Next, upload the icon and splash screen.`);
    } else {
      const locked = app.identityLocked ? { merchantKey: null, androidPackageName: null, iosBundleId: null } : {};
      showApp(await api.updateApp(app.appId, { ...body, ...locked }, user));
      await loadApps();
      say('details', 'Details saved.');
    }
  });

  const upload = (assetType, file) => file && run(assetType, 'Uploading', async () => {
    showApp(await api.uploadAsset(app.appId, assetType, file, user));
    say(assetType, assetType === 'ICON' ? 'Icon uploaded (stored as 1024×1024 PNG).' : 'Splash screen uploaded.');
  });

  const saveTheme = () => run('theme', 'Saving', async () => {
    showApp(await api.saveTheme(app.appId, theme, user));
    say('theme', 'Draft saved. The app keeps the published theme until you publish.');
  });

  const publishTheme = () => run('theme', 'Publishing', async () => {
    await api.saveTheme(app.appId, theme, user);
    const published = await api.publishTheme(app.appId, user);
    showApp(await api.getApp(app.appId));
    say('theme', `Theme v${published.themeVersion} is live. Apps pick it up the next time they open.`);
  });

  const publishBuild = () => run('release', 'Publishing', async () => {
    const build = await api.createBuild(app.appId, release, user);
    showApp(await api.getApp(app.appId));
    say('release', `${build.buildId} created (${build.status}). ${build.statusMessage || ''}`);
  });

  const checkAccess = () => run('release', 'Checking', async () => {
    setAccess(await api.storeAccess(app.appId, release.platform));
  });

  const deleteApp = () => run('apps', 'Deleting', async () => {
    await api.deleteApp(app.appId, user);
    await loadApps();
    await selectApp(NEW);
    say('apps', 'App deleted.');
  });

  const locked = Boolean(app?.identityLocked);
  const artifactTypes = meta.enums.artifactTypes[release.platform];
  const field = (key, label, { disabled, placeholder, help } = {}) => {
    // Show a field's error once it has a value, or after a save attempt.
    const error = !disabled && (attempted || (details[key] || '').trim()) ? detailErrors[key] : null;
    return (
      <label htmlFor={`details-${key}`}>
        {label}
        <input id={`details-${key}`} value={details[key] ?? ''} disabled={disabled} placeholder={placeholder}
          className={error ? 'invalid' : ''} aria-invalid={Boolean(error)}
          onChange={e => setDetails({ ...details, [key]: e.target.value })} />
        {error ? <small className="field-error">{error}</small> : help && <small>{help}</small>}
      </label>
    );
  };

  return (
    <div className="builder">
      <section className="form">
        <div className="heading">
          <div>
            <h1>App Builder</h1>
            <p>Retail <code>{settings.retailId}</code></p>
          </div>
          <label htmlFor="app-picker" className="app-picker">
            App
            <select id="app-picker" value={appId} onChange={e => selectApp(e.target.value)}>
              <option value={NEW}>+ New app</option>
              {apps.map(item => <option key={item.appId} value={item.appId}>{item.appName} ({item.appId})</option>)}
            </select>
          </label>
        </div>
        <Status state={status.apps} />

        <StoreAccounts meta={meta} retailId={settings.retailId} user={user} accounts={accounts} onboarding={onboarding} onChanged={loadAccounts} />

        <h2>1. App details</h2>
        {!app && !canCreate && (
          <p className="gate-note">Invite Pallet to your Google Play or Apple account in step 0 before creating the app.</p>
        )}
        {field('appName', 'App name', { placeholder: 'Amma Store' })}
        {field('merchantKey', 'Merchant key', { disabled: locked, placeholder: 'Generated from the app name', help: meta.identityRules.merchantKey.description })}
        {field('androidPackageName', 'Android package name', { disabled: locked, placeholder: 'Defaults to com.{merchant key}', help: meta.identityRules.androidPackageName.description })}
        {field('iosBundleId', 'iOS bundle ID', { disabled: locked, placeholder: 'Defaults to com.{merchant key}', help: meta.identityRules.iosBundleId.description })}
        {field('deepLinkScheme', 'Deep link scheme', { placeholder: 'Defaults to merchant key', help: meta.identityRules.deepLinkScheme.description })}
        {field('defaultBranchId', 'Default store (branch ID)')}
        {locked && <small>Identity is locked because this app already has a build.</small>}
        <button disabled={busy === 'details' || (!app && !canCreate)} onClick={saveDetails}>{busy === 'details' ? 'Saving…' : app ? 'Save details' : 'Create app'}</button>
        <Status state={status.details} />

        <fieldset disabled={!app} className="step">
          <h2>2. Branding images</h2>
          {!app && <small>Create the app first.</small>}
          <label htmlFor="icon-file">
            App icon <small>square PNG/JPEG, {meta.assetRules.ICON.minPixels}–{meta.assetRules.ICON.maxPixels} px</small>
            <input id="icon-file" type="file" accept="image/png,image/jpeg" onChange={e => upload('ICON', e.target.files[0])} />
            {app?.iconUrl && <img className="thumb" src={app.iconUrl} alt="App icon" />}
          </label>
          <Status state={status.ICON} />
          <label htmlFor="splash-file">
            Splash screen <small>PNG/JPEG, up to {Math.round(meta.assetRules.SPLASH.maxBytes / 1048576)} MB</small>
            <input id="splash-file" type="file" accept="image/png,image/jpeg" onChange={e => upload('SPLASH', e.target.files[0])} />
            {app?.splashUrl && <img className="thumb splash-thumb" src={app.splashUrl} alt="Splash screen" />}
          </label>
          <Status state={status.SPLASH} />
        </fieldset>

        <fieldset disabled={!app} className="step">
          <h2>3. Theme</h2>
          <p><small>Theme changes go live without a new app release.</small></p>
          <ThemeEditor fields={meta.themeFields} theme={theme} onChange={setTheme} />
          <div className="button-row">
            <button className="secondary" disabled={busy === 'theme'} onClick={saveTheme}>Save draft</button>
            <button disabled={busy === 'theme'} onClick={publishTheme}>{busy === 'theme' ? 'Working…' : 'Publish theme'}</button>
          </div>
          {app?.themeUrl && (
            <small className="block">Live: v{app.themeVersion} · {formatDate(app.themePublishedAt)} · <a href={app.themeUrl} target="_blank" rel="noreferrer">theme file</a></small>
          )}
          <Status state={status.theme} />
        </fieldset>

        <fieldset disabled={!app} className="step">
          <h2>4. Publish app</h2>
          <p><small>Builds a new app version. Needed for a new icon, splash or app name.</small></p>
          <div className="theme-grid">
            <label htmlFor="release-platform">Platform
              <select id="release-platform" value={release.platform}
                onChange={e => setRelease({ ...release, platform: e.target.value, artifactType: meta.enums.artifactTypes[e.target.value][0] })}>
                {meta.enums.platforms.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label htmlFor="release-environment">Environment
              <select id="release-environment" value={release.environment} onChange={e => setRelease({ ...release, environment: e.target.value })}>
                {meta.enums.environments.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label htmlFor="release-artifact">File type
              <select id="release-artifact" value={release.artifactType} onChange={e => setRelease({ ...release, artifactType: e.target.value })}>
                {artifactTypes.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label htmlFor="release-version">Version name
              <input id="release-version" value={release.versionName} placeholder="1.0.0" onChange={e => setRelease({ ...release, versionName: e.target.value })} />
            </label>
          </div>
          {!canPublish && (
            <p className="gate-note">{production && connected(publishStore)
              ? `Production needs Pallet to confirm access to your ${STORE_NAME[publishStore]} account (step 0). Test builds (DEVELOPMENT, STAGE) work meanwhile.`
              : `Invite Pallet to your ${STORE_NAME[publishStore]} account first (step 0).`}</p>
          )}
          {release.environment === 'PRODUCTION' && canPublish && (
            <p><small>
              Production builds also need the app to exist in the merchant's {STORE_NAME[publishStore]} account
              ({release.platform === 'IOS' ? 'bundle ID' : 'package'} <code>{release.platform === 'IOS' ? app?.iosBundleId : app?.androidPackageName}</code>).
              Create it there first, then check below.
            </small></p>
          )}
          {access && access.platform === release.platform && (
            <p className={access.ready ? 'ok' : 'error'}>{access.ready ? '✓ ' : '✗ '}{access.message}</p>
          )}
          <div className="button-row">
            <button disabled={busy === 'release' || !canPublish} onClick={publishBuild}>{busy === 'release' ? 'Publishing…' : 'Publish'}</button>
            <button className="secondary" disabled={busy === 'release' || !canPublish} onClick={checkAccess}>Check store access</button>
            <button className="secondary" onClick={openBuilds}>View builds</button>
          </div>
          <Status state={status.release} />
        </fieldset>

        {app && (
          <div className="danger-zone">
            <button className="danger" disabled={busy === 'apps'} onClick={deleteApp}>Delete app</button>
            <small>Hides the app. Refused while a build is running.</small>
          </div>
        )}
      </section>
      <Preview appName={details.appName} theme={theme} iconUrl={app?.iconUrl} splashUrl={app?.splashUrl} />
    </div>
  );
}
