import { themeFromFields } from '../themeUtils.js';
import { CONTEXT, THEME_FIELDS, TEMPLATES } from './metadata.js';
import { validateDeveloperId, validateTheme } from './validation.js';

const STORAGE_KEY = 'rms-app-builder-demo:v1:RET_82';
const defaultAccount = platform => ({ platform, hasAccount: null, developerAccountId: '', status: 'NOT_CONNECTED', checkStatus: 'UNCHECKED', lastError: '' });
const newApp = (id, name, templateId = 'market-day') => {
  const template = TEMPLATES.find(item => item.id === templateId) || TEMPLATES[0];
  const theme = themeFromFields(THEME_FIELDS);
  theme.colors.brand = template.brand;
  theme.colors.accent = template.accent;
  return {
    appId: id, appName: name, templateId: template.id, defaultBranchId: CONTEXT.branchId,
    platforms: ['ANDROID'], step: 0, detailsSaved: false, revision: 0, theme, savedTheme: structuredClone(theme),
    publishedTheme: null, themeVersion: 0, themeDirty: false, assets: { ICON: null, SPLASH: null },
    updatedAt: null, productionAccessRevision: null,
  };
};

function initialWorkspace() {
  return {
    version: 1, context: CONTEXT,
    accounts: {
      ANDROID: { ...defaultAccount('ANDROID'), hasAccount: true, developerAccountId: '65865865865', status: 'VERIFIED', checkStatus: 'CONFIRMED' },
      IOS: defaultAccount('IOS'),
    },
    apps: [newApp('DEMO_APP_3', 'Untitled app 3')], builds: [], nextId: 4,
  };
}

export function appPermissions(workspace, appId) {
  const app = workspace.apps.find(item => item.appId === appId);
  if (!app) return { allowedSteps: [false, false, false, false, false, false, false], connectedCount: 0, allConnected: false, canBuild: false, canProduce: false };
  const connectedCount = app.platforms.filter(platform => workspace.accounts[platform]?.status === 'VERIFIED').length;
  const allConnected = app.platforms.length > 0 && connectedCount === app.platforms.length;
  const detailsReady = allConnected && app.detailsSaved;
  const brandingReady = detailsReady && Boolean(app.assets.ICON && app.assets.SPLASH);
  const canBuild = brandingReady && Boolean(app.publishedTheme) && !app.themeDirty;
  const testedPlatforms = app.platforms.filter(platform => workspace.builds.some(build =>
    build.appId === appId && build.platform === platform && build.environment !== 'PRODUCTION' &&
    build.status === 'SUCCESS' && build.tested && build.revision === app.revision));
  const testsReady = app.platforms.length > 0 && testedPlatforms.length === app.platforms.length;
  return {
    connectedCount, allConnected, canBuild, testedPlatforms, testsReady,
    canProduce: canBuild && testsReady && app.productionAccessRevision === app.revision,
    allowedSteps: [true, true, allConnected, detailsReady, brandingReady, canBuild, canBuild && testsReady],
  };
}

// This adapter is the only owner of demo transitions. No HTTP requests occur.
// Replace operations here with backend-normalized results when integration is ready.
export function createDemoService({ storage, delay = 450, now = () => Date.now() } = {}) {
  let state = initialWorkspace();
  let storageWarning = '';
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (saved?.version === 1 && Array.isArray(saved.apps) && Array.isArray(saved.builds) && saved.accounts?.ANDROID && saved.accounts?.IOS) {
      state = saved;
      // Browser object URLs are session-only. Persist no image/key contents.
      state.apps = state.apps.map(app => ({ ...app, assets: { ICON: null, SPLASH: null } }));
    }
  } catch { storageWarning = 'Saved demo progress could not be loaded. A fresh demo has been opened.'; }
  const listeners = new Set();
  const pause = () => delay ? new Promise(resolve => setTimeout(resolve, delay)) : Promise.resolve();
  const emit = () => {
    try {
      const persisted = { ...state, apps: state.apps.map(app => ({ ...app, assets: { ICON: null, SPLASH: null } })) };
      storage?.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch { storageWarning = 'Browser storage is full or unavailable. This session works, but changes may not survive refresh.'; }
    listeners.forEach(listener => listener());
  };
  const mutate = action => { const draft = structuredClone(state); action(draft); state = draft; emit(); return state; };
  const findApp = (draft, id) => {
    const app = draft.apps.find(item => item.appId === id);
    if (!app) throw new Error('This demo app was not found. Return to your apps.');
    return app;
  };
  const touch = app => { app.revision += 1; app.productionAccessRevision = null; };
  const invalidatePlatform = (draft, platform) => draft.apps.filter(app => app.platforms.includes(platform)).forEach(touch);

  return {
    mode: 'demo', subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => state, getStorageWarning: () => storageWarning,
    permissions: id => appPermissions(state, id),
    createApp(templateId) {
      let appId;
      mutate(draft => { appId = `DEMO_APP_${draft.nextId++}`; draft.apps.push(newApp(appId, `Untitled app ${draft.nextId - 1}`, templateId)); });
      return appId;
    },
    setStep(id, step) {
      if (!appPermissions(state, id).allowedSteps[step]) throw new Error('Complete the earlier steps before opening this section.');
      mutate(draft => { findApp(draft, id).step = step; });
    },
    setPlatforms(id, platforms) {
      mutate(draft => { const app = findApp(draft, id); app.platforms = [...new Set(platforms)].filter(item => ['ANDROID', 'IOS'].includes(item)); touch(app); });
    },
    updateDetails(id, body) {
      mutate(draft => { const app = findApp(draft, id); Object.assign(app, body); app.detailsSaved = false; touch(app); });
    },
    async saveDetails(id) {
      await pause();
      if (!appPermissions(state, id).allConnected) throw new Error('Connect all selected developer accounts first.');
      const app = state.apps.find(item => item.appId === id);
      if (!app?.appName.trim() || app.appName.trim().length > 30) throw new Error('Enter an app name between 1 and 30 characters.');
      if (app.defaultBranchId !== CONTEXT.branchId) throw new Error('Choose the RMS branch shown for this demo retailer.');
      mutate(draft => { const item = findApp(draft, id); item.appName = item.appName.trim(); item.detailsSaved = true; item.updatedAt = now(); });
    },
    async saveDraft(id) { await pause(); mutate(draft => { findApp(draft, id).updatedAt = now(); }); },
    setAsset(id, kind, asset) {
      const previous = state.apps.find(item => item.appId === id)?.assets[kind];
      if (previous?.url?.startsWith('blob:') && previous.url !== asset?.url) URL.revokeObjectURL(previous.url);
      mutate(draft => { const app = findApp(draft, id); app.assets[kind] = asset; touch(app); });
    },
    setTheme(id, theme) { mutate(draft => { const app = findApp(draft, id); app.theme = theme; app.themeDirty = true; touch(app); }); },
    async saveTheme(id) {
      await pause();
      const app = state.apps.find(item => item.appId === id);
      validateTheme(app.theme);
      mutate(draft => { const item = findApp(draft, id); item.savedTheme = structuredClone(item.theme); item.updatedAt = now(); });
    },
    async publishTheme(id) {
      await pause();
      if (!appPermissions(state, id).allowedSteps[4]) throw new Error('Save app details and choose both branding images before publishing your theme.');
      const app = state.apps.find(item => item.appId === id);
      validateTheme(app.theme);
      mutate(draft => {
        const item = findApp(draft, id); item.savedTheme = structuredClone(item.theme); item.publishedTheme = structuredClone(item.theme);
        item.themeVersion += 1; item.themeDirty = false; item.updatedAt = now();
      });
    },
    setAccountAnswer(platform, hasAccount) { mutate(draft => { draft.accounts[platform].hasAccount = hasAccount; }); },
    updateAccountId(platform, value) {
      if (state.accounts[platform].developerAccountId === value) return;
      mutate(draft => { Object.assign(draft.accounts[platform], { developerAccountId: value, status: 'NOT_CONNECTED', checkStatus: 'UNCHECKED', lastError: '' }); invalidatePlatform(draft, platform); });
    },
    async checkAccount(platform, value, scenario = 'happy') {
      const requestedId = validateDeveloperId(value, platform);
      await pause();
      if (validateDeveloperId(state.accounts[platform].developerAccountId, platform) !== requestedId) throw new Error('The account ID changed during this check. Please check the current ID.');
      const error = scenario === 'notFound' ? 'Demo account check failed. Check the ID and retry, or create a developer account.' : '';
      mutate(draft => {
        const account = draft.accounts[platform]; account.developerAccountId = requestedId;
        account.checkStatus = error ? 'FAILED' : 'CONFIRMED'; account.lastError = error;
        if (error) account.status = 'NOT_CONNECTED';
      });
      if (error) throw new Error(error);
      return { message: 'Account details confirmed · Demo. Next, grant access and connect.' };
    },
    async connectAccount(platform, scenario, accessGranted) {
      if (state.accounts[platform].checkStatus !== 'CONFIRMED') throw new Error('Check your account details first.');
      if (!accessGranted) throw new Error('Send the invitation in your store console, then confirm you have granted access.');
      const requestedId = state.accounts[platform].developerAccountId;
      await pause();
      if (state.accounts[platform].developerAccountId !== requestedId) throw new Error('The account ID changed. Check it before connecting.');
      const error = scenario === 'permission' ? 'Publishing permission is missing. Review the invitation permissions and try again.' : scenario === 'failed' ? 'Demo connection failed. Check your invitation and retry.' : '';
      mutate(draft => {
        const account = draft.accounts[platform]; account.status = error ? 'FAILED' : scenario === 'pending' ? 'INVITE_SENT' : 'VERIFIED'; account.lastError = error;
      });
      if (error) throw new Error(error);
      return { message: scenario === 'pending' ? 'Invitation recorded · Demo. Confirmation is pending.' : 'Connected and Verified · Demo mode. No live account access was performed.' };
    },
    resetAccount(platform) { mutate(draft => { draft.accounts[platform] = defaultAccount(platform); invalidatePlatform(draft, platform); }); },
    async checkProductionAccess(id) {
      await pause();
      if (!appPermissions(state, id).allowedSteps[6]) throw new Error('Complete and validate a current test build for every selected platform first.');
      mutate(draft => { const app = findApp(draft, id); app.productionAccessRevision = app.revision; });
    },
    async createBuild(id, { platform, environment, artifactType, versionName, outcome = 'happy' }) {
      await pause();
      const app = state.apps.find(item => item.appId === id);
      const permission = appPermissions(state, id);
      if (!app?.platforms.includes(platform)) throw new Error('Choose one of the selected platforms.');
      if (!['DEVELOPMENT', 'STAGE', 'PRODUCTION'].includes(environment)) throw new Error('Choose a supported environment.');
      if (!(platform === 'ANDROID' ? ['APK', 'AAB'] : ['IPA']).includes(artifactType)) throw new Error('Choose a supported artifact format.');
      if (!/^\d+\.\d+\.\d+$/.test(versionName)) throw new Error('Use a version such as 1.0.0.');
      if (environment === 'PRODUCTION' ? !permission.canProduce : !permission.canBuild) throw new Error('Complete the required account, branding, theme and build checks first.');
      if (state.builds.some(build => build.appId === id && build.platform === platform && ['QUEUED', 'BUILDING'].includes(build.status))) throw new Error('A build for this app and platform is already running.');
      let buildId;
      mutate(draft => {
        buildId = `DEMO_BUILD_${draft.nextId++}`;
        draft.builds.unshift({ buildId, appId: id, appName: app.appName, platform, environment, artifactType, versionName,
          versionCode: draft.builds.filter(build => build.appId === id && build.platform === platform).length + 1,
          status: 'QUEUED', created: now(), revision: app.revision, tested: false, outcome, statusMessage: 'Demo build queued.' });
      });
      return buildId;
    },
    advanceBuilds() {
      if (!state.builds.some(build => ['QUEUED', 'BUILDING'].includes(build.status))) return;
      mutate(draft => {
        for (const build of draft.builds) {
          if (!['QUEUED', 'BUILDING'].includes(build.status)) continue;
          const elapsed = now() - build.created;
          if (elapsed > 4000) {
            build.status = build.outcome === 'failed' ? 'FAILED' : 'SUCCESS'; build.completedAt = now();
            build.statusMessage = build.status === 'FAILED' ? 'Demo build failed: signing configuration needs attention. Retry with the happy-path outcome.' : 'Demo build ready. Download a sample report; no installable app was generated.';
          } else if (elapsed > 900) { build.status = 'BUILDING'; build.statusMessage = 'Demo build in progress…'; }
        }
      });
    },
    acknowledgeTest(buildId) {
      const build = state.builds.find(item => item.buildId === buildId);
      if (!build || build.status !== 'SUCCESS' || build.environment === 'PRODUCTION') throw new Error('Only a successful test build can be validated.');
      const app = state.apps.find(item => item.appId === build.appId);
      if (build.revision !== app.revision) throw new Error('The app changed after this build. Create and validate a new test build.');
      mutate(draft => { draft.builds.find(item => item.buildId === buildId).tested = true; });
    },
  };
}

let storage;
try { storage = typeof window !== 'undefined' ? window.localStorage : undefined; } catch { /* In-memory demo remains available. */ }
export const demoService = createDemoService({ storage });
