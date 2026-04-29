/* Main app — routing, state, live-tick simulation */
/* global React, ReactDOM, PortalData, Sidebar, Topbar, LoginScreen,
   Dashboard, Accounts, Positions, History, ConnectModal */

const { useState: uS, useEffect: uE, useMemo: uM, useRef: uR } = React;

function App() {
  const [authed, setAuthed] = uS(false);
  const [theme, setTheme] = uS('dark');
  const [route, setRoute] = uS('dashboard');
  const [activeAccountId, setActiveAccountId] = uS('all');
  const [showConnect, setShowConnect] = uS(false);

  // Clone accounts so we can tick them live
  const [accounts, setAccounts] = uS(() => PortalData.ACCOUNTS.map(a => ({ ...a })));
  const [positions, setPositions] = uS(() => PortalData.genPositions(PortalData.ACCOUNTS));
  const history = uM(() => PortalData.genHistory(PortalData.ACCOUNTS, 140), []);

  // Apply theme
  uE(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Live tick — every 1.6s, nudge a few positions + rollup equity
  uE(() => {
    const tick = setInterval(() => {
      setPositions(prev => {
        const rng = Math.random;
        return prev.map(p => {
          if (rng() > 0.4) return p; // only some positions move each tick
          const symDef = p.symDef;
          const delta = (rng() - 0.5) * symDef.vol * 1.6;
          const currentPrice = +(p.currentPrice + delta).toFixed(symDef.sym.includes('JPY') ? 3 : symDef.sym === 'XAUUSD' ? 2 : symDef.sym.startsWith('US') || symDef.sym.startsWith('NAS') || symDef.sym === 'BTCUSD' ? 2 : 5);
          const contractSize = symDef.sym.includes('BTC') ? 1 : (symDef.sym.startsWith('US') || symDef.sym.startsWith('NAS') ? 1 : 100_000);
          const diff = p.side === 'BUY' ? (currentPrice - p.openPrice) : (p.openPrice - currentPrice);
          const pl = +(diff * p.lots * contractSize / (symDef.sym === 'USDJPY' ? currentPrice : 1)).toFixed(2);
          return { ...p, currentPrice, pl };
        });
      });
    }, 1600);
    return () => clearInterval(tick);
  }, []);

  // Recompute account equity from floating positions
  uE(() => {
    setAccounts(prev => prev.map(a => {
      if (a.status !== 'live') return a;
      const floating = positions.filter(p => p.accountId === a.id).reduce((s, p) => s + p.pl, 0);
      return { ...a, equity: +(a.balance + floating).toFixed(2) };
    }));
  }, [positions]);

  const liveCount = accounts.filter(a => a.status === 'live').length;
  const posCount = positions.filter(p => activeAccountId === 'all' || p.accountId === activeAccountId).length;

  if (!authed) {
    return <LoginScreen onAuth={() => setAuthed(true)} theme={theme} setTheme={setTheme}/>;
  }

  return (
    <div className="app">
      <Sidebar route={route} setRoute={setRoute} accountsCount={accounts.length} positionsCount={positions.length}/>
      <div className="main">
        <Topbar
          route={route}
          accounts={accounts}
          activeAccountId={activeAccountId}
          setActiveAccountId={setActiveAccountId}
          theme={theme}
          setTheme={setTheme}
          onConnect={() => setShowConnect(true)}
        />
        <div className="page">
          {route === 'dashboard' && (
            <Dashboard accounts={accounts} activeAccountId={activeAccountId} positions={positions} onConnect={() => setShowConnect(true)}/>
          )}
          {route === 'accounts' && (
            <Accounts accounts={accounts} onConnect={() => setShowConnect(true)} onSelect={(id) => { setActiveAccountId(id); setRoute('positions'); }}/>
          )}
          {route === 'positions' && (
            <Positions accounts={accounts} positions={positions} activeAccountId={activeAccountId} setActiveAccountId={setActiveAccountId}/>
          )}
          {route === 'history' && (
            <History accounts={accounts} history={history} activeAccountId={activeAccountId} setActiveAccountId={setActiveAccountId}/>
          )}
        </div>
      </div>
      {showConnect && <ConnectModal onClose={() => setShowConnect(false)}/>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
