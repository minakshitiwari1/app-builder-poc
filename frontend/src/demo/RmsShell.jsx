import { useEffect, useRef, useState } from 'react';
import { Icon } from '../ui';

export default function RmsShell({ children, context, app, template, onBack, onSave, onPublish, onNavigate, onPreview, saving, publishing, mode = 'demo' }) {
  const real = mode === 'real';
  const [menu, setMenu] = useState('');
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menu) return;
    const close = event => { if (event.type === 'keydown' ? event.key === 'Escape' : !menuRef.current?.contains(event.target)) setMenu(''); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [menu]);
  return <div className="rms-shell">
    <nav className="rms-rail" aria-label="RMS navigation">
      <button className="rms-logo-button" aria-label="Open app templates" onClick={() => onNavigate('apps')}><span className="rms-rack-logo"><i /><i /><i /></span><span className="logo-exit"><Icon name="logout" /></span></button>
      <div className="rail-links"><button className="rail-switch" aria-label="App templates" title="App templates" onClick={() => onNavigate('apps')}><Icon name="swap" size={25} /></button><button className="rail-ai" aria-label="App Builder" title="App Builder" onClick={() => onNavigate('builder')}><span>AI</span></button></div>
      <button className="rail-bottom" aria-label="Builds dashboard" title="Builds dashboard" onClick={() => onNavigate('builds')}><Icon name="grid" size={23} /></button>
    </nav>
    <div className="rms-main">
      <header className="rms-topbar" ref={menuRef}>
        <div className="rms-top-actions"><div className="menu-anchor"><button className="btn btn-primary quick-action" aria-expanded={menu === 'quick'} onClick={() => setMenu(menu === 'quick' ? '' : 'quick')}>Quick Action <Icon name="down" /> </button>
          {menu === 'quick' && <div className="rms-popover"><button onClick={() => { setMenu(''); onNavigate('apps'); }}>Create a new app</button><button onClick={() => { setMenu(''); onNavigate('builds'); }}>View all builds</button><button onClick={() => { setMenu(''); onNavigate('builder'); }}>Continue app setup</button></div>}</div>
          <div className="menu-anchor"><button className="store-context" aria-expanded={menu === 'context'} onClick={() => setMenu(menu === 'context' ? '' : 'context')}><span className="context-pin"><Icon name="pin" /></span><span><strong>{context.branchName}</strong><small>{context.retailName}</small></span></button>
            {menu === 'context' && <div className="rms-popover context-details"><strong>Current {real ? 'API' : 'demo'} store</strong><p>{context.branchName}</p><small>{context.retailId} · {context.branchId}</small></div>}</div>
          <span className="topbar-divider" /><button className="topbar-icon" aria-label="Show cart preview" onClick={() => { setMenu(''); onPreview('cart'); }}><Icon name="cart" size={26} /></button>
          <div className="menu-anchor"><button className="topbar-icon" aria-label="Notifications" aria-expanded={menu === 'notifications'} onClick={() => setMenu(menu === 'notifications' ? '' : 'notifications')}><Icon name="bell" size={25} /></button>
            {menu === 'notifications' && <div className="rms-popover context-details"><strong>Notifications</strong><p>No new notifications.</p></div>}</div>
          <div className="menu-anchor"><button className="profile-avatar" aria-label="Profile" aria-expanded={menu === 'profile'} onClick={() => setMenu(menu === 'profile' ? '' : 'profile')}>{context.userName}</button>
            {menu === 'profile' && <div className="rms-popover context-details"><strong>RMS {real ? 'API' : 'demo'} workspace</strong><p>Your App Builder workspace.</p><small>{real ? 'Using the configured POC login token.' : 'No RMS sign-in is required.'}</small></div>}</div>
        </div>
      </header>
      <header className="builder-toolbar"><div className="toolbar-identity"><button className="toolbar-back" aria-label="Back to app templates" onClick={onBack}><Icon name="arrowLeft" size={23} /></button><span className="toolbar-divider" /><span className="toolbar-phone"><Icon name="phone" size={23} /></span><div><h1>App Builder</h1><p>{app ? `${app.appName} • ${template?.name || 'Market Day'} · ${real ? 'API mode' : 'Demo mode'}` : 'Omnichannel · Your shopping apps'}</p></div></div>
        {app && <div className="toolbar-actions"><span className="draft-status"><i />{saving ? 'Saving draft…' : app.updatedAt ? (real ? 'Draft saved' : 'Demo draft saved') : (real ? 'Draft' : 'Demo draft')}</span><button className="btn btn-secondary" disabled={saving || publishing} onClick={onSave}>{saving ? 'Saving…' : 'Save draft'}</button><button className="btn btn-primary" disabled={saving || publishing} onClick={onPublish}>{publishing ? 'Publishing…' : 'Publish theme'}</button></div>}
        {!app && <button className="btn btn-secondary" onClick={() => onNavigate('builds')}>View all builds</button>}
      </header>
      {children}
    </div>
  </div>;
}
