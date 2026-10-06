export const getPath = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);

export const setPath = (object, path, value) => {
  const copy = structuredClone(object);
  const keys = path.split('.');
  let node = copy;
  keys.slice(0, -1).forEach(key => { node[key] ??= {}; node = node[key]; });
  node[keys.at(-1)] = value;
  return copy;
};

export const themeFromFields = (fields, saved, defaults) => fields.reduce((theme, field) =>
  setPath(theme, field.path, getPath(saved, field.path) ?? getPath(defaults, field.path) ?? field.default), {});

export const copyText = async (text, onResult) => {
  try { await navigator.clipboard.writeText(text); onResult?.({ text: 'Copied to clipboard.' }); }
  catch { onResult?.({ text: 'Copy failed; select the text and copy it.', error: true }); }
};

export const formatDate = value => value
  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
