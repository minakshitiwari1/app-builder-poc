const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..');
const defaultConfigPath = path.join(projectRoot, 'build-config.json');
const fail = message => {
  console.error(`Build configuration error: ${message}`);
  process.exit(1);
};

const configPath = (() => {
  const index = process.argv.indexOf('--config');
  if (index === -1) return defaultConfigPath;
  if (!process.argv[index + 1]) fail('--config requires a path');
  return path.resolve(process.cwd(), process.argv[index + 1]);
})();

let input;
try {
  input = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  fail(`could not read ${configPath}: ${error.message}`);
}

const requiredString = (value, field) => {
  if (typeof value !== 'string' || value.trim().length === 0) fail(`${field} is required`);
  if (/[\r\n]/.test(value)) fail(`${field} must not contain line breaks`);
  return value.trim();
};

if (!input || typeof input !== 'object' || !input.config || typeof input.config !== 'object') {
  fail('config must contain a config object');
}

const config = {
  buildId: requiredString(input.buildId, 'buildId'),
  tenantId: requiredString(input.config.tenantId, 'config.tenantId'),
  appName: requiredString(input.config.appName, 'config.appName'),
  environment: requiredString(input.config.environment, 'config.environment'),
  androidPackageName: requiredString(input.config.androidPackageName, 'config.androidPackageName'),
  primaryColor: requiredString(input.config.theme?.primaryColor, 'config.theme.primaryColor'),
};

if (!/^(?:[a-z][a-z0-9_]*\.)+[a-z][a-z0-9_]*$/.test(config.androidPackageName)) {
  fail('config.androidPackageName must be a valid lowercase Android package identifier');
}
if (!/^#(?:[\da-fA-F]{3}|[\da-fA-F]{4}|[\da-fA-F]{6}|[\da-fA-F]{8})$/.test(config.primaryColor)) {
  fail('config.theme.primaryColor must be a valid hex color');
}

const groovyString = value =>
  `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}'`;

const runtimeConfig = {
  buildId: config.buildId,
  tenantId: config.tenantId,
  appName: config.appName,
  environment: config.environment,
  primaryColor: config.primaryColor,
  theme: input.config.theme,
  typography: input.config.typography || {},
  buttonStyle: input.config.buttonStyle || {},
  cardStyle: input.config.cardStyle || {},
  header: input.config.header || {},
  layout: input.config.layout || {},
  features: input.config.features || {},
};

const pick = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
const numberPick = (value, allowed, fallback) => allowed.includes(Number(value)) ? Number(value) : fallback;
const colors = input.config.theme || {};
runtimeConfig.theme = {
  ...colors,
  primaryColor: config.primaryColor,
  secondaryColor: requiredString(colors.secondaryColor || '#FFB067', 'config.theme.secondaryColor'),
  backgroundColor: requiredString(colors.backgroundColor || '#FFFFFF', 'config.theme.backgroundColor'),
  surfaceColor: requiredString(colors.surfaceColor || '#FFFFFF', 'config.theme.surfaceColor'),
  textPrimaryColor: requiredString(colors.textPrimaryColor || colors.textPrimary || '#171717', 'config.theme.textPrimaryColor'),
  textSecondaryColor: requiredString(colors.textSecondaryColor || colors.textSecondary || '#666666', 'config.theme.textSecondaryColor'),
  borderColor: requiredString(colors.borderColor || '#E5E5E5', 'config.theme.borderColor'),
  cornerStyle: pick(colors.cornerStyle, ['square', 'soft', 'rounded'], 'rounded'),
  spacing: pick(colors.spacing, ['compact', 'comfortable', 'spacious'], 'comfortable'),
  typography: {
    fontFamily: pick(colors.typography?.fontFamily || input.config.typography?.fontFamily, ['System'], 'System'),
    headingWeight: pick(String(colors.typography?.headingWeight || input.config.typography?.headingWeight), ['600', '700', '800'], '700'),
    bodyWeight: pick(String(colors.typography?.bodyWeight || input.config.typography?.bodyWeight), ['400', '500'], '400'),
  },
};
runtimeConfig.components = {
  button: {
    variant: pick(input.config.components?.button?.variant || input.config.buttonStyle?.variant, ['filled', 'outline', 'soft'], 'filled'),
    shape: pick(input.config.components?.button?.shape, ['square', 'rounded', 'pill'], 'rounded'),
    height: pick(input.config.components?.button?.height, ['compact', 'standard', 'large'], 'standard'),
  },
  card: {
    variant: pick(input.config.components?.card?.variant, ['flat', 'bordered', 'elevated'], 'elevated'),
    shape: pick(input.config.components?.card?.shape, ['square', 'soft', 'rounded'], runtimeConfig.theme.cornerStyle),
  },
  header: { variant: pick(input.config.components?.header?.variant, ['primary', 'light', 'minimal'], 'primary') },
};
runtimeConfig.screens = {
  home: {
    categoryLayout: pick(input.config.screens?.home?.categoryLayout, ['grid', 'horizontal'], 'grid'),
    categoryColumns: numberPick(input.config.screens?.home?.categoryColumns, [3, 4], 4),
    productLayout: pick(input.config.screens?.home?.productLayout, ['grid', 'list'], 'grid'),
    productColumns: numberPick(input.config.screens?.home?.productColumns, [2, 3], 2),
    showBanner: input.config.screens?.home?.showBanner !== false,
  },
  productDetails: {
    imageStyle: pick(input.config.screens?.productDetails?.imageStyle, ['compact', 'large'], 'large'),
    showRating: input.config.screens?.productDetails?.showRating !== false,
    showDescription: input.config.screens?.productDetails?.showDescription !== false,
    stickyAddButton: input.config.screens?.productDetails?.stickyAddButton === true,
  },
};
const generatedSourcePath = path.join(projectRoot, 'src', 'generated', 'appConfig.js');
const generatedGradlePath = path.join(projectRoot, 'android', 'app', 'build-config.gradle');

fs.mkdirSync(path.dirname(generatedSourcePath), { recursive: true });
fs.writeFileSync(
  generatedSourcePath,
  `/* GENERATED by scripts/prepare-build.js. Do not edit manually. */\n\nconst appConfig = Object.freeze(${JSON.stringify(runtimeConfig, null, 2)});\n\nexport default appConfig;\n`
);
fs.writeFileSync(
  generatedGradlePath,
  `// GENERATED by scripts/prepare-build.js. Do not edit manually.\n\next {\n  appBuilderApplicationId = ${groovyString(config.androidPackageName)}\n  appBuilderAppName = ${groovyString(config.appName)}\n  appBuilderTenantId = ${groovyString(config.tenantId)}\n  appBuilderEnvironment = ${groovyString(config.environment)}\n  appBuilderPrimaryColor = ${groovyString(config.primaryColor)}\n  appBuilderBuildId = ${groovyString(config.buildId)}\n}\n`
);

const generateAndroidAssets = async () => {
  const assetsDirectory = path.join(projectRoot, 'build-assets');
  const resourcesDirectory = path.join(projectRoot, 'android/app/src/main/res');
  const iconPath = path.join(assetsDirectory, 'app-icon.png');
  const splashPath = path.join(assetsDirectory, 'splash.png');
  const splashLogoPngPath = path.join(resourcesDirectory, 'drawable', 'app_builder_splash_logo.png');
  const legacySplashLogoXmlPath = path.join(resourcesDirectory, 'drawable', 'app_builder_splash_logo.xml');
  const iconSizes = { 'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192 };

  // These are generated App Builder resources. Removing only these files makes
  // repeated runs deterministic and removes the legacy XML/PNG name conflict.
  fs.rmSync(splashLogoPngPath, { force: true });
  fs.rmSync(legacySplashLogoXmlPath, { force: true });

  if (input.config.branding?.appIconAsset) {
    if (!fs.existsSync(iconPath)) fail('configured app icon was not downloaded');
    for (const [directory, size] of Object.entries(iconSizes)) {
      const output = path.join(resourcesDirectory, directory);
      await sharp(iconPath).resize(size, size, { fit: 'cover' }).png().toFile(path.join(output, 'ic_launcher.png'));
      await sharp(iconPath).resize(size, size, { fit: 'cover' }).png().toFile(path.join(output, 'ic_launcher_round.png'));
    }
  }

  if (input.config.branding?.splashAsset) {
    if (!fs.existsSync(splashPath)) fail('configured splash logo was not downloaded');
    await sharp(splashPath).resize(300, 300, { fit: 'inside' }).png().toFile(splashLogoPngPath);
  } else {
    // Keep the splash wrapper valid for local/example builds without a client logo.
    await sharp({ create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .png()
      .toFile(splashLogoPngPath);
  }

  fs.writeFileSync(path.join(resourcesDirectory, 'values/app_builder_splash.xml'), `<resources><color name="app_builder_splash_background">${config.primaryColor}</color></resources>`);
};

generateAndroidAssets().then(() => console.log(`Prepared Android build for ${config.buildId} (${config.androidPackageName}).`)).catch(error => fail(error.message));
