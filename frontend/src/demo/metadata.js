export const CONTEXT = { retailId: 'RET_82', branchId: 'RLC_151', branchName: 'HAWA HAMBER', retailName: 'TWINLEAVES', userName: 'MP' };
export const STEPS = ['Platforms', 'Developer accounts', 'App details', 'Branding', 'Theme', 'Test build', 'Production'];
export const STEP_PATHS = ['platforms', 'accounts', 'details', 'branding', 'theme', 'test', 'production'];
export const PLATFORM_NAMES = { ANDROID: 'Google Play Console', IOS: 'Apple Developer Account' };
export const SIGNUP_URLS = { ANDROID: 'https://play.google.com/console/signup', IOS: 'https://developer.apple.com/programs/enroll/' };
export const CONSOLE_URLS = { ANDROID: 'https://play.google.com/console/', IOS: 'https://appstoreconnect.apple.com/' };
export const INVITE_DETAILS = {
  ANDROID: { email: 'app-builder-play@example.com', role: 'Publishing permissions for your app' },
  IOS: { email: 'app-builder-apple@example.com', role: 'Admin with Certificates, Identifiers & Profiles access' },
};
export const SCENARIOS = {
  happy: 'Happy path', notFound: 'Account check failed', permission: 'Missing permission', pending: 'Pending confirmation', failed: 'Connection failed',
};
export const TEMPLATES = [
  { id: 'market-day', name: 'Market Day', category: 'Grocery & retail', description: 'A useful, product-first home for everyday shopping.', brand: '#196e66', accent: '#cfa461' },
  { id: 'atelier', name: 'Atelier', category: 'Boutique', description: 'A considered storefront for your latest collection.', brand: '#a45b3d', accent: '#e4b89f' },
  { id: 'the-table', name: 'The Table', category: 'Food & drink', description: 'Good food, a warm welcome, and a simple way to order.', brand: '#55527c', accent: '#b4adcc' },
];

const colors = {
  brand: ['Brand color', '#196e66'], brandContrast: ['Text on brand color', '#FFFFFF'], accent: ['Accent color', '#cfa461'],
  background: ['Background', '#F4F5F7'], surface: ['Card background', '#FFFFFF'], surfaceMuted: ['Muted background', '#E9EBED'],
  text: ['Text', '#1A2230'], textMuted: ['Secondary text', '#7C8494'], border: ['Borders', '#E5E7EB'],
  success: ['Success', '#20A476'], error: ['Error', '#DC3545'], warning: ['Warning', '#D99B32'],
};
const numberField = (path, label, value, min = 0, max = 128) => ({ path, group: path.split('.')[0], label, default: value, type: 'number', min, max });
export const THEME_FIELDS = [
  ...Object.entries(colors).map(([key, [label, value]]) => ({ path: `colors.${key}`, group: 'colors', label, default: value, type: 'color', pattern: '^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$' })),
  ...Object.entries({ xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }).map(([key, value]) => numberField(`spacing.${key}`, `Spacing ${key.toUpperCase()}`, value)),
  ...Object.entries({ sm: 4, md: 8, lg: 12, pill: 999 }).map(([key, value]) => numberField(`radii.${key}`, `Corner radius ${key}`, value, 0, key === 'pill' ? 999 : 128)),
  { path: 'typography.fontFamily', group: 'typography', label: 'Font', default: 'NunitoSans-Regular', type: 'select', options: ['NunitoSans-Regular'] },
  ...Object.entries({ caption: 12, body: 14, title: 18, heading: 24 }).map(([key, value]) => numberField(`typography.sizes.${key}`, `${key.charAt(0).toUpperCase() + key.slice(1)} size`, value, 8)),
  numberField('components.button.radius', 'Button corner radius', 8), numberField('components.button.minHeight', 'Button height', 40),
  numberField('components.card.radius', 'Card corner radius', 12), numberField('components.card.padding', 'Card padding', 12),
];
