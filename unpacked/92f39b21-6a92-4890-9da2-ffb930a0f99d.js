/* Shell: sidebar + topbar */
/* global React, Ic, BrandMark */

const { useState: useStateShell } = React;

function Sidebar({ route, setRoute, accountsCount, positionsCount }) {
  const item = (key, label, icon, count) => (
    <button
      className={`nav-item ${route === key ? 'active' : ''}`}
      onClick={() => setRoute(key)}
    >
      {icon}
      <span>{label}</span>
      {count != null && <span className="count">{count}</span>}
    </button>
  );
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BrandMark size={26} />
        <div>
          <div className="name">Vivid Capital</div>
          <div className="sub">Portal</div>
        </div>
      </div>

      <div className="nav-section">Overview</div>
      {item('dashboard', 'Dashboard', <Ic.dash />)}

      <div className="nav-section">Trading</div>
      {item('accounts', 'Accounts', <Ic.accounts />, accountsCount)}
      {item('positions', 'Positions', <Ic.positions />, positionsCount)}
      {item('history', 'Trade History', <Ic.history />)}

      <div className="nav-section">Account</div>
      <button className="nav-item"><Ic.bell /><span>Alerts</span></button>
      <button className="nav-item"><Ic.gear /><span>Settings</span></button>

      <div className="sidebar-foot">
        <div className="sidebar-user">
          <div className="avatar">JR</div>
          <div className="sidebar-user-meta">
            <span className="n truncate">James Radcliffe</span>
            <span className="s">Client · 039281</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ route, accounts, activeAccountId, setActiveAccountId, theme, setTheme, onConnect }) {
  const crumbs = {
    dashboard: 'Dashboard',
    accounts: 'Accounts',
    positions: 'Open Positions',
    history: 'Trade History',
  }[route] || '';
  const [open, setOpen] = useStateShell(false);
  const active = activeAccountId === 'all'
    ? { label: 'All accounts', sub: `${accounts.filter(a => a.status === 'live').length} live` }
    : (() => {
        const a = accounts.find(x => x.id === activeAccountId);
        return a ? { label: a.label, sub: `${a.platform} · ${a.broker} · ${a.login}` } : { label: '—', sub: '' };
      })();

  return (
    <header className="topbar">
      <div className="crumbs">
        <span>Portal</span>
        <span>/</span>
        <span className="cur">{crumbs}</span>
      </div>

      <div className="topbar-actions">
        <span className="live-pill"><span className="pulse"></span>Live</span>
        <div style={{ position: 'relative' }}>
          <button className="account-switcher" onClick={() => setOpen(o => !o)}>
            <span className="dot" style={{ background: active.sub ? 'var(--up)' : 'var(--ink-3)' }}></span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
              <span style={{ fontWeight: 500 }}>{active.label}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.04em' }}>{active.sub}</span>
            </div>
            <span className="caret"><Ic.caret /></span>
          </button>
          {open && (
            <div onMouseLeave={() => setOpen(false)} style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)',
              background: 'var(--surface)', border: '1px solid var(--rule-strong)',
              borderRadius: 'var(--radius)', minWidth: 280, zIndex: 50,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              padding: 4,
            }}>
              <button
                className="nav-item"
                style={{ width: '100%', textAlign: 'left' }}
                onClick={() => { setActiveAccountId('all'); setOpen(false); }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--up)' }}></span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>All accounts</span>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Aggregate view</span>
                </div>
              </button>
              {accounts.map(a => (
                <button
                  key={a.id}
                  className="nav-item"
                  style={{ width: '100%', textAlign: 'left' }}
                  onClick={() => { setActiveAccountId(a.id); setOpen(false); }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.status === 'live' ? 'var(--up)' : a.status === 'pending' ? 'var(--warn)' : 'var(--ink-3)' }}></span>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span className="truncate">{a.label}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>{a.platform} · {a.login}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="btn" onClick={onConnect}><Ic.plus />Connect account</button>
        <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
          {theme === 'dark' ? <Ic.sun /> : <Ic.moon />}
        </button>
      </div>
    </header>
  );
}

Object.assign(window, { Sidebar, Topbar });
