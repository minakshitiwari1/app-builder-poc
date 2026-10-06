export default function Preview({ appName, theme, iconUrl, splashUrl, screen, onScreenChange, compact = false }) {
  const { colors, radii, spacing, typography, components } = theme;
  const previewStyle = {
    '--phone-brand': colors.brand, '--phone-accent': colors.accent, '--phone-on-brand': colors.brandContrast,
    '--phone-bg': colors.background, '--phone-text': colors.text, '--phone-muted': colors.textMuted,
    '--phone-surface': colors.surface, '--phone-soft': colors.surfaceMuted, '--phone-border': colors.border,
    '--phone-success': colors.success, '--phone-radius': `${radii.lg}px`, '--phone-card-radius': `${components.card.radius}px`,
    '--phone-padding': `${Math.max(0, Math.min(24, components.card.padding))}px`, '--phone-gap': `${Math.max(0, Math.min(20, spacing.sm))}px`,
    '--phone-body': `${Math.max(9, Math.min(20, typography.sizes.body))}px`,
    '--phone-title': `${Math.max(12, Math.min(28, typography.sizes.heading))}px`,
    '--phone-button-radius': `${components.button.radius}px`, '--phone-button-height': `${Math.min(60, components.button.minHeight * .7)}px`,
  };
  return <aside className={`preview ${compact ? 'preview-compact' : ''}`}>
    {!compact && <><div className="section-heading"><h3>Live app preview</h3><span className="demo-badge">ILLUSTRATIVE</span></div>
      <div className="preview-tabs" role="tablist" aria-label="Preview screen">{['Home', 'Product', 'Cart', 'Splash'].map(name =>
        <button key={name} role="tab" aria-selected={screen === name.toLowerCase()} className={screen === name.toLowerCase() ? 'active' : ''} onClick={() => onScreenChange(name.toLowerCase())}>{name}</button>)}</div></>}
    <div className="phone-frame" style={previewStyle}><div className="phone-notch" /><div className="phone-content">
      {screen === 'splash' ? <div className="phone-splash">{splashUrl ? <img src={splashUrl} alt="Splash screen preview" /> : <><div className="phone-app-letter">{(appName || 'U')[0]}</div><strong>{appName}</strong><small>Your neighbourhood, on your phone</small></>}</div> : <>
        <div className="phone-header"><div className="phone-app-title">{iconUrl ? <img src={iconUrl} alt="App icon preview" /> : <span className="phone-app-letter">{(appName || 'U')[0]}</span>}<strong>{appName || 'Untitled app'}</strong></div>
          <p>Your neighbourhood, on your phone</p><div className="phone-search">Search products</div></div>
        {screen === 'home' && <div className="phone-body"><div className="phone-promo"><small>MADE FOR YOUR STORE</small><strong>Good things, close<br />by.</strong></div><h3>Shop by category</h3>
          <div className="phone-categories">{['Fresh produce', 'Pantry picks'].map(name => <div className="phone-category" key={name}><div className="phone-placeholder" /><span>{name}</span><button onClick={() => onScreenChange('product')}>Explore</button></div>)}</div>
          <p className="phone-delivery">Delivery available · Today</p></div>}
        {screen === 'product' && <div className="phone-body phone-product"><button className="phone-back" onClick={() => onScreenChange('home')}>‹ Back</button><div className="phone-product-art">Fresh produce</div><h3>Fresh Tomatoes</h3><strong>₹45 / 500 g</strong><p>Fresh picks for your everyday shopping.</p><button className="phone-cta" onClick={() => onScreenChange('cart')}>Add to cart</button></div>}
        {screen === 'cart' && <div className="phone-body phone-product"><h3>Your cart</h3><div className="phone-cart-item"><span>Fresh Tomatoes<small>500 g · 1 item</small></span><strong>₹45</strong></div><p>Delivery available today</p><div className="phone-cart-item"><strong>Total</strong><strong>₹45</strong></div><button className="phone-cta" onClick={() => onScreenChange('home')}>Continue shopping</button></div>}
        <div className="phone-bottom-nav">{[['Home', 'home'], ['Browse', 'product'], ['Cart', 'cart'], ['You', 'home']].map(([name, value]) => <button key={name} onClick={() => onScreenChange(value)}>{name}</button>)}</div>
      </>}
    </div></div>
    {!compact && <p className="preview-caption">Draft-responsive illustration; it does not validate a mobile build.</p>}
  </aside>;
}
