/* Login + Connect modal */
/* global React, Ic, BrandMark */

const { useState: useL } = React;

function LoginScreen({ onAuth, theme, setTheme }) {
  const onSubmit = onAuth;
  const [email, setEmail] = useL('james.radcliffe@example.com');
  const [pw, setPw] = useL('••••••••••••');
  return (
    <div className="login-wrap">
      <aside className="login-aside">
        <div className="login-aside-brand">
          <BrandMark size={30}/>
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>Vivid Capital</div>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: '0.18em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>Client Portal</div>
          </div>
        </div>

        <div style={{ marginTop: 80, position: 'relative' }}>
          <h1 className="login-headline">
            Your capital, <em>observed</em> — not narrated.
          </h1>
          <p style={{ fontSize: 14.5, color: 'var(--ink-2)', maxWidth: '40ch', marginTop: 20, lineHeight: 1.6 }}>
            Connect any MT4 or MT5 account and watch balance, equity, positions, and P&amp;L stream in real time.
          </p>

          <div className="login-kpis">
            <div className="lk">
              <div className="lk-k">Data latency</div>
              <div className="lk-v">&lt;350ms</div>
            </div>
            <div className="lk">
              <div className="lk-k">Brokers supported</div>
              <div className="lk-v">140+</div>
            </div>
            <div className="lk">
              <div className="lk-k">Uptime 12mo</div>
              <div className="lk-v">99.98%</div>
            </div>
            <div className="lk">
              <div className="lk-k">Accounts</div>
              <div className="lk-v">MT4 · MT5</div>
            </div>
          </div>
        </div>

        <div className="login-aside-foot">
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: '0.14em', color: 'var(--ink-4)', textTransform: 'uppercase' }}>
            © 2026 Vivid Capital Portal LLC
          </div>
        </div>
      </aside>

      <main className="login-main">
        <div className="login-form-wrap">
          <div>
            <h2>Sign in to the portal</h2>
            <div className="sub">Welcome back. Enter your credentials to continue.</div>
          </div>
          <form className="login-form" onSubmit={e => { e.preventDefault(); onSubmit(); }}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus/>
            </div>
            <div className="field">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Password</span>
                <a href="#" style={{ color: 'var(--ink-3)', textTransform: 'none', letterSpacing: 'normal', fontFamily: 'var(--sans)', fontSize: 11.5 }}>Forgot?</a>
              </label>
              <input type="password" value={pw} onChange={e => setPw(e.target.value)}/>
            </div>
            <button type="submit" className="btn primary" style={{ height: 40, marginTop: 4, justifyContent: 'center' }}>
              Sign in
            </button>
          </form>
          <div className="login-meta">
            <span>Secured by TLS</span>
            <span><a href="#">Need help?</a></span>
          </div>
        </div>
      </main>
    </div>
  );
}

function ConnectModal({ onClose, onSubmit }) {
  const [platform, setPlatform] = useL('MT5');
  const [server, setServer] = useL('');
  const [login, setLogin] = useL('');
  const [pw, setPw] = useL('');
  const [broker, setBroker] = useL('IC Markets');

  const brokers = ['IC Markets', 'Pepperstone', 'Saxo Bank', 'FP Markets', 'FXCM', 'OANDA', 'Admiral Markets', 'Tickmill', 'Other'];

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3 className="modal-title">Connect a trading account</h3>
            <div className="modal-sub">MetaTrader 4 or MetaTrader 5 — any broker.</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Ic.x /></button>
        </div>
        <div className="modal-body">
          <div className="platform-toggle">
            <button className={platform === 'MT4' ? 'active' : ''} onClick={() => setPlatform('MT4')}>
              MetaTrader 4
            </button>
            <button className={platform === 'MT5' ? 'active' : ''} onClick={() => setPlatform('MT5')}>
              MetaTrader 5
            </button>
          </div>

          <div className="field">
            <label>Broker</label>
            <select value={broker} onChange={e => setBroker(e.target.value)}>
              {brokers.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Server</label>
            <input className="mono" placeholder="e.g. ICMarkets-Live05" value={server} onChange={e => setServer(e.target.value)}/>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Login number</label>
              <input className="mono" placeholder="52418903" value={login} onChange={e => setLogin(e.target.value)}/>
            </div>
            <div className="field">
              <label>Password</label>
              <input className="mono" type="password" placeholder="••••••••" value={pw} onChange={e => setPw(e.target.value)}/>
            </div>
          </div>

          <div className="modal-note">
            <strong>Read-only by default.</strong> We use the investor password for market-data access.
            We never place, modify, or close trades — connection can be revoked at any time from Accounts.
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => onSubmit({ platform, server, login, broker })}>
            Connect account →
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LoginScreen });
