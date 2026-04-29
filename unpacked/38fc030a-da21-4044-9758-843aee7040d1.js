/* Connect account modal */
/* global React, Ic */

const { useState: useConn } = React;

function ConnectModal({ onClose, onConfirm }) {
  const [platform, setPlatform] = useConn('MT5');
  const [step, setStep] = useConn('form'); // form | connecting | done
  const [form, setForm] = useConn({
    broker: '',
    server: '',
    login: '',
    password: '',
    label: '',
  });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    setStep('connecting');
    setTimeout(() => setStep('done'), 1600);
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2 className="modal-title">Connect MetaTrader account</h2>
            <div className="modal-sub">Read-only credentials are never stored in plaintext. We establish a TLS tunnel to your broker.</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Ic.x /></button>
        </div>

        {step === 'form' && (
          <form onSubmit={submit}>
            <div className="modal-body">
              <div className="platform-toggle">
                <button type="button" className={platform === 'MT4' ? 'active' : ''} onClick={() => setPlatform('MT4')}>MetaTrader 4</button>
                <button type="button" className={platform === 'MT5' ? 'active' : ''} onClick={() => setPlatform('MT5')}>MetaTrader 5</button>
              </div>

              <div className="field">
                <label>Broker</label>
                <select value={form.broker} onChange={set('broker')} required>
                  <option value="">Select broker…</option>
                  <option>IC Markets</option>
                  <option>Pepperstone</option>
                  <option>Saxo Bank</option>
                  <option>FP Markets</option>
                  <option>Tickmill</option>
                  <option>ThinkMarkets</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="field">
                <label>Server</label>
                <input className="mono" placeholder="e.g. ICMarkets-Live05" value={form.server} onChange={set('server')} required/>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Login</label>
                  <input className="mono" placeholder="52418903" value={form.login} onChange={set('login')} required/>
                </div>
                <div className="field">
                  <label>Investor password</label>
                  <input className="mono" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required/>
                </div>
              </div>

              <div className="field">
                <label>Label (optional)</label>
                <input placeholder="Primary — MT5" value={form.label} onChange={set('label')}/>
              </div>

              <div className="sec-note">
                <span className="ico"><Ic.shield /></span>
                <span>Use your <strong>investor (read-only) password</strong>. This grants viewing rights only — no trades can be placed, deposits moved, or settings changed from this portal.</span>
              </div>
            </div>
            <div className="modal-foot">
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                TLS 1.3 · AES-256 at rest
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn primary">Connect account</button>
              </div>
            </div>
          </form>
        )}

        {step === 'connecting' && (
          <div className="modal-body" style={{ alignItems: 'center', textAlign: 'center', padding: '56px 24px' }}>
            <div style={{ width: 42, height: 42, border: '1.5px solid var(--rule)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 20px' }}></div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 19, marginBottom: 6 }}>Establishing secure tunnel</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 36 * 7, margin: '0 auto' }}>Authenticating with {form.server || 'broker'}… This usually takes under a minute.</div>
            <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
          </div>
        )}

        {step === 'done' && (
          <>
            <div className="modal-body" style={{ alignItems: 'center', textAlign: 'center', padding: '48px 24px 32px' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--up-soft)', color: 'var(--up)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Ic.check />
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 19, marginBottom: 6 }}>Account connected</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 40 * 7, margin: '0 auto' }}>
                {platform} · {form.broker || 'Broker'} · #{form.login} is now syncing. Positions and equity will appear in a few seconds.
              </div>
            </div>
            <div className="modal-foot" style={{ justifyContent: 'flex-end' }}>
              <button className="btn primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ConnectModal });
