const radii: Record<string, number> = { square: 0, soft: 10, rounded: 20 };
const spaces: Record<string, number> = { compact: 8, comfortable: 16, spacious: 24 };
const readable = (hex: string) => {
  const value = hex.replace('#', '');
  if (value.length !== 6) return '#FFFFFF';
  const [r, g, b] = [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16));
  return r * 299 + g * 587 + b * 114 > 155000 ? '#171717' : '#FFFFFF';
};

export const createTheme = (config: any) => {
  const source = config.theme || {};
  const base = spaces[source.spacing] || spaces.comfortable;
  const corner = radii[source.cornerStyle] ?? radii.rounded;
  const components = config.components || {};
  const button = components.button || {};
  const card = components.card || {};
  return {
    colors: { primary: source.primaryColor || config.primaryColor || '#F58220', secondary: source.secondaryColor || '#FFB067', background: source.backgroundColor || '#FFFFFF', surface: source.surfaceColor || '#FFFFFF', textPrimary: source.textPrimaryColor || '#171717', textSecondary: source.textSecondaryColor || '#666666', border: source.borderColor || '#E5E5E5', onPrimary: readable(source.primaryColor || config.primaryColor || '#F58220') },
    spacing: { xs: Math.round(base / 2), sm: base, md: base * 1.5, lg: base * 2 },
    radius: { sm: Math.max(0, corner / 2), md: corner, lg: corner + 8, button: button.shape === 'pill' ? 999 : button.shape === 'square' ? 0 : corner, card: radii[card.shape] ?? corner },
    typography: { heading: { fontFamily: 'System', fontWeight: source.typography?.headingWeight || '700' }, body: { fontFamily: 'System', fontWeight: source.typography?.bodyWeight || '400' } },
    components: { button: { variant: button.variant || 'filled', height: ({ compact: 40, standard: 48, large: 56 } as any)[button.height] || 48 }, card: { variant: card.variant || 'elevated' }, header: { variant: components.header?.variant || 'primary' } },
    screens: config.screens || {},
  };
};
