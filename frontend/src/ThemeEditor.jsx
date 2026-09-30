import { getPath, setPath } from './api';

const GROUP_TITLES = {
  colors: 'Colors',
  spacing: 'Spacing',
  radii: 'Corners',
  typography: 'Text',
  components: 'Buttons and cards',
};

// Renders one input per theme field from /meta, so the form always matches
// what the backend (and the mobile app) accept.
export default function ThemeEditor({ fields, theme, onChange }) {
  const groups = fields.reduce((map, field) => {
    (map[field.group] ??= []).push(field);
    return map;
  }, {});

  const update = (field, raw) => {
    const value = field.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw;
    onChange(setPath(theme, field.path, value));
  };

  return (
    <div className="theme-editor">
      {Object.entries(groups).map(([group, groupFields]) => (
        <fieldset key={group}>
          <legend>{GROUP_TITLES[group] || group}</legend>
          <div className="theme-grid">
            {groupFields.map(field => {
              const value = getPath(theme, field.path) ?? '';
              const id = `theme-${field.path}`;
              if (field.type === 'color') {
                const pickerValue = /^#[0-9a-f]{6}/i.test(value) ? value.slice(0, 7) : '#000000';
                return (
                  <label key={field.path} htmlFor={id}>
                    {field.label}
                    <span className="color-input">
                      <input type="color" aria-label={`${field.label} picker`} value={pickerValue}
                        onChange={e => update(field, e.target.value.toUpperCase())} />
                      <input id={id} value={value} onChange={e => update(field, e.target.value)} />
                    </span>
                  </label>
                );
              }
              if (field.type === 'number') {
                return (
                  <label key={field.path} htmlFor={id}>
                    {field.label} <small>({field.min}–{field.max})</small>
                    <input id={id} type="number" min={field.min} max={field.max} value={value}
                      onChange={e => update(field, e.target.value)} />
                  </label>
                );
              }
              return (
                <label key={field.path} htmlFor={id}>
                  {field.label}
                  <select id={id} value={value} onChange={e => update(field, e.target.value)}>
                    {field.options.map(option => <option key={option}>{option}</option>)}
                  </select>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
