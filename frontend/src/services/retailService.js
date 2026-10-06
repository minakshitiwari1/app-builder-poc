import { themeFromFields } from '../themeUtils.js';
import { validateDeveloperId, validateTheme } from '../demo/validation.js';
import { TEMPLATES } from '../demo/metadata.js';

const STORE_TYPES = { ANDROID: 'GOOGLE_PLAY', IOS: 'APPLE' };
const emptyAccount = platform => ({ platform, hasAccount: null, developerAccountId: '', status: 'NOT_CONNECTED', checkStatus: 'UNCHECKED' });
const stable = value => JSON.stringify(value, (_, entry) => entry && typeof entry === 'object' && !Array.isArray(entry) ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]])) : entry);
const fingerprint = app => stable([app.appName, app.defaultBranchId, app.platforms, app.theme, app.assets.ICON?.url, app.assets.SPLASH?.url]);
const list = value => Array.isArray(value) ? value : value?.content || [];

// Pure adapter factory: transport and context are injected, keeping live data out
// of the demo namespace and making backend responses testable without HTTP.
export function createRetailService({ api, context, user, storage, namespace = 'retail-service' }) {
  const storageKey = `rms-app-builder-real:v1:${namespace}:${context.retailId}:${user.id}`;
  let cache = { apps: [], buildRevisions: {}, acknowledgements: {} };
  let warning = '';
  try { const saved = JSON.parse(storage?.getItem(storageKey) || 'null'); if (saved?.version === 1) cache = saved; } catch { warning = 'Local draft progress could not be restored.'; }
  let state = { mode: 'real', loaded: false, loading: false, error: '', context, meta: null, defaultTheme: null, onboarding: null, branches: [], branchError: '', apps: [], builds: [], counts: {}, accounts: { ANDROID: emptyAccount('ANDROID'), IOS: emptyAccount('IOS') }, pollError: '' };
  const listeners = new Set();
  const locks = new Set();
  let initialization;
  let refreshVersion = 0;
  const emit = patch => {
    state = { ...state, ...patch };
    if (patch.builds && state.loaded) state.counts = Object.fromEntries(['TOTAL', 'QUEUED', 'BUILDING', 'SUCCESS', 'FAILED'].map(status => [status, status === 'TOTAL' ? state.builds.length : state.builds.filter(build => build.status === status).length]));
    try {
      if (state.loaded) storage?.setItem(storageKey, JSON.stringify({ version: 1, apps: state.apps, buildRevisions: cache.buildRevisions, acknowledgements: cache.acknowledgements }));
    } catch { warning = 'Local draft storage is unavailable. Save changes to the backend before leaving.'; }
    listeners.forEach(listener => listener());
  };
  const configurationRevision = app => JSON.stringify([fingerprint(app), app.platforms.map(platform => [platform, state.accounts[platform]?.developerAccountId, state.accounts[platform]?.status])]);
  const appById = id => { const app = state.apps.find(item => item.appId === id); if (!app) throw new Error('App not found. Return to your templates.'); return app; };
  const replaceApp = (id, patch) => emit({ apps: state.apps.map(app => app.appId === id ? { ...app, ...patch } : app) });
  const operation = async (key, callback) => {
    if (locks.has(key)) throw new Error('This operation is already running. Please wait.');
    locks.add(key); try { return await callback(); } finally { locks.delete(key); }
  };
  const normalizeApp = (raw, local = {}) => {
    const theme = themeFromFields(state.meta.themeFields, local.themeDirty ? local.theme : raw.theme, state.defaultTheme);
    const icon = raw.iconUrl ? { url: raw.iconUrl, name: 'Uploaded app icon' } : null;
    const splash = raw.splashUrl ? { url: raw.splashUrl, name: 'Uploaded splash image' } : null;
    return { ...raw, appId: local.appId || raw.appId, remoteAppId: raw.appId, templateId: local.templateId || 'market-day',
      platforms: local.platforms || [ ...(state.onboarding?.wantsAndroid ? ['ANDROID'] : []), ...(state.onboarding?.wantsIos ? ['IOS'] : []) ],
      step: local.step || 0, appName: local.detailsDirty ? local.appName : raw.appName, defaultBranchId: local.detailsDirty ? local.defaultBranchId : raw.defaultBranchId, detailsSaved: !local.detailsDirty, detailsDirty: Boolean(local.detailsDirty), theme, savedTheme: raw.theme || theme,
      publishedTheme: raw.publishedTheme ? themeFromFields(state.meta.themeFields, raw.publishedTheme, state.defaultTheme) : null, themeVersion: raw.themeVersion || 0,
      themeDirty: Boolean(local.themeDirty || !raw.publishedTheme || stable(theme) !== stable(themeFromFields(state.meta.themeFields, raw.publishedTheme, state.defaultTheme))), assets: { ICON: icon, SPLASH: splash }, productionAccessRevision: null,
      updatedAt: raw.updated || raw.updatedAt || raw.created || null };
  };
  const normalizeBuild = raw => ({ ...raw, mode: 'real', created: raw.created || raw.createdAt, statusMessage: raw.message || raw.statusMessage || '',
    revision: cache.buildRevisions[raw.buildId], tested: cache.acknowledgements[raw.buildId] === cache.buildRevisions[raw.buildId] && Boolean(cache.buildRevisions[raw.buildId]) });
  const accountPatch = (rows, onboarding) => {
    const accounts = {};
    for (const platform of Object.keys(STORE_TYPES)) {
      const raw = rows.find(row => row.storeType === STORE_TYPES[platform]);
      accounts[platform] = { ...emptyAccount(platform), ...raw, platform,
        developerAccountId: raw?.developerAccountId || '', checkStatus: raw?.status === 'VERIFIED' ? 'CONFIRMED' : 'UNCHECKED',
        hasAccount: onboarding?.[platform === 'ANDROID' ? 'googleAccountCreated' : 'appleAccountCreated'] ?? (raw?.developerAccountId ? true : null) };
    }
    return accounts;
  };
  const refreshAccounts = async () => {
    const version = ++refreshVersion;
    const [accounts, onboarding] = await Promise.all([api.storeAccounts(context.retailId), api.onboarding(context.retailId)]);
    if (version !== refreshVersion) return;
    emit({ accounts: accountPatch(list(accounts), onboarding), onboarding });
  };
  const persistAnswers = async (patch = {}) => {
    const current = state.onboarding || {};
    const answers = { retailId: context.retailId, wantsAndroid: current.wantsAndroid === true, wantsIos: current.wantsIos === true,
      googleAccountCreated: current.googleAccountCreated === true, appleAccountCreated: current.appleAccountCreated === true,
      ...(current.accountType ? { accountType: current.accountType } : {}), ...(current.dunsNumber ? { dunsNumber: current.dunsNumber } : {}), ...patch };
    const onboarding = await api.updateOnboarding(answers, user);
    emit({ onboarding });
    return onboarding;
  };
  const permissions = id => {
    const app = state.apps.find(item => item.appId === id);
    if (!app || !state.loaded) return { allowedSteps: Array(7).fill(false), allConnected: false, connectedCount: 0, canBuild: false, canProduce: false, testsReady: false };
    const connectedCount = app.platforms.filter(platform => state.accounts[platform]?.status === 'VERIFIED').length;
    const allConnected = app.platforms.length > 0 && connectedCount === app.platforms.length;
    const detailsAllowed = allConnected && (app.remoteAppId || state.onboarding?.canCreateApp === true);
    const detailsReady = Boolean(detailsAllowed && app.remoteAppId && app.detailsSaved && !app.detailsDirty);
    const brandingReady = detailsReady && Boolean(app.assets.ICON && app.assets.SPLASH);
    const configured = brandingReady && Boolean(app.publishedTheme) && !app.themeDirty;
    const canTestBuild = Object.fromEntries(app.platforms.map(platform => [platform, configured && state.onboarding?.canTestBuild?.[platform] === true]));
    const canBuild = Object.values(canTestBuild).some(Boolean);
    const revision = configurationRevision(app);
    const testedPlatforms = app.platforms.filter(platform => state.builds.some(build => build.appId === app.remoteAppId && build.platform === platform && build.environment !== 'PRODUCTION' && build.status === 'SUCCESS' && build.tested && build.revision === revision));
    const testsReady = app.platforms.length > 0 && testedPlatforms.length === app.platforms.length;
    const accessReady = app.productionAccessRevision === revision;
    const canPublishProduction = Object.fromEntries(app.platforms.map(platform => [platform, configured && testsReady && accessReady && state.onboarding?.canPublishProduction?.[platform] === true]));
    return { connectedCount, allConnected, canBuild, canTestBuild, canPublishProduction, testedPlatforms, testsReady,
      canProduce: Object.values(canPublishProduction).some(Boolean),
      allowedSteps: [true, true, Boolean(detailsAllowed), detailsReady, brandingReady, canBuild, configured && testsReady] };
  };
  const service = {
    mode: 'real', subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }, getSnapshot: () => state,
    getStorageWarning: () => warning, permissions, revision: id => configurationRevision(appById(id)),
    initialize() {
      if (initialization) return initialization;
      emit({ loading: true, error: '' });
      initialization = (async () => {
        try {
          if (!context.retailId || !context.branchId) throw new Error('Set VITE_RETAIL_ID and VITE_BRANCH_ID to your authenticated retail and branch.');
          const [meta, defaultTheme, onboarding, accounts, apps, dashboard, branches] = await Promise.all([
            api.meta(), api.defaultTheme(), api.onboarding(context.retailId), api.storeAccounts(context.retailId), api.listApps(context.retailId),
            api.dashboard({ retailId: context.retailId, page: 0, size: 100 }),
            api.stores(context.retailId).then(value => ({ value })).catch(error => ({ error: error.message })),
          ]);
          if (!Array.isArray(meta.themeFields) || !meta.themeFields.length || !meta.assetRules) throw new Error('Backend metadata is missing theme fields or asset rules.');
          const previewTheme = themeFromFields(meta.themeFields, null, defaultTheme);
          if (['colors', 'spacing', 'radii', 'typography', 'components'].some(group => !previewTheme[group])) throw new Error('Backend theme metadata is missing a required theme group.');
          state = { ...state, meta, defaultTheme, onboarding };
          const locals = cache.apps || [];
          const loadedApps = await Promise.all(list(apps).map(async raw => normalizeApp(await api.getApp(raw.appId), locals.find(item => item.remoteAppId === raw.appId))));
          const drafts = locals.filter(item => !item.remoteAppId).map(item => ({ ...item, theme: themeFromFields(meta.themeFields, item.theme, defaultTheme), assets: { ICON: null, SPLASH: null } }));
          const store = branches.value?.find(item => item.branchId === context.branchId);
          emit({ loaded: true, loading: false, error: '', apps: [...loadedApps, ...drafts],
            branches: branches.value || [], branchError: branches.error || '', accounts: accountPatch(list(accounts), onboarding),
            builds: list(dashboard.builds).map(normalizeBuild), counts: dashboard.counts || {},
            context: { ...context, branchName: store?.branchName || context.branchId } });
          if (!state.apps.length) service.createApp('market-day');
          if (dashboard.builds?.totalPages > 1) await service.refreshBuilds();
        } catch (error) { emit({ loading: false, loaded: false, error: error.message }); }
        finally { initialization = null; }
      })();
      return initialization;
    },
    createApp(templateId = 'market-day') {
      if (!state.loaded) throw new Error('Load the App Builder before starting a draft.');
      const template = TEMPLATES.find(item => item.id === templateId) || TEMPLATES[0];
      const theme = themeFromFields(state.meta.themeFields, null, state.defaultTheme);
      theme.colors.brand = template.brand; theme.colors.accent = template.accent;
      const appId = `DRAFT_${globalThis.crypto.randomUUID()}`;
      const platforms = [...(state.onboarding?.wantsAndroid ? ['ANDROID'] : []), ...(state.onboarding?.wantsIos ? ['IOS'] : [])];
      emit({ apps: [...state.apps, { appId, remoteAppId: null, appName: 'Untitled app', templateId: template.id, defaultBranchId: context.branchId,
        platforms: platforms.length ? platforms : ['ANDROID'], step: 0, detailsSaved: false, detailsDirty: true, theme, savedTheme: structuredClone(theme),
        publishedTheme: null, themeVersion: 0, themeDirty: true, assets: { ICON: null, SPLASH: null }, updatedAt: null, productionAccessRevision: null }] });
      return appId;
    },
    setStep(id, step) { if (!permissions(id).allowedSteps[step]) throw new Error('Complete the earlier steps and backend permission requirements first.'); replaceApp(id, { step }); },
    async setPlatforms(id, platforms) {
      return operation('onboarding', async () => {
        await persistAnswers({ wantsAndroid: platforms.includes('ANDROID'), wantsIos: platforms.includes('IOS') });
        replaceApp(id, { platforms: [...new Set(platforms)], productionAccessRevision: null });
      });
    },
    updateDetails(id, body) { replaceApp(id, { ...body, detailsDirty: true, detailsSaved: false, productionAccessRevision: null }); },
    async saveDetails(id) {
      return operation(`app:${id}`, async () => {
        const app = appById(id);
        if (!permissions(id).allowedSteps[2]) throw new Error('Connect and verify all selected accounts. Backend app creation permission is also required.');
        if (!app.appName.trim() || app.appName.trim().length > 30) throw new Error('Enter an app name between 1 and 30 characters.');
        // The app always belongs to the RMS location the user is logged in to; it is not chosen here.
        if (!state.branches.some(branch => branch.branchId === context.branchId)) throw new Error(`Your RMS location (branch ${context.branchId}) was not found for this retail. Log in to the location again and retry.`);
        const requested = fingerprint(app);
        const body = { appName: app.appName.trim(), defaultBranchId: context.branchId };
        const raw = app.remoteAppId ? await api.updateApp(app.remoteAppId, body, user) : await api.createApp({ ...body, retailId: context.retailId,
          merchantKey: `store${globalThis.crypto.randomUUID().replaceAll('-', '').slice(0, 24)}` }, user);
        if (!raw?.appId) throw new Error('Backend did not return an appId.');
        const latest = appById(id);
        // Record the created identity even if the user edited while the request ran;
        // keep those newer edits unsaved rather than creating a second backend app.
        const normalized = normalizeApp(raw, { ...latest, detailsDirty: false, themeDirty: latest.themeDirty });
        replaceApp(id, requested === fingerprint(latest) ? normalized : { ...normalized, appName: latest.appName, defaultBranchId: latest.defaultBranchId, detailsDirty: true, detailsSaved: false });
        return { message: 'App details saved to retail-service.' };
      });
    },
    async saveDraft(id) {
      const app = appById(id);
      if (!app.remoteAppId) { replaceApp(id, { updatedAt: Date.now() }); return { message: 'Setup draft saved in this browser. The app is created after account verification and saving app details.' }; }
      if (app.detailsDirty) await service.saveDetails(id);
      if (app.themeDirty) await service.saveTheme(id);
      return { message: 'Draft saved.' };
    },
    async setAsset(id, kind, asset, file) {
      if (!file || !asset) throw new Error('Asset removal is not supported by this collection. Replace the uploaded image instead.');
      return operation(`asset:${id}:${kind}`, async () => {
        const app = appById(id);
        if (!app.remoteAppId) throw new Error('Save app details before uploading images.');
        const raw = await api.uploadAsset(app.remoteAppId, kind, file, user);
        const url = raw?.[kind === 'ICON' ? 'iconUrl' : 'splashUrl'];
        if (!url || !/^https?:\/\//.test(url)) throw new Error('Backend did not return the uploaded image URL.');
        replaceApp(id, { assets: { ...appById(id).assets, [kind]: { ...asset, url } }, productionAccessRevision: null });
      });
    },
    setTheme(id, theme) { replaceApp(id, { theme, themeDirty: true, productionAccessRevision: null }); },
    async saveTheme(id) {
      return operation(`theme:${id}`, async () => {
        const app = appById(id); if (!app.remoteAppId) throw new Error('Save app details first.');
        validateTheme(app.theme, state.meta.themeFields);
        const requested = structuredClone(app.theme);
        const raw = await api.saveTheme(app.remoteAppId, requested, user);
        replaceApp(id, { savedTheme: raw.theme || requested, updatedAt: raw.updated || raw.updatedAt || Date.now() });
      });
    },
    async publishTheme(id) {
      if (!permissions(id).allowedSteps[4]) throw new Error('Save app details and upload both branding images before publishing your theme.');
      await service.saveTheme(id);
      return operation(`theme:${id}`, async () => {
        const app = appById(id);
        const raw = await api.publishTheme(app.remoteAppId, user);
        if (!raw?.publishedTheme || !raw.themeUrl) throw new Error('Backend did not return the published theme and theme URL.');
        replaceApp(id, { publishedTheme: raw.publishedTheme, themeVersion: raw.themeVersion, themeUrl: raw.themeUrl,
          themeDirty: stable(appById(id).theme) !== stable(themeFromFields(state.meta.themeFields, raw.publishedTheme, state.defaultTheme)), productionAccessRevision: null });
        return { message: 'Theme published by retail-service. A binary build is a separate action.' };
      });
    },
    async setAccountAnswer(platform, hasAccount) {
      return operation('onboarding', async () => {
        await persistAnswers({ [platform === 'ANDROID' ? 'googleAccountCreated' : 'appleAccountCreated']: hasAccount });
        emit({ accounts: { ...state.accounts, [platform]: { ...state.accounts[platform], hasAccount } } });
      });
    },
    async updateOnboardingAnswers(answers) { return operation('onboarding', () => persistAnswers(answers)); },
    updateAccountId(platform, value) {
      refreshVersion += 1;
      emit({ accounts: { ...state.accounts, [platform]: { ...state.accounts[platform], developerAccountId: value, status: 'NOT_CONNECTED', checkStatus: 'UNCHECKED' } },
        apps: state.apps.map(app => app.platforms.includes(platform) ? { ...app, productionAccessRevision: null } : app) });
    },
    async checkAccount(platform, value) {
      const id = validateDeveloperId(value, platform);
      emit({ accounts: { ...state.accounts, [platform]: { ...state.accounts[platform], developerAccountId: id, checkStatus: 'FORMAT_VALID' } } });
      return { message: 'ID format is valid. This API collection cannot verify account existence by ID. Grant the requested access, then submit the invitation.' };
    },
    async connectAccount(platform, _scenario, accessGranted) {
      if (!accessGranted) throw new Error('Confirm you sent the invitation and granted the required access first.');
      return operation(`account:${platform}`, async () => {
        const id = validateDeveloperId(state.accounts[platform].developerAccountId, platform);
        const raw = platform === 'ANDROID' ? await api.connectGooglePlay(context.retailId, id, true, user) : await api.connectAppleInvite(context.retailId, id, true, user);
        if (state.accounts[platform].developerAccountId !== id) throw new Error('The ID changed while connecting. Refresh status to review the backend account.');
        const status = raw.status;
        if (!['VERIFIED', 'INVITE_SENT', 'FAILED', 'NOT_CONNECTED', 'REVOKED'].includes(status)) throw new Error('Backend returned an unsupported account status.');
        emit({ accounts: { ...state.accounts, [platform]: { ...state.accounts[platform], ...raw, platform, developerAccountId: id } } });
        const onboarding = await api.onboarding(context.retailId); emit({ onboarding });
        return { message: status === 'VERIFIED' ? 'Backend reports verified account access.' : status === 'INVITE_SENT' ? 'Invitation recorded. Waiting for Pallet access confirmation. Use Refresh status to check again.' : `Backend account status: ${status}.` };
      });
    },
    refreshAccounts,
    async reverifyAccount(platform) {
      if (state.accounts[platform].connectionMethod === 'INVITE' || state.accounts[platform].status !== 'VERIFIED') { await refreshAccounts(); return { message: `Backend account status: ${state.accounts[platform].status}.` }; }
      await api.reverifyStore(context.retailId, STORE_TYPES[platform], user); await refreshAccounts();
      return { message: `Backend account status: ${state.accounts[platform].status}.` };
    },
    async resetAccount(platform) {
      return operation(`account:${platform}`, async () => { await api.disconnectStore(context.retailId, STORE_TYPES[platform], user); await refreshAccounts(); });
    },
    async checkProductionAccess(id) {
      const app = appById(id); const revision = configurationRevision(app);
      if (!permissions(id).allowedSteps[6]) throw new Error('Validate a current successful test build for each selected platform first.');
      const results = await Promise.all(app.platforms.map(platform => api.storeAccess(app.remoteAppId, platform)));
      if (configurationRevision(appById(id)) !== revision) throw new Error('The app changed during the access check. Check again.');
      if (results.some(result => result.ready !== true)) throw new Error(results.filter(result => !result.ready).map(result => result.message || result.detail || 'Store package access is not ready.').join(' '));
      const onboarding = await api.onboarding(context.retailId); emit({ onboarding });
      replaceApp(id, { productionAccessRevision: revision });
      return { message: 'Backend store access checks passed for every selected platform.' };
    },
    async createBuild(id, { platform, environment, artifactType, versionName }) {
      return operation(`build:${id}:${platform}`, async () => {
        const app = appById(id); const gates = permissions(id);
        if (!app.platforms.includes(platform) || !(environment === 'PRODUCTION' ? gates.canPublishProduction[platform] : gates.canTestBuild[platform])) throw new Error('Backend permission or setup requirements block this platform/environment.');
        if (!['DEVELOPMENT', 'STAGE', 'PRODUCTION'].includes(environment)) throw new Error('Choose a supported environment.');
        if (!(platform === 'ANDROID' ? ['APK', 'AAB'] : ['IPA']).includes(artifactType)) throw new Error('Choose a supported artifact type.');
        if (!/^\d+\.\d+\.\d+$/.test(versionName)) throw new Error('Use a version such as 1.0.0.');
        if (state.builds.some(build => build.appId === app.remoteAppId && build.platform === platform && ['QUEUED', 'BUILDING'].includes(build.status))) throw new Error('A build is already running for this app and platform.');
        const revision = configurationRevision(app);
        const raw = await api.createBuild(app.remoteAppId, { platform, environment, artifactType, versionName }, user);
        if (!raw?.buildId) throw new Error('Backend did not return a build ID.');
        cache.buildRevisions[raw.buildId] = revision;
        emit({ builds: [normalizeBuild(raw), ...state.builds.filter(build => build.buildId !== raw.buildId)] });
        return { message: `Backend build status: ${raw.status}.`, buildId: raw.buildId };
      });
    },
    async advanceBuilds() {
      if (locks.has('poll')) return;
      return operation('poll', async () => {
        try {
          const pending = state.builds.filter(build => ['QUEUED', 'BUILDING'].includes(build.status));
          const refreshed = await Promise.all(pending.map(build => api.getBuild(build.buildId)));
          emit({ builds: state.builds.map(build => normalizeBuild(refreshed.find(raw => raw.buildId === build.buildId) || build)), pollError: '' });
        } catch (error) { emit({ pollError: error.message }); }
      });
    },
    async refreshBuilds() {
      const dashboard = await api.dashboard({ retailId: context.retailId, page: 0, size: 100 });
      // Load all pages so the existing client-side filters/pagination are complete.
      let builds = list(dashboard.builds);
      for (let page = 1; page < (dashboard.builds?.totalPages || 1); page++) {
        const more = await api.dashboard({ retailId: context.retailId, page, size: 100 }); builds = [...builds, ...list(more.builds)];
      }
      emit({ builds: builds.map(normalizeBuild), counts: dashboard.counts || {}, pollError: '' });
    },
    async getBuild(id) {
      const raw = await api.getBuild(id);
      emit({ builds: state.builds.map(build => build.buildId === id ? normalizeBuild(raw) : build) });
      return normalizeBuild(raw);
    },
    async retryDispatch(id) { await api.retryDispatch(id); await service.getBuild(id); },
    acknowledgeTest(id) {
      const build = state.builds.find(item => item.buildId === id);
      const app = state.apps.find(item => item.remoteAppId === build?.appId);
      if (!build || !app || build.status !== 'SUCCESS' || build.environment === 'PRODUCTION' || build.revision !== configurationRevision(app)) throw new Error('Create a successful current test build before acknowledging it. Older builds have no confirmed configuration revision.');
      cache.acknowledgements[id] = build.revision;
      emit({ builds: state.builds.map(item => item.buildId === id ? { ...item, tested: true } : item) });
      return { message: 'Your test acknowledgement was saved in this browser. The collection has no backend acknowledgement endpoint.' };
    },
  };
  return service;
}
