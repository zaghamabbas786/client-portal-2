import Link from "next/link";
import React, { useState } from "react";
import type { PortalAccount } from "@/lib/portal-data";
import { BrandMark, Ic } from "./primitives";

export function Sidebar({
  route,
  setRoute,
  accountsCount,
  positionsCount,
  userLabel,
  userSub,
  isAdmin,
  onSignOut,
  open,
  onClose,
}: {
  route: string;
  setRoute: (r: string) => void;
  accountsCount: number;
  positionsCount: number;
  userLabel: string;
  userSub: string;
  isAdmin: boolean;
  onSignOut: () => void;
  open?: boolean;
  onClose?: () => void;
}) {
  const item = (key: string, label: string, icon: React.ReactNode, count?: number) => (
    <button
      type="button"
      className={`nav-item ${route === key ? "active" : ""}`}
      onClick={() => { setRoute(key); onClose?.(); }}
    >
      {icon}
      <span>{label}</span>
      {count != null && <span className="count">{count}</span>}
    </button>
  );
  return (
    <>
      {open && (
        <div className="sidebar-overlay" onClick={onClose} aria-hidden="true" />
      )}
    <aside className={`sidebar${open ? " sidebar--open" : ""}`}>
      <div className="sidebar-brand">
        <BrandMark size={42} />
      </div>

      <div className="nav-section">Overview</div>
      {item("dashboard", "Dashboard", <Ic.dash />)}

      <div className="nav-section">Trading</div>
      {item("accounts", "Accounts", <Ic.accounts />, accountsCount)}
      {item("positions", "Positions", <Ic.positions />, positionsCount)}
      {item("history", "Trade History", <Ic.history />)}

      <div className="nav-section">Account</div>
      {isAdmin ? (
        <>
          <div className="nav-section">Administration</div>
          <Link
            href="/admin"
            className="nav-item"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Ic.accounts />
            <span>Admin console</span>
          </Link>
        </>
      ) : null}
      {item("settings", "Settings", <Ic.gear />)}

      <div className="sidebar-foot">
        <div className="sidebar-user">
          <div className="avatar">{userLabel.slice(0, 2).toUpperCase()}</div>
          <div className="sidebar-user-meta">
            <span className="n truncate">{userLabel}</span>
            <span className="s truncate">{userSub}</span>
          </div>
        </div>
        <button
          type="button"
          className="nav-item"
          onClick={onSignOut}
          style={{ marginTop: 8 }}
        >
          <span style={{ fontSize: 11 }}>Sign out</span>
        </button>
      </div>
    </aside>
    </>
  );
}

export function Topbar({
  route,
  accounts,
  activeAccountId,
  setActiveAccountId,
  theme,
  setTheme,
  onConnect,
  onMenuOpen,
}: {
  route: string;
  accounts: PortalAccount[];
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  theme: string;
  setTheme: (t: string) => void;
  onConnect?: () => void;
  onMenuOpen?: () => void;
}) {
  const crumbs =
    {
      dashboard: "Dashboard",
      accounts: "Accounts",
      positions: "Open Positions",
      history: "Trade History",
      settings: "Settings",
    }[route] || "";
  const [open, setOpen] = useState(false);
  const active =
    activeAccountId === "all"
      ? {
          label: "All accounts",
          sub: `${accounts.filter((a) => a.status === "live").length} live`,
        }
      : (() => {
          const a = accounts.find((x) => x.id === activeAccountId);
          return a
            ? {
                label: a.label,
                sub: `${a.platform} · ${a.broker} · ${a.login}`,
              }
            : { label: "—", sub: "" };
        })();

  return (
    <header className="topbar">
      <button type="button" className="hamburger-btn" onClick={onMenuOpen} aria-label="Open menu">
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="2" y1="4.5" x2="16" y2="4.5" />
          <line x1="2" y1="9" x2="16" y2="9" />
          <line x1="2" y1="13.5" x2="16" y2="13.5" />
        </svg>
      </button>
      <div className="crumbs">
        <span>Portal</span>
        <span>/</span>
        <span className="cur">{crumbs}</span>
      </div>

      <div className="topbar-actions">
        {route !== "settings" && (
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="account-switcher"
            onClick={() => setOpen((o) => !o)}
          >
            <span
              className="dot"
              style={{
                background: active.sub ? "var(--up)" : "var(--ink-3)",
              }}
            ></span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                lineHeight: 1.15,
              }}
            >
              <span style={{ fontWeight: 500 }}>{active.label}</span>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: "0.04em",
                }}
              >
                {active.sub}
              </span>
            </div>
            <span className="caret">
              <Ic.caret />
            </span>
          </button>
          {open && (
            <div
              onMouseLeave={() => setOpen(false)}
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 6px)",
                background: "var(--surface)",
                border: "1px solid var(--rule-strong)",
                borderRadius: "var(--radius)",
                minWidth: 280,
                zIndex: 50,
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                padding: 4,
              }}
            >
              <button
                type="button"
                className="nav-item"
                style={{ width: "100%", textAlign: "left" }}
                onClick={() => {
                  setActiveAccountId("all");
                  setOpen(false);
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--up)",
                  }}
                ></span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span>All accounts</span>
                  <span
                    className="mono"
                    style={{ fontSize: 10, color: "var(--ink-3)" }}
                  >
                    Aggregate view
                  </span>
                </div>
              </button>
              {accounts.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  className="nav-item"
                  style={{ width: "100%", textAlign: "left" }}
                  onClick={() => {
                    setActiveAccountId(a.id);
                    setOpen(false);
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background:
                        a.status === "live"
                          ? "var(--up)"
                          : a.status === "pending"
                            ? "var(--warn)"
                            : "var(--ink-3)",
                    }}
                  ></span>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      minWidth: 0,
                    }}
                  >
                    <span className="truncate">{a.label}</span>
                    <span
                      className="mono"
                      style={{ fontSize: 10, color: "var(--ink-3)" }}
                    >
                      {a.platform} · {a.login}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        )}
        {onConnect && (
        <button type="button" className="btn" onClick={onConnect}>
          <Ic.plus />
          Connect account
        </button>
        )}
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Ic.sun /> : <Ic.moon />}
        </button>
      </div>
    </header>
  );
}
