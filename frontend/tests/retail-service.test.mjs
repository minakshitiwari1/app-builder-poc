import test from 'node:test';
import assert from 'node:assert/strict';
import { createRetailService } from '../src/services/retailService.js';
import { THEME_FIELDS } from '../src/demo/metadata.js';
import { themeFromFields } from '../src/themeUtils.js';

function fixture({ status = 'VERIFIED' } = {}) {
  const calls = [];
  const context = { retailId: 'RET_TEST', branchId: 'RLC_TEST' };
  const user = { id: 'user', name: 'Test User' };
  const backend = { onboarding: { wantsAndroid: true, wantsIos: false, googleAccountCreated: true, canCreateApp: true, canTestBuild: { ANDROID: true, IOS: false }, canPublishProduction: { ANDROID: true, IOS: false }, steps: [] },
    accounts: [{ storeType: 'GOOGLE_PLAY', status, connectionMethod: 'INVITE', developerAccountId: '9127553203398319836' }], apps: [], builds: [] };
  const theme = themeFromFields(THEME_FIELDS);
  const api = Object.fromEntries(['meta','defaultTheme','onboarding','storeAccounts','listApps','getApp','stores','dashboard','updateOnboarding','createApp','updateApp','saveTheme','publishTheme','uploadAsset','connectGooglePlay','connectAppleInvite','reverifyStore','disconnectStore','storeAccess','createBuild','getBuild','retryDispatch'].map(name => [name, async (...args) => {
    calls.push({ name, args });
    switch (name) {
      case 'meta': return { themeFields: THEME_FIELDS, assetRules: { ICON: {}, SPLASH: {} } };
      case 'defaultTheme': return theme;
      case 'onboarding': return structuredClone(backend.onboarding);
      case 'storeAccounts': return structuredClone(backend.accounts);
      case 'listApps': return structuredClone(backend.apps);
      case 'getApp': return structuredClone(backend.apps.find(app => app.appId === args[0]));
      case 'stores': return [{ branchId: 'RLC_TEST', branchName: 'Test Store' }];
      case 'dashboard': return { builds: { content: structuredClone(backend.builds), totalPages: 1 }, counts: { TOTAL: backend.builds.length } };
      case 'updateOnboarding': backend.onboarding = { ...backend.onboarding, ...args[0] }; return structuredClone(backend.onboarding);
      case 'createApp': { const app = { ...args[0], appId: 'APP_REMOTE', androidPackageName: 'com.generated', theme, publishedTheme: null }; backend.apps.push(app); return structuredClone(app); }
      case 'updateApp': Object.assign(backend.apps[0], args[1]); return structuredClone(backend.apps[0]);
      case 'saveTheme': backend.apps[0].theme = args[1]; return structuredClone(backend.apps[0]);
      case 'publishTheme': Object.assign(backend.apps[0], { publishedTheme: structuredClone(backend.apps[0].theme), themeVersion: 1, themeUrl: 'https://storage.example/theme.json' }); return structuredClone(backend.apps[0]);
      case 'uploadAsset': { const key = args[1] === 'ICON' ? 'iconUrl' : 'splashUrl'; backend.apps[0][key] = `https://storage.example/${args[1]}.png`; return structuredClone(backend.apps[0]); }
      case 'connectGooglePlay': backend.accounts[0] = { ...backend.accounts[0], status: 'INVITE_SENT', developerAccountId: args[1] }; return structuredClone(backend.accounts[0]);
      case 'storeAccess': return { ready: true, platform: args[1], identifier: 'com.generated' };
      case 'createBuild': { const build = { ...args[1], appId: args[0], appName: 'Test App', buildId: `BUILD_${backend.builds.length}`, status: 'QUEUED', versionCode: 1, created: new Date().toISOString() }; backend.builds.push(build); return structuredClone(build); }
      case 'getBuild': return structuredClone(backend.builds.find(build => build.buildId === args[0]));
      default: return null;
    }
  }]));
  const values = new Map(); const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const service = createRetailService({ api, context, user, storage });
  return { service, api, backend, calls, storage, context, user };
}
async function configured(f) {
  await f.service.initialize(); const id = f.service.getSnapshot().apps[0].appId;
  f.service.updateDetails(id, { appName: 'Test App' }); await f.service.saveDetails(id);
  for (const kind of ['ICON','SPLASH']) await f.service.setAsset(id, kind, { name: 'image.png', url: 'blob:test' }, new Blob(['image']));
  await f.service.publishTheme(id); return id;
}
test('real initialization errors never fall back to demo accounts or apps', async () => {
  const f = fixture(); f.api.meta = async () => { throw new Error('Tunnel offline'); };
  await f.service.initialize(); assert.equal(f.service.getSnapshot().loaded, false); assert.equal(f.service.getSnapshot().apps.length, 0);
  assert.equal(f.service.getSnapshot().accounts.ANDROID.status, 'NOT_CONNECTED'); assert.equal(f.service.getSnapshot().error, 'Tunnel offline');
});
test('format validation does not verify an account and Connect preserves INVITE_SENT', async () => {
  const f = fixture({ status: 'NOT_CONNECTED' }); await f.service.initialize(); const id = f.service.getSnapshot().apps[0].appId;
  f.service.updateAccountId('ANDROID', '9127553203398319836'); const before = f.calls.length;
  await f.service.checkAccount('ANDROID', '9127553203398319836'); assert.equal(f.calls.length, before);
  assert.equal(f.service.getSnapshot().accounts.ANDROID.checkStatus, 'FORMAT_VALID'); assert.equal(f.service.permissions(id).allConnected, false);
  await assert.rejects(f.service.connectAccount('ANDROID', null, false), /Confirm/);
  await f.service.connectAccount('ANDROID', null, true);
  const request = f.calls.find(call => call.name === 'connectGooglePlay'); assert.equal(request.args[1], '9127553203398319836'); assert.equal(request.args[2], true);
  assert.equal(f.service.getSnapshot().accounts.ANDROID.status, 'INVITE_SENT'); assert.equal(f.service.permissions(id).allowedSteps[2], false);
  await f.service.reverifyAccount('ANDROID'); assert.equal(f.calls.some(call => call.name === 'reverifyStore'), false);
});
test('details create once, uploads send the original file, and theme publishing saves draft first', async () => {
  const f = fixture(); const id = await configured(f); const app = f.service.getSnapshot().apps[0];
  assert.equal(app.remoteAppId, 'APP_REMOTE'); assert.equal(app.androidPackageName, 'com.generated');
  const create = f.calls.find(call => call.name === 'createApp'); assert.equal(create.args[0].retailId, 'RET_TEST'); assert.equal(create.args[1].id, 'user');
  assert.match(create.args[0].merchantKey, /^[a-z][a-z0-9]{2,29}$/);
  assert(create.args[0].merchantKey.length <= 30);
  assert(f.calls.find(call => call.name === 'uploadAsset').args[2] instanceof Blob);
  assert.equal(f.calls.filter(call => ['saveTheme','publishTheme'].includes(call.name)).map(call => call.name).join(','), 'saveTheme,publishTheme');
  f.service.updateDetails(id, { appName: 'Changed' }); await f.service.saveDetails(id);
  assert.equal(f.calls.filter(call => call.name === 'createApp').length, 1); assert.equal(f.calls.filter(call => call.name === 'updateApp').length, 1);
  await assert.rejects(f.service.setAsset(id, 'ICON', null), /not supported/);
});
test('backend permissions override VERIFIED account labels', async () => {
  const f = fixture(); const id = await configured(f); f.backend.onboarding.canTestBuild.ANDROID = false; await f.service.refreshAccounts();
  assert.equal(f.service.permissions(id).allConnected, true); assert.equal(f.service.permissions(id).canBuild, false);
  await assert.rejects(f.service.createBuild(id, { platform: 'ANDROID', environment: 'STAGE', artifactType: 'APK', versionName: '1.0.0' }), /block/);
});
test('builds use backend statuses, downloads, revision-aware acknowledgements and production permissions', async () => {
  const f = fixture(); const id = await configured(f); const options = { platform: 'ANDROID', environment: 'STAGE', artifactType: 'APK', versionName: '1.0.0' };
  const result = await f.service.createBuild(id, options); await f.service.advanceBuilds(); assert.equal(f.service.getSnapshot().builds[0].status, 'QUEUED');
  Object.assign(f.backend.builds[0], { status: 'SUCCESS', artifactUrl: 'https://storage.example/app.apk' }); await f.service.advanceBuilds();
  assert.equal(f.service.getSnapshot().builds[0].artifactUrl, 'https://storage.example/app.apk'); f.service.acknowledgeTest(result.buildId);
  assert.equal(f.service.permissions(id).canProduce, false); await f.service.checkProductionAccess(id); assert.equal(f.service.permissions(id).canProduce, true);
  f.backend.onboarding.canPublishProduction.ANDROID = false; await f.service.refreshAccounts(); assert.equal(f.service.permissions(id).canProduce, false);
  f.service.updateAccountId('ANDROID', '123456789012'); assert.equal(f.service.permissions(id).testsReady, false);
});
test('server images and draft app identity survive refresh, but store access must be checked again', async () => {
  const f = fixture(); const id = await configured(f); const restored = createRetailService({ api: f.api, context: f.context, user: f.user, storage: f.storage });
  await restored.initialize(); const app = restored.getSnapshot().apps[0]; assert.equal(app.appId, id); assert.equal(app.remoteAppId, 'APP_REMOTE');
  assert.equal(app.assets.ICON.url, 'https://storage.example/ICON.png'); assert.equal(app.productionAccessRevision, null);
});
test('branch failures block saving details instead of inventing a production branch', async () => {
  const f = fixture(); f.api.stores = async () => { throw new Error('Branch route unavailable'); }; await f.service.initialize(); const id = f.service.getSnapshot().apps[0].appId;
  assert.equal(f.service.getSnapshot().branchError, 'Branch route unavailable'); await assert.rejects(f.service.saveDetails(id), /branch/);
});

test('an offline reload preserves existing locally saved setup drafts', async () => {
  const f = fixture(); await f.service.initialize(); const id = f.service.getSnapshot().apps[0].appId; f.service.updateDetails(id, { appName: 'Keep my draft' });
  const offlineApi = { ...f.api, meta: async () => { throw new Error('offline'); } };
  const offline = createRetailService({ api: offlineApi, context: f.context, user: f.user, storage: f.storage }); await offline.initialize();
  const restored = createRetailService({ api: f.api, context: f.context, user: f.user, storage: f.storage }); await restored.initialize();
  assert.equal(restored.getSnapshot().apps[0].appName, 'Keep my draft');
});

test('publishing an older theme response never clears newer unpublished edits', async () => {
  const f = fixture(); const id = await configured(f);
  let release; const response = new Promise(resolve => { release = resolve; }); const original = f.api.publishTheme;
  let started; const began = new Promise(resolve => { started = resolve; });
  f.api.publishTheme = async (...args) => { const published = await original(...args); started(); await response; return published; };
  const pending = f.service.publishTheme(id); await began;
  const changed = structuredClone(f.service.getSnapshot().apps[0].theme); changed.colors.brand = '#123456'; f.service.setTheme(id, changed); release(); await pending;
  assert.equal(f.service.getSnapshot().apps[0].themeDirty, true); assert.equal(f.service.permissions(id).canBuild, false);
});
test('unsaved details on an existing app remain a draft after refresh', async () => {
  const f = fixture(); const id = await configured(f); f.service.updateDetails(id, { appName: 'Unsaved rename' });
  const restored = createRetailService({ api: f.api, context: f.context, user: f.user, storage: f.storage }); await restored.initialize();
  assert.equal(restored.getSnapshot().apps[0].appName, 'Unsaved rename'); assert.equal(restored.getSnapshot().apps[0].detailsSaved, false);
});
