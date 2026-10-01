import axios from 'axios';

// retail-service base URL, including the /retail-service context path.
export const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:8081/retail-service').replace(/\/$/, '');

// Only for local testing: lets the Builds page act as GitHub Actions and move a
// build through BUILDING / SUCCESS / FAILED. Never set this in a deployed build.
const CI_TOKEN = import.meta.env.VITE_CI_TOKEN || '';
export const canSimulateCi = CI_TOKEN.length > 0;

// Only for local testing: Pallet staff token for the Launch Console. In production the
// Launch Console belongs in Pallet's internal admin, behind staff login.
const STAFF_TOKEN = import.meta.env.VITE_STAFF_TOKEN || '';
export const canUseLaunchConsole = STAFF_TOKEN.length > 0;

const http = axios.create({ baseURL: `${API_BASE}/app-builder/v1` });
const staff = axios.create({ baseURL: `${API_BASE}/app-builder/v1/launch`, headers: { 'X-App-Builder-Staff-Token': STAFF_TOKEN } });
const ci = axios.create({ baseURL: `${API_BASE}/app-builder/ci/v1`, headers: { 'X-App-Builder-Token': CI_TOKEN } });

// retail-service answers {es, message, statusCode, data}; errors carry a readable message.
const unwrap = request =>
  request
    .then(response => response.data.data)
    .catch(error => {
      if (error.response?.data?.message) throw new Error(error.response.data.message);
      if (error.response) throw new Error(`Request failed (HTTP ${error.response.status})`);
      throw new Error(`Cannot reach retail-service at ${API_BASE}. Is it running?`);
    });

const clean = params => Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null));
const by = user => ({ updatedBy: user.id, updatedByName: user.name });

export const api = {
  meta: () => unwrap(http.get('/meta')),

  // The retail's stores (existing branch API): [{branchId, branchName}].
  stores: retailId => axios.get(`${API_BASE}/branch/v1/names/${encodeURIComponent(retailId)}`)
    .then(response => (response.data?.retailBranchNameBranchIdProjectionList || [])
      .sort((a, b) => (a.branchName || '').localeCompare(b.branchName || ''))),

  listApps: retailId => unwrap(http.get('/apps', { params: { retailId } })),
  getApp: appId => unwrap(http.get(`/apps/${appId}`)),
  createApp: (body, user) => unwrap(http.post('/apps', { ...body, createdBy: user.id, createdByName: user.name })),
  updateApp: (appId, body, user) => unwrap(http.put(`/apps/${appId}`, { ...body, ...by(user) })),
  deleteApp: (appId, user) => unwrap(http.delete(`/apps/${appId}`, { params: by(user) })),

  saveTheme: (appId, theme, user) => unwrap(http.put(`/apps/${appId}/theme`, { theme, ...by(user) })),
  publishTheme: (appId, user) => unwrap(http.post(`/apps/${appId}/theme/publish`, by(user))),

  uploadAsset: (appId, assetType, file, user) => {
    const form = new FormData();
    form.append('file', file);
    form.append('updatedBy', user.id);
    form.append('updatedByName', user.name);
    return unwrap(http.post(`/apps/${appId}/assets/${assetType}`, form));
  },

  createBuild: (appId, body, user) =>
    unwrap(http.post(`/apps/${appId}/builds`, { ...body, createdBy: user.id, createdByName: user.name })),
  storeAccess: (appId, platform) => unwrap(http.get(`/apps/${appId}/store-access`, { params: { platform } })),
  dashboard: params => unwrap(http.get('/builds', { params: clean(params) })),
  getBuild: buildId => unwrap(http.get(`/builds/${buildId}`)),
  retryDispatch: buildId => unwrap(http.post(`/builds/${buildId}/dispatch`)),

  onboarding: retailId => unwrap(http.get('/onboarding', { params: { retailId } })),
  updateOnboarding: (answers, user) => unwrap(http.put('/onboarding', { ...answers, ...by(user) })),
  connectAppleInvite: (retailId, teamId, invitedConfirmed, user) =>
    unwrap(http.post('/store-accounts/APPLE/invite', null, { params: { retailId, teamId, invitedConfirmed, ...by(user) } })),
  launchQueue: () => unwrap(staff.get('/queue')),
  launchConfirm: (retailId, storeType, staffUser) =>
    unwrap(staff.post(`/store-accounts/${storeType}/confirm`, null, { params: { retailId, staffUser } })),
  launchProblem: (retailId, storeType, reason, staffUser) =>
    unwrap(staff.post(`/store-accounts/${storeType}/problem`, null, { params: { retailId, reason, staffUser } })),

  storeAccounts: retailId => unwrap(http.get('/store-accounts', { params: { retailId } })),
  // Google Play: no key file. The merchant invites Pallet's service account and gives the developer ID.
  connectGooglePlay: (retailId, developerAccountId, invitedConfirmed, user) =>
    unwrap(http.post('/store-accounts/GOOGLE_PLAY', null, {
      params: { retailId, developerAccountId, invitedConfirmed, ...by(user) },
    })),
  connectApple: (retailId, { keyId, issuerId, teamId, file }, user) => {
    const form = new FormData();
    form.append('retailId', retailId);
    form.append('keyId', keyId);
    form.append('issuerId', issuerId);
    form.append('privateKey', file);
    if (teamId) form.append('teamId', teamId);
    form.append('updatedBy', user.id);
    form.append('updatedByName', user.name);
    return unwrap(http.post('/store-accounts/APPLE', form));
  },
  reverifyStore: (retailId, storeType, user) =>
    unwrap(http.post(`/store-accounts/${storeType}/verify`, null, { params: { retailId, ...by(user) } })),
  disconnectStore: (retailId, storeType, user) =>
    unwrap(http.delete(`/store-accounts/${storeType}`, { params: { retailId, ...by(user) } })),

  ciConfig: buildId => unwrap(ci.get(`/builds/${buildId}/config`)),
  ciStatus: (buildId, body) => unwrap(ci.post(`/builds/${buildId}/status`, body)),
};

// Theme helpers: the backend describes every token as {path: 'colors.brand', default, ...}.
export const getPath = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);

export const setPath = (object, path, value) => {
  const copy = structuredClone(object);
  const keys = path.split('.');
  let node = copy;
  keys.slice(0, -1).forEach(key => {
    node[key] ??= {};
    node = node[key];
  });
  node[keys.at(-1)] = value;
  return copy;
};

export const themeFromFields = (fields, saved) =>
  fields.reduce((theme, field) => {
    const savedValue = getPath(saved, field.path);
    return setPath(theme, field.path, savedValue ?? field.default);
  }, {});

export const copyText = async (text, onResult) => {
  try {
    await navigator.clipboard.writeText(text);
    onResult?.({ text: 'Copied to clipboard.' });
  } catch {
    onResult?.({ text: 'Copy failed; select the text and copy it.', error: true });
  }
};

export const formatDate = value =>
  value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
