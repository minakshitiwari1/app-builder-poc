import { demoService } from './demo/demoService.js';

// Single adapter selection for every merchant screen. Replace this export with
// a backend adapter implementing the same operations/snapshot interface later.
// Demo is intentionally independent of VITE_API_BASE and real API credentials.
export const appBuilderService = demoService;
