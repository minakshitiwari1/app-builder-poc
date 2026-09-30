import { useState } from 'react';

const PRODUCTS = [['🍅', 'Fresh Tomatoes', '₹45'], ['🥛', 'Organic Milk', '₹68'], ['🥔', 'Potato Chips', '₹30'], ['🍊', 'Orange Juice', '₹95']];
const CATEGORIES = [['🥬', 'Vegetables'], ['🥛', 'Dairy'], ['🍿', 'Snacks'], ['🥤', 'Drinks']];

// Approximates how the shared app's screens use the theme tokens.
export default function Preview({ appName, theme, iconUrl, splashUrl }) {
  const [screen, setScreen] = useState('home');
  const [device, setDevice] = useState('phone');
  const { colors: c, spacing: s, radii: r, typography: t, components } = theme;
  const button = components.button;
  const card = components.card;
  const size = key => Number(t.sizes[key]) || 14;
  const buttonStyle = {
    background: c.brand, color: c.brandContrast, border: 0,
    borderRadius: Number(button.radius), minHeight: Number(button.minHeight) * 0.75,
    fontSize: size('caption'), fontWeight: 700,
  };

  return (
    <aside className="preview">
      <div className="preview-head">
        <div><h2>Live Preview</h2><small>Updates as you edit</small></div>
        <div className="preview-tabs">
          {[['home', 'Home'], ['product', 'Product'], ['splash', 'Splash']].map(([id, label]) => (
            <button key={id} className={screen === id ? 'selected' : ''} onClick={() => setScreen(id)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="device-bar">
        {[['phone', 'Phone'], ['compact', 'Compact'], ['tablet', 'Tablet']].map(([id, label]) => (
          <button key={id} className={device === id ? 'selected' : ''} onClick={() => setDevice(id)}>{label}</button>
        ))}
      </div>
      <div className="preview-stage">
        <div className={`device-frame ${device}`} style={{ background: c.background, color: c.text, fontSize: size('body') * 0.85 }}>
          <div className="device-status">9:41 <span>● ● ▰</span></div>
          {screen === 'splash' ? (
            <div className="splash-screen" style={{ background: c.brand }}>
              {splashUrl ? <img src={splashUrl} alt="Splash screen" /> : <p style={{ color: c.brandContrast }}>Upload a splash screen</p>}
            </div>
          ) : (
            <>
              <header style={{ background: c.brand, color: c.brandContrast }}>
                {iconUrl && <img src={iconUrl} alt="" />}
                <b style={{ fontSize: size('title') * 0.85 }}>{appName || 'Your app'}</b>
                <span>♡ 🛒</span>
              </header>
              {screen === 'home' ? (
                <div className="preview-body" style={{ padding: Number(s.md) }}>
                  <section className="promo" style={{ background: c.accent, color: c.brandContrast, borderRadius: Number(r.lg) }}>
                    Fresh picks, delivered today<small>Explore popular essentials</small>
                  </section>
                  <h3 style={{ fontSize: size('title') * 0.8 }}>Shop by category</h3>
                  <div className="category-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                    {CATEGORIES.map(([icon, name]) => (
                      <div key={name}>
                        <i style={{ background: c.surfaceMuted, borderRadius: Number(r.md) }}>{icon}</i>
                        <small style={{ color: c.textMuted }}>{name}</small>
                      </div>
                    ))}
                  </div>
                  <h3 style={{ fontSize: size('title') * 0.8 }}>Popular products</h3>
                  <div className="product-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: Number(s.sm) }}>
                    {PRODUCTS.map(([icon, name, price]) => (
                      <article key={name} style={{ background: c.surface, borderColor: c.border, borderRadius: Number(card.radius), padding: Number(card.padding) * 0.7 }}>
                        <strong>{icon}</strong>
                        <div>
                          <b>{name}</b>
                          <small style={{ color: c.brand }}>{price}</small>
                          <button style={buttonStyle}>Add</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="preview-body detail-preview" style={{ padding: Number(s.md) }}>
                  <button className="back" style={{ color: c.brand }} onClick={() => setScreen('home')}>‹ Back</button>
                  <div className="detail-art" style={{ height: 160, background: c.surfaceMuted, borderRadius: Number(r.lg) }}>🍅</div>
                  <h2 style={{ fontSize: size('heading') * 0.8 }}>Fresh Tomatoes</h2>
                  <b style={{ color: c.brand }}>₹45</b>
                  <small style={{ color: c.success }}>In stock</small>
                  <p style={{ color: c.textMuted }}>Farm fresh tomatoes, picked for everyday cooking.</p>
                  <button className="preview-cta" style={{ ...buttonStyle, minHeight: Number(button.minHeight) }}>Add to Cart</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
