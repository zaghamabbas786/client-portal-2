/* ======================================================================
   Demo data for Vivid Capital client portal
   4 accounts, mixed MT4/MT5, varied brokers/status
   Positions + history generated from seeded RNG for repeatability
   ====================================================================== */

// Seeded RNG (mulberry32) so mock data is stable
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const ACCOUNTS = [
  {
    id: 'a1',
    platform: 'MT5',
    broker: 'IC Markets',
    server: 'ICMarkets-Live05',
    login: '52418903',
    label: 'Primary — MT5',
    status: 'live',
    currency: 'USD',
    strategy: 'Systematic FX',
    balance: 248_712.44,
    equity: 251_883.17,
    margin: 18_420.00,
    freeMargin: 233_463.17,
    leverage: 500,
    deposit: 200_000,
    openedAt: '2024-03-12',
    seed: 101,
  },
  {
    id: 'a2',
    platform: 'MT4',
    broker: 'Pepperstone',
    server: 'Pepperstone-Live04',
    login: '41907132',
    label: 'Managed — MT4',
    status: 'live',
    currency: 'USD',
    strategy: 'Index Momentum',
    balance: 96_204.11,
    equity: 95_788.02,
    margin: 9_110.50,
    freeMargin: 86_677.52,
    leverage: 200,
    deposit: 100_000,
    openedAt: '2024-08-01',
    seed: 202,
  },
  {
    id: 'a3',
    platform: 'MT5',
    broker: 'Saxo Bank',
    server: 'SaxoBank-Prime',
    login: '30115988',
    label: 'Macro — MT5',
    status: 'live',
    currency: 'EUR',
    strategy: 'Global Macro',
    balance: 412_099.80,
    equity: 418_340.22,
    margin: 31_204.00,
    freeMargin: 387_136.22,
    leverage: 100,
    deposit: 400_000,
    openedAt: '2023-11-05',
    seed: 303,
  },
  {
    id: 'a4',
    platform: 'MT4',
    broker: 'FP Markets',
    server: 'FPMarkets-Live2',
    login: '68720114',
    label: 'Satellite — MT4',
    status: 'pending',
    currency: 'USD',
    strategy: 'Pending verification',
    balance: 0,
    equity: 0,
    margin: 0,
    freeMargin: 0,
    leverage: 100,
    deposit: 0,
    openedAt: '2026-04-20',
    seed: 404,
  },
];

// ---------- equity curve generator ----------
// Produces an array of {t, eq} points for a given range
function genEquityCurve(seed, days, startEq) {
  const rng = mulberry32(seed);
  const pts = [];
  let eq = startEq * 0.94; // start a bit below current
  const steps = days;
  const now = Date.now();
  const day = 86400 * 1000;
  // drift toward current equity with noise; weekends flatter
  const target = startEq * 1.005;
  for (let i = 0; i <= steps; i++) {
    const t = now - (steps - i) * day;
    const date = new Date(t);
    const wknd = date.getDay() === 0 || date.getDay() === 6;
    const drift = (target - eq) * 0.015;
    const vol = startEq * (wknd ? 0.0008 : 0.0045);
    const shock = (rng() - 0.47) * vol;
    eq = eq + drift + shock;
    pts.push({ t, eq });
  }
  // nudge the last point to match current equity closely
  pts[pts.length - 1].eq = startEq;
  return pts;
}

// Aggregate curves across accounts, aligned by day
function aggregateEquity(accounts, days) {
  const perAcc = accounts
    .filter(a => a.status === 'live')
    .map(a => genEquityCurve(a.seed, days, a.equity));
  const len = perAcc[0]?.length || 0;
  const out = [];
  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (const c of perAcc) sum += c[i].eq;
    out.push({ t: perAcc[0][i].t, eq: sum });
  }
  return out;
}

// ---------- open positions ----------
const SYMBOLS = [
  { sym: 'EURUSD', base: 1.0842, vol: 0.0008 },
  { sym: 'GBPUSD', base: 1.2614, vol: 0.0012 },
  { sym: 'USDJPY', base: 151.22, vol: 0.14 },
  { sym: 'AUDUSD', base: 0.6542, vol: 0.0008 },
  { sym: 'XAUUSD', base: 2322.40, vol: 2.2 },
  { sym: 'US500',  base: 5218.60, vol: 4.8 },
  { sym: 'NAS100', base: 18204.5, vol: 22.0 },
  { sym: 'BTCUSD', base: 67_421.0, vol: 180.0 },
];

function genPositions(accounts) {
  const rng = mulberry32(77);
  const out = [];
  let id = 100000;
  for (const acc of accounts) {
    if (acc.status !== 'live') continue;
    const n = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const symDef = SYMBOLS[Math.floor(rng() * SYMBOLS.length)];
      const side = rng() > 0.5 ? 'BUY' : 'SELL';
      const lots = +(0.2 + rng() * 2.4).toFixed(2);
      const openOffset = Math.floor(rng() * 5200) * 60_000; // up to ~3.6 days
      const openTime = Date.now() - openOffset;
      const openPrice = symDef.base + (rng() - 0.5) * symDef.vol * 20;
      const currentPrice = openPrice + (rng() - 0.5) * symDef.vol * 10;
      const contractSize = symDef.sym.includes('BTC') ? 1 : (symDef.sym.startsWith('US') || symDef.sym.startsWith('NAS') ? 1 : 100_000);
      const pipMultiplier = symDef.sym === 'USDJPY' ? 100 : (symDef.sym === 'XAUUSD' ? 1 : (symDef.sym.startsWith('US') || symDef.sym.startsWith('NAS') || symDef.sym === 'BTCUSD' ? 1 : 10_000));
      const diff = side === 'BUY' ? (currentPrice - openPrice) : (openPrice - currentPrice);
      const pl = diff * lots * contractSize / (symDef.sym === 'USDJPY' ? currentPrice : 1);
      const swap = -(rng() * lots * 3.5);
      out.push({
        id: '#' + (id++),
        accountId: acc.id,
        symbol: symDef.sym,
        side,
        lots,
        openPrice: +openPrice.toFixed(symDef.sym.includes('JPY') ? 3 : symDef.sym === 'XAUUSD' ? 2 : symDef.sym.startsWith('US') || symDef.sym.startsWith('NAS') || symDef.sym === 'BTCUSD' ? 2 : 5),
        currentPrice: +currentPrice.toFixed(symDef.sym.includes('JPY') ? 3 : symDef.sym === 'XAUUSD' ? 2 : symDef.sym.startsWith('US') || symDef.sym.startsWith('NAS') || symDef.sym === 'BTCUSD' ? 2 : 5),
        pipMultiplier,
        symDef,
        openTime,
        pl: +pl.toFixed(2),
        swap: +swap.toFixed(2),
        sl: null,
        tp: null,
      });
    }
  }
  return out;
}

// ---------- trade history ----------
function genHistory(accounts, count = 120) {
  const rng = mulberry32(42);
  const out = [];
  let id = 500000;
  const liveAccs = accounts.filter(a => a.status === 'live');
  for (let i = 0; i < count; i++) {
    const acc = liveAccs[Math.floor(rng() * liveAccs.length)];
    const symDef = SYMBOLS[Math.floor(rng() * SYMBOLS.length)];
    const side = rng() > 0.48 ? 'BUY' : 'SELL';
    const lots = +(0.1 + rng() * 2.1).toFixed(2);
    const closeOffset = Math.floor(rng() * 90) * 86400_000 + Math.floor(rng() * 86400_000);
    const closeTime = Date.now() - closeOffset;
    const holdMin = 15 + Math.floor(rng() * 60 * 20);
    const openTime = closeTime - holdMin * 60_000;
    const openPrice = symDef.base + (rng() - 0.5) * symDef.vol * 20;
    const closePrice = openPrice + (rng() - 0.5) * symDef.vol * 14 * (rng() > 0.42 ? 1 : -1);
    const contractSize = symDef.sym.includes('BTC') ? 1 : (symDef.sym.startsWith('US') || symDef.sym.startsWith('NAS') ? 1 : 100_000);
    const diff = side === 'BUY' ? (closePrice - openPrice) : (openPrice - closePrice);
    const pl = diff * lots * contractSize / (symDef.sym === 'USDJPY' ? closePrice : 1);
    const commission = -(lots * 6);
    out.push({
      id: '#' + (id++),
      accountId: acc.id,
      symbol: symDef.sym,
      side,
      lots,
      openPrice: +openPrice.toFixed(symDef.sym.includes('JPY') ? 3 : symDef.sym === 'XAUUSD' ? 2 : symDef.sym.startsWith('US') || symDef.sym.startsWith('NAS') || symDef.sym === 'BTCUSD' ? 2 : 5),
      closePrice: +closePrice.toFixed(symDef.sym.includes('JPY') ? 3 : symDef.sym === 'XAUUSD' ? 2 : symDef.sym.startsWith('US') || symDef.sym.startsWith('NAS') || symDef.sym === 'BTCUSD' ? 2 : 5),
      openTime,
      closeTime,
      pl: +pl.toFixed(2),
      commission: +commission.toFixed(2),
      net: +(pl + commission).toFixed(2),
    });
  }
  out.sort((a, b) => b.closeTime - a.closeTime);
  return out;
}

// ---------- aggregates for dashboard ----------
function computeAggregates(accounts) {
  const live = accounts.filter(a => a.status === 'live');
  const equity = live.reduce((s, a) => s + a.equity, 0);
  const balance = live.reduce((s, a) => s + a.balance, 0);
  const deposit = live.reduce((s, a) => s + a.deposit, 0);
  const floating = equity - balance;
  const totalPL = equity - deposit;
  const totalPLPct = (totalPL / deposit) * 100;
  // today's P&L: use last 2 points of aggregate curve
  const curve = aggregateEquity(accounts, 60);
  const todayPL = curve.length > 1 ? curve[curve.length - 1].eq - curve[curve.length - 2].eq : 0;
  const todayPLPct = (todayPL / equity) * 100;
  return {
    equity, balance, deposit, floating,
    totalPL, totalPLPct,
    todayPL, todayPLPct,
  };
}

// Expose
window.PortalData = {
  ACCOUNTS,
  SYMBOLS,
  genEquityCurve,
  aggregateEquity,
  genPositions,
  genHistory,
  computeAggregates,
  mulberry32,
};
