import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import axios from 'axios';

const baseUrl = 'https://contract-test.ngrok-free.app/retail-service';
const variables = {
  baseUrl, retailId: 'RET_TEST', branchId: 'RLC_TEST', userId: 'test-user', userName: 'Test User',
  appId: 'APP_TEST', buildId: 'BUILD_TEST', merchantKey: 'testmerchant', brandColor: '#FF6B00',
  ciToken: 'test-ci-token', staffToken: 'test-staff-token',
};
const user = { id: variables.userId, name: variables.userName };
const substitute = value => value.replace(/\{\{(\w+)\}\}/g, (_, key) => {
  assert.ok(Object.hasOwn(variables, key), `Unknown Postman variable: ${key}`);
  return variables[key];
});
const contract = JSON.parse(substitute(await readFile(new URL('./postman-contract.json', import.meta.url), 'utf8')));
const source = await readFile(new URL('../src/api.js', import.meta.url), 'utf8');
const requests = [];
let responseBody = { es: 0, statusCode: 200, data: { ok: true } };
let failure;
axios.defaults.adapter = async config => {
  requests.push(config);
  if (failure) throw failure;
  return { data: responseBody, status: 200, headers: {}, config };
};

async function loadApi(base = baseUrl, overrides = {}) {
  const env = { VITE_API_BASE: base, VITE_CI_TOKEN: variables.ciToken, VITE_STAFF_TOKEN: variables.staffToken, VITE_ACCESS_TOKEN: 'test-login-token', ...overrides };
  const compiled = source.replace("'axios'", JSON.stringify(import.meta.resolve('axios')))
    .replaceAll('import.meta.env', JSON.stringify(env));
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}
const { api, themeFromFields } = await loadApi();
const file = new Blob(['test file']);

function invoke(name, sample) {
  const query = Object.fromEntries(new URL(sample.url).searchParams);
  const body = sample.body?.mode === 'raw' ? JSON.parse(sample.body.raw) : {};
  const form = Object.fromEntries((sample.body?.formdata || []).map(field => [field.key, field.value]));
  // Audit fields come from the workspace user, as they do in the UI.
  const input = Object.fromEntries(Object.entries(body).filter(([key]) => !['createdBy', 'createdByName', 'updatedBy', 'updatedByName'].includes(key)));
  switch (name) {
    case 'meta': case 'defaultTheme': case 'launchQueue': return api[name]();
    case 'listApps': case 'onboarding': case 'storeAccounts': return api[name](variables.retailId);
    case 'getApp': return api.getApp(variables.appId);
    case 'createApp': return api.createApp(input, user);
    case 'updateApp': return api.updateApp(variables.appId, input, user);
    case 'deleteApp': case 'publishTheme': return api[name](variables.appId, user);
    case 'saveTheme': return api.saveTheme(variables.appId, input.theme, user);
    case 'uploadAsset': return api.uploadAsset(variables.appId, 'ICON', file, user);
    case 'createBuild': return api.createBuild(variables.appId, input, user);
    case 'appBuilds': return api.appBuilds(variables.appId);
    case 'storeAccess': return api.storeAccess(variables.appId, query.platform);
    case 'dashboard': return api.dashboard({ ...query, page: Number(query.page), size: Number(query.size) });
    case 'getBuild': case 'retryDispatch': case 'ciConfig': return api[name](variables.buildId);
    case 'ciStatus': return api.ciStatus(variables.buildId, input);
    case 'updateOnboarding': return api.updateOnboarding(input, user);
    case 'connectAppleInvite': return api.connectAppleInvite(query.retailId, query.teamId, query.invitedConfirmed === 'true', user);
    case 'connectGooglePlay': return api.connectGooglePlay(query.retailId, query.developerAccountId, query.invitedConfirmed === 'true', user);
    case 'connectApple': return api.connectApple(form.retailId, { ...form, file }, user);
    case 'launchConfirm': return api.launchConfirm(query.retailId, 'GOOGLE_PLAY', query.staffUser);
    case 'launchProblem': return api.launchProblem(query.retailId, 'GOOGLE_PLAY', query.reason, query.staffUser);
    case 'reverifyStore': return api.reverifyStore(query.retailId, 'APPLE', user);
    case 'disconnectStore': return api.disconnectStore(query.retailId, 'GOOGLE_PLAY', user);
    default: throw new Error(`Missing test invocation for ${name}`);
  }
}

test('API requests follow the supplied Postman collection', async t => {
  for (const [name, sample] of Object.entries(contract.requests)) {
    await t.test(sample.name, async () => {
      const result = await invoke(name, sample);
      assert.deepEqual(result, responseBody.data);
      const actual = requests.at(-1);
      const expectedUrl = new URL(sample.url);
      const actualUrl = new URL(actual.baseURL.replace(/\/$/, '') + actual.url);
      assert.equal(actual.method.toUpperCase(), sample.method);
      assert.equal(actualUrl.pathname, expectedUrl.pathname);
      for (const [key, value] of expectedUrl.searchParams) {
        if (value !== '') assert.equal(String(actual.params[key]), value, `Query field ${key}`);
        else assert.ok(!Object.hasOwn(actual.params, key), `Omit empty filter ${key}`);
      }
      if (sample.body?.mode === 'raw') assert.deepEqual(JSON.parse(actual.data), JSON.parse(sample.body.raw));
      if (sample.body?.mode === 'formdata') {
        for (const field of sample.body.formdata) {
          if (field.type === 'file') assert.ok(actual.data.get(field.key) instanceof Blob);
          else assert.equal(actual.data.get(field.key), field.value, `Multipart field ${field.key}`);
        }
      }
      assert.equal(actual.headers.get('ngrok-skip-browser-warning'), 'true');
      if (sample.auth?.type === 'apikey') {
        const auth = Object.fromEntries(sample.auth.apikey.map(entry => [entry.key, entry.value]));
        assert.equal(actual.headers.get(auth.key), auth.value);
      }
    });
  }
});

test('CI and staff tokens stay on their respective clients', async () => {
  await api.meta();
  assert.equal(requests.at(-1).headers.has('X-App-Builder-Token'), false);
  assert.equal(requests.at(-1).headers.has('X-App-Builder-Staff-Token'), false);
  await api.ciConfig(variables.buildId);
  assert.equal(requests.at(-1).headers.get('X-App-Builder-Token'), variables.ciToken);
  assert.equal(requests.at(-1).headers.has('X-App-Builder-Staff-Token'), false);
  await api.launchQueue();
  assert.equal(requests.at(-1).headers.get('X-App-Builder-Staff-Token'), variables.staffToken);
  assert.equal(requests.at(-1).headers.has('X-App-Builder-Token'), false);
});

test('branch names retain their separate response format and sort by name', async () => {
  responseBody = { retailBranchNameBranchIdProjectionList: [{ branchId: '2', branchName: 'Zebra' }, { branchId: '1', branchName: 'Alpha' }] };
  assert.deepEqual((await api.stores('RET/TEST')).map(branch => branch.branchName), ['Alpha', 'Zebra']);
  assert.equal(requests.at(-1).url, '/branch/v1/names/RET%2FTEST');
  assert.equal(requests.at(-1).headers.get('ngrok-skip-browser-warning'), 'true');
  responseBody = { es: 0, data: { ok: true } };
});

test('local APIs do not receive the ngrok header', async () => {
  const local = await loadApi('http://localhost:8081/retail-service');
  await local.api.meta();
  assert.equal(requests.at(-1).headers.has('ngrok-skip-browser-warning'), false);
});

test('invalid responses and backend errors do not leave the UI connecting indefinitely', async () => {
  responseBody = '<html>ngrok warning page</html>';
  await assert.rejects(api.meta(), /Expected App Builder JSON/);
  responseBody = { es: 1, message: 'Invite Pallet before creating an app', statusCode: 412 };
  await assert.rejects(api.meta(), /Invite Pallet/);
  responseBody = { es: 0 };
  await assert.rejects(api.meta(), /without data/);
  responseBody = { es: 0, data: null };
  assert.equal(await api.deleteApp(variables.appId, user), null);
  failure = { response: { status: 404, data: '<html>ERR_NGROK_3200</html>' } };
  await assert.rejects(api.meta(), /ngrok tunnel.*offline/);
  failure = { response: { status: 409, data: { es: 1, message: 'App has a queued or running build' } } };
  await assert.rejects(api.deleteApp(variables.appId, user), /queued or running/);
  failure = undefined;
});

test('saved theme overrides backend defaults, with metadata filling missing fields', () => {
  const fields = [{ path: 'colors.brand', default: '#000000' }, { path: 'spacing.md', default: 8 }, { path: 'radii.md', default: 4 }];
  assert.deepEqual(themeFromFields(fields, { colors: { brand: '#FF6B00' } }, { colors: { brand: '#FFFFFF' }, spacing: { md: 16 } }),
    { colors: { brand: '#FF6B00' }, spacing: { md: 16 }, radii: { md: 4 } });
});

 test('merchant APIs use the collection at header; internal tokens never substitute for login', async () => {
  await api.onboarding(variables.retailId);
  assert.equal(requests.at(-1).headers.get('at'), 'test-login-token');
  await api.stores(variables.retailId).catch(() => {});
  assert.equal(requests.at(-1).headers.get('at'), 'test-login-token');
  assert.equal(requests.at(-1).headers.has('X-App-Builder-Staff-Token'), false);
});

test('development uses the same-origin proxy while production keeps the configured API base', async () => {
  const dev = await loadApi(baseUrl, { DEV: true }); await dev.api.meta();
  assert.equal(requests.at(-1).baseURL, '/__retail/app-builder/v1');
  assert.equal(requests.at(-1).headers.get('at'), 'test-login-token');
  const production = await loadApi(baseUrl, { DEV: false }); await production.api.meta();
  assert.equal(requests.at(-1).baseURL, baseUrl + '/app-builder/v1');
});
