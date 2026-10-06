import { getPath, setPath } from './themeUtils';

const GROUP_TITLES = {
  colors: ['Colors', 'Brand, background and text colors'],
  spacing: ['Spacing', 'Space between items'],
  radii: ['Corners', 'How round cards and images are'],
  typography: ['Text', 'Font sizes'],
  components: ['Buttons and cards', 'Size and shape of buttons and cards'],
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
      {Object.entries(groups).map(([group, groupFields], index) => {
        const [title, hint] = GROUP_TITLES[group] || [group, ''];
        const swatches = groupFields.filter(field => field.type === 'color').map(field => getPath(theme, field.path));
        return (
          <details key={group} className="theme-group" open={index === 0}>
            <summary>
              <span><b>{title}</b><small>{hint}</small></span>
              {swatches.length > 0 && (
                <span className="swatch-row" aria-hidden="true">
                  {swatches.slice(0, 6).map((color, i) => <i key={i} style={{ background: color }} />)}
                </span>
              )}
            </summary>
            <div className="theme-grid">
              {groupFields.map(field => {
                const value = getPath(theme, field.path) ?? '';
                const id = `theme-${field.path}`;
                if (field.type === 'color') {
                  const pickerValue = /^#[0-9a-f]{6}/i.test(value) ? value.slice(0, 7) : '#000000';
                  return (
                    <label key={field.path} htmlFor={id} className="field">
                      <span className="field-label">{field.label}</span>
                      <span className="color-input">
                        <span className="color-swatch" style={{ background: value }}>
                          <input type="color" aria-label={`${field.label} picker`} value={pickerValue}
                            onChange={e => update(field, e.target.value.toUpperCase())} />
                        </span>
                        <input id={id} value={value} spellCheck={false} onChange={e => update(field, e.target.value)} />
                      </span>
                    </label>
                  );
                }
                if (field.type === 'number') {
                  return (
                    <label key={field.path} htmlFor={id} className="field">
                      <span className="field-label">{field.label} <small>{field.min}–{field.max}</small></span>
                      <input id={id} type="number" min={field.min} max={field.max} value={value}
                        onChange={e => update(field, e.target.value)} />
                    </label>
                  );
                }
                return (
                  <label key={field.path} htmlFor={id} className="field">
                    <span className="field-label">{field.label}</span>
                    <select id={id} value={value} onChange={e => update(field, e.target.value)}>
                      {field.options.map(option => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
