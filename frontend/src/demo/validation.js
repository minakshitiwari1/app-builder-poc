import { getPath } from '../themeUtils.js';
import { THEME_FIELDS } from './metadata.js';

export function parseDeveloperId(value, platform) {
  const text = value.trim();
  if (platform === 'IOS') return text.toUpperCase();
  if (/^\d+$/.test(text)) return text;
  try {
    const url = new URL(text);
    if (url.hostname === 'play.google.com') return url.pathname.match(/\/developers\/(\d+)(?:\/|$)/)?.[1] || text;
  } catch { /* A plain ID is supported too. */ }
  return text;
}

export function validateDeveloperId(value, platform) {
  const id = parseDeveloperId(value, platform);
  if (!(platform === 'IOS' ? /^[A-Z0-9]{10}$/.test(id) : /^\d{10,25}$/.test(id))) {
    throw new Error(platform === 'IOS' ? 'Enter your 10-character Apple Team ID.' : 'Enter a numeric developer account ID or a Google Play Console URL.');
  }
  return id;
}

export function validateTheme(theme, fields = THEME_FIELDS) {
  for (const field of fields) {
    const value = getPath(theme, field.path);
    if (field.type === 'color' && !new RegExp(field.pattern).test(value || '')) throw new Error(`${field.label}: use a six- or eight-digit hex color.`);
    if (field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value) || value < field.min || value > field.max)) throw new Error(`${field.label}: enter a number from ${field.min} to ${field.max}.`);
    if (field.type === 'select' && !field.options.includes(value)) throw new Error(`Choose a supported ${field.label.toLowerCase()}.`);
  }
}

export function validateImage(file, dimensions, kind) {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choose a PNG or JPEG image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image no larger than 5 MB.');
  if (!dimensions.width || !dimensions.height || Math.max(dimensions.width, dimensions.height) > 4096) throw new Error('Images must be no more than 4096 px in either dimension.');
  if (kind === 'ICON' && (dimensions.width !== dimensions.height || dimensions.width < 512)) throw new Error('Your app icon must be square, between 512 and 4096 px.');
}

export function readImage(file, kind) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      try {
        validateImage(file, { width: image.naturalWidth, height: image.naturalHeight }, kind);
        resolve({ name: file.name, url, width: image.naturalWidth, height: image.naturalHeight, size: file.size });
      } catch (error) { URL.revokeObjectURL(url); reject(error); }
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be opened. Choose a valid PNG or JPEG.')); };
    image.src = url;
  });
}
