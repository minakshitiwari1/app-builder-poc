import { demoService } from './demo/demoService.js';
import { createRetailService } from './services/retailService.js';
import { api, API_BASE } from './api.js';

// Single adapter selection for every merchant screen. Real mode is the default;
// demo must be explicitly selected and never handles a real connection failure.
let storage;
try { storage = window.localStorage; } catch { /* Backend requests still work without browser storage. */ }
const userName = import.meta.env.VITE_USER_NAME || 'POC User';
export const appBuilderService = import.meta.env.VITE_APP_BUILDER_MODE === 'demo' ? demoService : createRetailService({
  api, storage, namespace: API_BASE,
  user: { id: import.meta.env.VITE_USER_ID || 'poc-user', name: userName },
  context: { retailId: import.meta.env.VITE_RETAIL_ID || '', branchId: import.meta.env.VITE_BRANCH_ID || '',
    branchName: import.meta.env.VITE_BRANCH_ID || '', retailName: import.meta.env.VITE_RETAIL_ID || '',
    userName: userName.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase() },
});
