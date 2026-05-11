import React, { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileRow } from "@/lib/trading-account-mapper";
import type { HistoryRow, PortalAccount, PositionRow } from "@/lib/portal-data";
import { PortalData } from "@/lib/portal-data";
import { sampleCurve } from "@/lib/equity-curve-sample";
import { EquityChart, Sparkline } from "./charts";
import { FlashNum, fmt, Ic, LoadingButton } from "./primitives";

const useP = useState;
const useM = useMemo;

// ========== Dashboard ==========
export function Dashboard({
  accounts,
  activeAccountId,
  positions,
  dataUpdatedAt,
}: {
  accounts: PortalAccount[];
  activeAccountId: string;
  positions: PositionRow[];
  dataUpdatedAt: number;
}) {
  const [range, setRange] = useP('3M');
  const rangeDays = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, 'ALL': 540 }[range] || 90;

  const scoped = activeAccountId === 'all' ? accounts : accounts.filter(a => a.id === activeAccountId);
  const aggs = PortalData.computeAggregates(scoped);
  const curve = useM(() => PortalData.aggregateEquity(scoped, rangeDays), [activeAccountId, rangeDays, accounts]);
  const scopedPos = positions.filter(p => activeAccountId === 'all' || p.accountId === activeAccountId);
  const floating = scopedPos.reduce((s, p) => s + p.pl, 0);

  // period return from curve
  const periodStart = curve[0]?.eq || 0;
  const periodEnd = curve[curve.length - 1]?.eq || 0;
  const periodPL = periodEnd - periodStart;
  const periodPct = periodStart ? (periodPL / periodStart) * 100 : 0;

  const curvePdfSample = useM(() => sampleCurve(curve, 72), [curve]);
  const [exporting, setExporting] = useP<null | "csv" | "pdf">(null);

  async function exportDashboardCsv() {
    if (exporting) return;
    setExporting("csv");
    try {
      const { downloadDashboardCsv } = await import("@/lib/portal-export");
      const scopeLabel =
        activeAccountId === "all"
          ? "All accounts"
          : accounts.find((a) => a.id === activeAccountId)?.label ?? "—";

      downloadDashboardCsv({
      dataUpdatedAt,
      rangeLabel: range,
      scopeLabel,
      summaryRows: [
        ["Total equity", fmt.money(aggs.equity, "USD")],
        ["Floating P&L", fmt.moneySigned(floating, "USD")],
        ["Total P&L", fmt.moneySigned(aggs.totalPL, "USD")],
        ["Total P&L %", fmt.pct(aggs.totalPLPct, 2)],
        ["Today's P&L", fmt.moneySigned(aggs.todayPL, "USD")],
        ["Today's P&L %", fmt.pct(aggs.todayPLPct, 2)],
        ["Deposit base", fmt.money(aggs.deposit, "USD", { decimals: 0 })],
        ["Period P&L (" + range + ")", fmt.moneySigned(periodPL, "USD")],
        ["Period % (" + range + ")", fmt.pct(periodPct, 2)],
      ],
      curve,
      positions: scopedPos,
      accounts: scoped,
    });
    } finally {
      setExporting(null);
    }
  }

  async function exportDashboardPdf() {
    if (exporting) return;
    setExporting("pdf");
    try {
      const { downloadDashboardPdf } = await import("@/lib/portal-export");
      const scopeLabel =
        activeAccountId === "all"
          ? "All accounts"
          : accounts.find((a) => a.id === activeAccountId)?.label ?? "—";

      downloadDashboardPdf({
      dataUpdatedAt,
      rangeLabel: range,
      scopeLabel,
      summaryRows: [
        ["Total equity", fmt.money(aggs.equity, "USD")],
        ["Floating P&L", fmt.moneySigned(floating, "USD")],
        ["Total P&L", fmt.moneySigned(aggs.totalPL, "USD")],
        ["Total P&L %", fmt.pct(aggs.totalPLPct, 2)],
        ["Today's P&L", fmt.moneySigned(aggs.todayPL, "USD")],
        ["Deposit base", fmt.money(aggs.deposit, "USD", { decimals: 0 })],
        ["Period P&L (" + range + ")", fmt.moneySigned(periodPL, "USD")],
      ],
      curveSample: curvePdfSample,
      positions: scopedPos,
      accounts: scoped,
    });
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>{activeAccountId === 'all' ? 'All accounts' : (accounts.find(a => a.id === activeAccountId)?.label || '')}</div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-sub">Snapshot across {scoped.filter(a => a.status === 'live').length} connected {scoped.filter(a => a.status === 'live').length === 1 ? 'account' : 'accounts'} · Last refresh {new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
        </div>
        <div className="page-actions">
          <LoadingButton
            onClick={exportDashboardCsv}
            loading={exporting === "csv"}
            loadingText="Exporting…"
            disabled={exporting !== null}
          >
            <Ic.download />
            CSV
          </LoadingButton>
          <LoadingButton
            onClick={exportDashboardPdf}
            loading={exporting === "pdf"}
            loadingText="Exporting…"
            disabled={exporting !== null}
          >
            <Ic.download />
            PDF
          </LoadingButton>
        </div>
      </div>

      {/* KPI grid */}
      <div className="kpi-grid">
        <div className="kpi">
          <span className="k">Total Equity</span>
          <span className="v"><FlashNum value={aggs.equity} ccy="USD"/></span>
          <span className="d"><span className="chg" style={{ color: floating >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmt.moneySigned(floating, 'USD')}</span><span>floating</span></span>
        </div>
        <div className="kpi">
          <span className="k">Total P&L</span>
          <span className="v" style={{ color: aggs.totalPL >= 0 ? 'var(--up)' : 'var(--down)' }}><FlashNum value={aggs.totalPL} signed ccy="USD"/></span>
          <span className="d"><span className="chg" style={{ color: aggs.totalPL >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmt.pct(aggs.totalPLPct)}</span><span>since inception</span></span>
        </div>
        <div className="kpi">
          <span className="k">Today&apos;s P&L</span>
          <span className="v" style={{ color: aggs.todayPL >= 0 ? 'var(--up)' : 'var(--down)' }}><FlashNum value={aggs.todayPL} signed ccy="USD"/></span>
          <span className="d"><span className="chg" style={{ color: aggs.todayPL >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmt.pct(aggs.todayPLPct)}</span><span>vs. yesterday close</span></span>
        </div>
        <div className="kpi">
          <span className="k">Total P&L %</span>
          <span className="v" style={{ color: aggs.totalPLPct >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmt.pct(aggs.totalPLPct, 2)}</span>
          <span className="d"><span>on <span className="chg">{fmt.money(aggs.deposit, 'USD', { decimals: 0 })}</span></span><span>deposited</span></span>
        </div>
      </div>

      {/* Equity curve */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <h3 className="panel-title">Equity curve</h3>
            <div style={{ display: 'flex', gap: 18, marginTop: 4 }}>
              <div>
                <span className="eyebrow">Period P&L</span>
                <div className="mono" style={{ fontSize: 16, color: periodPL >= 0 ? 'var(--up)' : 'var(--down)', marginTop: 2 }}>
                  {fmt.moneySigned(periodPL, 'USD')} <span style={{ color: 'var(--ink-3)', marginLeft: 4 }}>{fmt.pct(periodPct)}</span>
                </div>
              </div>
              <div>
                <span className="eyebrow">Period high</span>
                <div className="mono" style={{ fontSize: 16, marginTop: 2 }}>
                  ${Math.max(...curve.map(c => c.eq)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div>
                <span className="eyebrow">Period low</span>
                <div className="mono" style={{ fontSize: 16, marginTop: 2 }}>
                  ${Math.min(...curve.map(c => c.eq)).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          </div>
          <div className="range-tabs">
            {['1W','1M','3M','6M','1Y','ALL'].map(r => (
              <button key={r} className={range === r ? 'active' : ''} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
        </div>
        <div className="panel-body">
          <EquityChart data={curve} height={300} />
        </div>
      </div>

      {/* Accounts overview + Recent positions */}
      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-title">Open positions</h3>
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{scopedPos.length} open · floating <span style={{ color: floating >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmt.moneySigned(floating, 'USD')}</span></span>
          </div>
          <div className="panel-body flush">
            {scopedPos.length === 0 ? (
              <div className="empty">
                <div className="eh">No open positions</div>
                <div className="es">Open positions from your last refresh appear here with P&amp;L from that snapshot.</div>
              </div>
            ) : (
              <table className="tbl">
                <thead><tr>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th className="num">Lots</th>
                  <th className="num">Entry</th>
                  <th className="num">Current</th>
                  <th className="num">P&L</th>
                </tr></thead>
                <tbody>
                  {scopedPos.slice(0, 8).map(p => (
                    <tr key={p.id}>
                      <td className="mono" style={{ fontWeight: 500 }}>{p.symbol}</td>
                      <td><span className={`pos-dir ${p.side.toLowerCase()}`}>{p.side}</span></td>
                      <td className="num">{p.lots.toFixed(2)}</td>
                      <td className="num">{p.openPrice}</td>
                      <td className="num"><FlashNum value={p.currentPrice} decimals={p.symbol.includes('JPY') ? 3 : 5}/></td>
                      <td className="num" style={{ color: p.pl >= 0 ? 'var(--up)' : 'var(--down)' }}>
                        <FlashNum value={p.pl} signed ccy="USD"/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3 className="panel-title">Connected accounts</h3>
          </div>
          <div className="panel-body flush">
            {accounts.map(a => {
              const miniCurve = PortalData.genEquityCurve(a.seed, 30, a.equity || a.deposit || 100);
              const pct = a.deposit ? ((a.equity - a.deposit) / a.deposit) * 100 : 0;
              return (
                <div key={a.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                        {a.platform} · {a.broker}
                      </span>
                      <span className={`status ${a.status}`}><span className="dot"></span>{a.status}</span>
                    </div>
                    <div className="truncate" style={{ fontSize: 13.5, color: 'var(--ink)' }}>{a.label}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>#{a.login}</div>
                  </div>
                  {a.status === 'live' && <Sparkline data={miniCurve} width={100} height={32} positive={pct >= 0}/>}
                  <div style={{ textAlign: 'right', minWidth: 100 }}>
                    <div className="mono" style={{ fontSize: 13 }}>
                      {a.status === 'live' ? fmt.money(a.equity, a.currency) : '—'}
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: pct >= 0 ? 'var(--up)' : 'var(--down)', marginTop: 2 }}>
                      {a.status === 'live' ? fmt.pct(pct) : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// ========== Accounts ==========
export function Accounts({
  accounts,
  onConnect,
  onSelect,
  dataUpdatedAt,
}: {
  accounts: PortalAccount[];
  onConnect?: () => void;
  onSelect: (id: string) => void;
  dataUpdatedAt: number;
}) {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>MT4 · MT5</div>
          <h1 className="page-title">Accounts</h1>
          <div className="page-sub">Figures from your last refresh ({new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}). Accounts linked by your administrator appear here.</div>
        </div>
        <div className="page-actions">
          {onConnect && (
            <button className="btn primary" onClick={onConnect}><Ic.plus />Connect account</button>
          )}
        </div>
      </div>

      <div className="accounts-grid">
        {accounts.map(a => {
          const miniCurve = PortalData.genEquityCurve(a.seed, 30, a.equity || a.deposit || 100);
          const pct = a.deposit ? ((a.equity - a.deposit) / a.deposit) * 100 : 0;
          return (
            <div key={a.id} className="account-card">
              <div className="acc-head">
                <div style={{ minWidth: 0 }}>
                  <div className="acc-brand">
                    <span className="platform">{a.platform}</span>
                    <span>{a.broker}</span>
                  </div>
                  <div className="acc-num">{a.label}</div>
                  <div className="acc-server">#{a.login} · {a.server}</div>
                </div>
                <span className={`status ${a.status}`}><span className="dot"></span>{a.status}</span>
              </div>

              {a.status === 'live' ? (
                <>
                  <div className="account-metrics">
                    <div className="m">
                      <span className="m-k">Equity</span>
                      <span className="m-v"><FlashNum value={a.equity} ccy={a.currency}/></span>
                    </div>
                    <div className="m">
                      <span className="m-k">P&L</span>
                      <span className="m-v" style={{ color: pct >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmt.pct(pct)}</span>
                    </div>
                    <div className="m">
                      <span className="m-k">Leverage</span>
                      <span className="m-v">1:{a.leverage}</span>
                    </div>
                  </div>

                  <Sparkline data={miniCurve} width={400} height={42} positive={pct >= 0}/>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, paddingTop: 10 }}>
                    <div><span className="eyebrow" style={{ display: 'block' }}>Balance</span><span className="mono" style={{ fontSize: 12 }}>{fmt.money(a.balance, a.currency)}</span></div>
                    <div><span className="eyebrow" style={{ display: 'block' }}>Margin</span><span className="mono" style={{ fontSize: 12 }}>{fmt.money(a.margin, a.currency)}</span></div>
                    <div><span className="eyebrow" style={{ display: 'block' }}>Free</span><span className="mono" style={{ fontSize: 12 }}>{fmt.money(a.freeMargin, a.currency)}</span></div>
                  </div>

                  <div className="account-actions">
                    <button className="btn" onClick={() => onSelect(a.id)}>View positions</button>
                    <button className="btn ghost">Disconnect</button>
                  </div>
                </>
              ) : a.status === 'pending' ? (
                <>
                  <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--warn)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Awaiting verification</div>
                    <div>We&apos;re establishing a secure tunnel to {a.server}. This usually takes under a minute.</div>
                  </div>
                  <div className="account-actions">
                    <button className="btn">Retry</button>
                    <button className="btn ghost">Remove</button>
                  </div>
                </>
              ) : null}
            </div>
          );
        })}

        {/* Empty slot to add */}
        {onConnect && (
        <button className="account-card" onClick={onConnect} style={{
          alignItems: 'center', justifyContent: 'center', gap: 10,
          borderStyle: 'dashed', color: 'var(--ink-3)', minHeight: 240,
          cursor: 'pointer',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1px dashed var(--rule-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic.plus />
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--ink-2)' }}>Connect another account</div>
          <div style={{ fontSize: 12, maxWidth: 32 * 7 }}>Supports MetaTrader 4 & 5 · Any broker with server login</div>
        </button>
        )}
      </div>
    </>
  );
}

// ========== Settings ==========
export function Settings({
  supabase,
  userId,
  profile,
  authEmail,
  onProfileRefresh,
}: {
  supabase: SupabaseClient;
  userId: string;
  profile: ProfileRow | null;
  authEmail: string;
  onProfileRefresh: () => void | Promise<void>;
}) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile?.full_name, profile?.phone]);

  const displayEmail =
    authEmail.trim() ||
    profile?.email?.trim() ||
    "";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const trimmedName = fullName.trim();
      const trimmedPhone = phone.trim();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: trimmedName,
          phone: trimmedPhone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (error) setMsg(error.message);
      else {
        setMsg("Your profile has been updated.");
        await onProfileRefresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Account
          </div>
          <h1 className="page-title">Settings</h1>
          <div className="page-sub">
            Update how your name appears in the portal. Email is tied to login
            and cannot be edited here.
          </div>
        </div>
      </div>

      <div className="panel" style={{ maxWidth: 520 }}>
        <div className="panel-head">
          <h3 className="panel-title">Profile</h3>
        </div>
        <div className="panel-body">
          {msg && (
            <div
              style={{
                fontSize: 13,
                marginBottom: 14,
                color:
                  msg.startsWith("Your profile") ? "var(--ink-2)" : "var(--down)",
              }}
            >
              {msg}
            </div>
          )}
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="field">
              <label htmlFor="settings-full-name">Full name</label>
              <input
                id="settings-full-name"
                name="full_name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="settings-email">Email</label>
              <input
                id="settings-email"
                type="email"
                value={displayEmail}
                disabled
                aria-readonly
                style={{
                  opacity: 0.72,
                  cursor: "not-allowed",
                }}
              />
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.35 }}>
                Email cannot be changed here. Contact support.
              </div>
            </div>
            <div className="field">
              <label htmlFor="settings-phone">Phone</label>
              <input
                id="settings-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div style={{ paddingTop: 4 }}>
              <LoadingButton
                type="submit"
                variant="primary"
                loading={busy}
                loadingText="Saving…"
              >
                Save changes
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ========== Positions ==========
export function Positions({
  accounts,
  positions,
  activeAccountId,
  setActiveAccountId,
  dataUpdatedAt,
}: {
  accounts: PortalAccount[];
  positions: PositionRow[];
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  dataUpdatedAt: number;
}) {
  const [search, setSearch] = useState("");
  const [symbol, setSymbol] = useState("all");
  const [side, setSide] = useState<"all" | "buy" | "sell">("all");

  const accountScoped = useMemo(
    () =>
      positions.filter(
        (p) => activeAccountId === "all" || p.accountId === activeAccountId,
      ),
    [positions, activeAccountId],
  );

  const symbols = useMemo(
    () =>
      Array.from(new Set(accountScoped.map((p) => p.symbol))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [accountScoped],
  );

  useEffect(() => {
    setSearch("");
    setSymbol("all");
    setSide("all");
  }, [activeAccountId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accountScoped.filter((p) => {
      if (q) {
        const idStr = String(p.id).toLowerCase();
        if (
          !p.symbol.toLowerCase().includes(q) &&
          !idStr.includes(q)
        ) {
          return false;
        }
      }
      if (symbol !== "all" && p.symbol !== symbol) return false;
      if (side === "buy" && p.side.toUpperCase() !== "BUY") return false;
      if (side === "sell" && p.side.toUpperCase() !== "SELL") return false;
      return true;
    });
  }, [accountScoped, search, symbol, side]);

  const total = filtered.reduce((s, p) => s + p.pl, 0);
  const totalSwap = filtered.reduce((s, p) => s + p.swap, 0);
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>As of last refresh</div>
          <h1 className="page-title">Open Positions</h1>
          <div className="page-sub">{filtered.length} positions · floating <span className="mono" style={{ color: total >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmt.moneySigned(total, 'USD')}</span> · swap <span className="mono">{fmt.moneySigned(totalSwap, 'USD')}</span> · snapshot {new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
        </div>
      </div>

      <div className="panel">
        <div className="filters">
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }}><Ic.search /></span>
            <input
              type="search"
              placeholder="Symbol, ticket"
              style={{ paddingLeft: 30 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={activeAccountId} onChange={e => setActiveAccountId(e.target.value)}>
            <option value="all">All accounts</option>
            {accounts.filter(a => a.status === 'live').map(a => (
              <option key={a.id} value={a.id}>{a.label} · #{a.login}</option>
            ))}
          </select>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            <option value="all">All symbols</option>
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={side}
            onChange={(e) =>
              setSide(e.target.value as "all" | "buy" | "sell")
            }
          >
            <option value="all">All sides</option>
            <option value="buy">Buy only</option>
            <option value="sell">Sell only</option>
          </select>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="live-pill live-pill--snapshot" title="Quotes from last refresh only">
              <span className="mono" style={{ fontSize: 10 }}>Snapshot · {new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </span>
          </div>
        </div>
        <table className="tbl">
          <thead><tr>
            <th>Symbol</th>
            <th>Side</th>
            <th className="num">Lots</th>
            <th>Account</th>
            <th>Opened</th>
            <th className="num">Entry</th>
            <th className="num">Current</th>
            <th className="num">Swap</th>
            <th className="num">P&L</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "var(--ink-3)",
                  }}
                >
                  {accountScoped.length === 0
                    ? "No open positions for this snapshot."
                    : "No positions match your filters."}
                </td>
              </tr>
            ) : (
            filtered.map(p => {
              const acc = accounts.find(a => a.id === p.accountId);
              return (
                <tr key={p.id}>
                  <td>
                    <div className="mono" style={{ fontWeight: 500 }}>{p.symbol}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{p.id}</div>
                  </td>
                  <td><span className={`pos-dir ${p.side.toLowerCase()}`}>{p.side}</span></td>
                  <td className="num">{p.lots.toFixed(2)}</td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>{acc?.label}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{acc?.platform} · #{acc?.login}</div>
                  </td>
                  <td>
                    <div className="mono" style={{ fontSize: 11.5 }}>{fmt.dateTime(p.openTime)}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{fmt.duration(dataUpdatedAt - p.openTime)} ago (at refresh)</div>
                  </td>
                  <td className="num">{p.openPrice}</td>
                  <td className="num"><FlashNum value={p.currentPrice} decimals={p.symbol.includes('JPY') ? 3 : p.symbol === 'XAUUSD' ? 2 : p.symbol === 'BTCUSD' || p.symbol.startsWith('US') || p.symbol.startsWith('NAS') ? 2 : 5}/></td>
                  <td className="num" style={{ color: p.swap < 0 ? 'var(--down)' : 'var(--ink)' }}>{fmt.moneySigned(p.swap, 'USD')}</td>
                  <td className="num" style={{ color: p.pl >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 500 }}>
                    <FlashNum value={p.pl} signed ccy="USD"/>
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ========== History ==========
export function History({
  accounts,
  history,
  activeAccountId,
  setActiveAccountId,
  dataUpdatedAt,
}: {
  accounts: PortalAccount[];
  history: HistoryRow[];
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  dataUpdatedAt: number;
}) {
  const [symbol, setSymbol] = useP('all');
  const [side, setSide] = useP('all');
  const [period, setPeriod] = useP('30d');

  const filtered = useM(() => {
    const ref = dataUpdatedAt;
    const periodDays = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 } as const;
    const cutoff = (periodDays[period as keyof typeof periodDays] ?? 30) * 86400_000;
    return history.filter(h => {
      if (activeAccountId !== 'all' && h.accountId !== activeAccountId) return false;
      if (symbol !== 'all' && h.symbol !== symbol) return false;
      if (side !== 'all' && h.side.toLowerCase() !== side) return false;
      if (cutoff && (ref - h.closeTime) > cutoff) return false;
      return true;
    });
  }, [history, activeAccountId, symbol, side, period, dataUpdatedAt]);

  const net = filtered.reduce((s, h) => s + h.net, 0);
  const wins = filtered.filter(h => h.net > 0).length;
  const winRate = filtered.length ? (wins / filtered.length) * 100 : 0;
  const avgWin = filtered.filter(h => h.net > 0).reduce((s, h) => s + h.net, 0) / (wins || 1);
  const avgLoss = filtered.filter(h => h.net < 0).reduce((s, h) => s + h.net, 0) / ((filtered.length - wins) || 1);
  const profitFactor = Math.abs(
    filtered.filter(h => h.net > 0).reduce((s, h) => s + h.net, 0) /
    (filtered.filter(h => h.net < 0).reduce((s, h) => s + h.net, 0) || -1)
  );

  const symbols = Array.from(new Set(history.map(h => h.symbol))).sort();

  const hasLiveAccount = accounts.some((a) => a.status === "live");
  const hasMetaLinked = accounts.some(
    (a) =>
      a.status === "live" &&
      !!(a.metaApiAccountId && String(a.metaApiAccountId).trim()),
  );

  const [exporting, setExporting] = useP<null | "csv" | "pdf">(null);

  async function exportHistoryCsv() {
    if (exporting) return;
    setExporting("csv");
    try {
      const { downloadTradeHistoryCsv } = await import("@/lib/portal-export");
      downloadTradeHistoryCsv(filtered);
    } finally {
      setExporting(null);
    }
  }

  async function exportHistoryPdf() {
    if (exporting) return;
    setExporting("pdf");
    try {
      const { downloadTradeHistoryPdf } = await import("@/lib/portal-export");
      const accountPart =
        activeAccountId === "all"
          ? "All accounts"
          : accounts.find((a) => a.id === activeAccountId)?.label ?? "—";
      downloadTradeHistoryPdf(
        filtered,
        `${filtered.length} filtered trades · period ${period} · ${accountPart} · snapshot ${fmt.dateTime(dataUpdatedAt)}`,
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Closed trades</div>
          <h1 className="page-title">Trade History</h1>
          <div className="page-sub">{filtered.length} trades · net <span className="mono" style={{ color: net >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmt.moneySigned(net, 'USD')}</span> · win rate <span className="mono">{winRate.toFixed(1)}%</span> · data from refresh {new Date(dataUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, maxWidth: 620, lineHeight: 1.45 }}>
            Only real closed deals from MetaAPI are shown (no demo ledger). Link a MetaAPI account id on the broker row and set <span className="mono">METAAPI_TOKEN</span> or <span className="mono">METAAPI_ACCESS_TOKEN</span> on the server.
          </div>
          {history.length === 0 && hasLiveAccount && !hasMetaLinked ? (
            <div style={{ fontSize: 12.5, color: 'var(--warn)', marginTop: 10, maxWidth: 560, lineHeight: 1.45 }}>
              This account has no MetaAPI id yet, so history stays empty. Ask your administrator to add the UUID from MetaAPI when linking the broker account.
            </div>
          ) : null}
          {history.length === 0 && hasMetaLinked ? (
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 10, maxWidth: 560, lineHeight: 1.45 }}>
              MetaAPI returned no closed deals in the loaded window, or the snapshot has not refreshed since linking.
            </div>
          ) : null}
        </div>
        <div className="page-actions">
          <LoadingButton
            onClick={exportHistoryCsv}
            loading={exporting === "csv"}
            loadingText="Exporting…"
            disabled={exporting !== null}
          >
            <Ic.download />
            CSV
          </LoadingButton>
          <LoadingButton
            onClick={exportHistoryPdf}
            loading={exporting === "pdf"}
            loadingText="Exporting…"
            disabled={exporting !== null}
          >
            <Ic.download />
            PDF
          </LoadingButton>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <span className="k">Net Profit</span>
          <span className="v" style={{ color: net >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmt.moneySigned(net, 'USD')}</span>
          <span className="d"><span>{filtered.length} trades closed</span></span>
        </div>
        <div className="kpi">
          <span className="k">Win Rate</span>
          <span className="v">{winRate.toFixed(1)}%</span>
          <span className="d"><span className="chg up">{wins} wins</span><span className="chg down">{filtered.length - wins} losses</span></span>
        </div>
        <div className="kpi">
          <span className="k">Avg Win / Loss</span>
          <span className="v"><span className="up">{fmt.money(avgWin, 'USD', { decimals: 0 })}</span> <span style={{ color: 'var(--ink-3)', fontSize: 18 }}>/</span> <span className="down">{fmt.money(Math.abs(avgLoss), 'USD', { decimals: 0 })}</span></span>
          <span className="d"><span>Ratio {Math.abs(avgWin / (avgLoss || 1)).toFixed(2)}</span></span>
        </div>
        <div className="kpi">
          <span className="k">Profit Factor</span>
          <span className="v">{isFinite(profitFactor) ? profitFactor.toFixed(2) : '—'}</span>
          <span className="d"><span>Gross profit / gross loss</span></span>
        </div>
      </div>

      <div className="panel">
        <div className="filters">
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', pointerEvents: 'none' }}><Ic.search /></span>
            <input type="search" placeholder="Search ticket or symbol" style={{ paddingLeft: 30 }}/>
          </div>
          <select value={activeAccountId} onChange={e => setActiveAccountId(e.target.value)}>
            <option value="all">All accounts</option>
            {accounts.filter(a => a.status === 'live').map(a => (<option key={a.id} value={a.id}>{a.label}</option>))}
          </select>
          <select value={symbol} onChange={e => setSymbol(e.target.value)}>
            <option value="all">All symbols</option>
            {symbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={side} onChange={e => setSide(e.target.value)}>
            <option value="all">All sides</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <select value={period} onChange={e => setPeriod(e.target.value)}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
        <table className="tbl">
          <thead><tr>
            <th>Ticket</th>
            <th>Symbol</th>
            <th>Side</th>
            <th className="num">Lots</th>
            <th className="num">Open</th>
            <th className="num">Close</th>
            <th>Duration</th>
            <th>Closed</th>
            <th className="num">Comm.</th>
            <th className="num">Net P&L</th>
          </tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "var(--ink-3)",
                  }}
                >
                  {history.length === 0
                    ? hasMetaLinked
                      ? "No closed deals from MetaAPI in this range."
                      : "No trade history yet."
                    : "No trades match your filters."}
                </td>
              </tr>
            ) : (
            filtered.slice(0, 60).map(h => (
              <tr key={h.id}>
                <td className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{h.id}</td>
                <td className="mono" style={{ fontWeight: 500 }}>{h.symbol}</td>
                <td><span className={`pos-dir ${h.side.toLowerCase()}`}>{h.side}</span></td>
                <td className="num">{h.lots.toFixed(2)}</td>
                <td className="num">{h.openPrice}</td>
                <td className="num">{h.closePrice}</td>
                <td className="mono" style={{ fontSize: 11.5 }}>{fmt.duration(h.closeTime - h.openTime)}</td>
                <td className="mono" style={{ fontSize: 11.5 }}>{fmt.dateTime(h.closeTime)}</td>
                <td className="num" style={{ color: 'var(--ink-3)' }}>{fmt.moneySigned(h.commission, 'USD')}</td>
                <td className="num" style={{ color: h.net >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 500 }}>{fmt.moneySigned(h.net, 'USD')}</td>
              </tr>
            ))
            )}
          </tbody>
        </table>
        {filtered.length > 60 && (
          <div style={{ padding: 16, textAlign: 'center', borderTop: '1px solid var(--rule)', color: 'var(--ink-3)', fontSize: 12.5 }}>
            Showing 60 of {filtered.length} trades · <a href="#" style={{ color: 'var(--accent)' }}>Load more</a>
          </div>
        )}
      </div>
    </>
  );
}
