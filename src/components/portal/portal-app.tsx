"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PortalData } from "@/lib/portal-data";
import { ConnectModal } from "./connect-modal";
import { LoginScreen } from "./login-screen";
import {
  Accounts,
  Dashboard,
  History,
  Positions,
} from "./portal-pages";
import { Sidebar, Topbar } from "./shell";

export function PortalApp() {
  const [authed, setAuthed] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [route, setRoute] = useState("dashboard");
  const [activeAccountId, setActiveAccountId] = useState("all");
  const [showConnect, setShowConnect] = useState(false);

  const [accounts, setAccounts] = useState(() =>
    PortalData.ACCOUNTS.map((a) => ({ ...a })),
  );
  const [positions, setPositions] = useState(() =>
    PortalData.genPositions(PortalData.ACCOUNTS),
  );
  const history = useMemo(
    () => PortalData.genHistory(PortalData.ACCOUNTS, 140),
    [],
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const tick = setInterval(() => {
      setPositions((prev) => {
        const rng = Math.random;
        return prev.map((p) => {
          if (rng() > 0.4) return p;
          const symDef = p.symDef;
          const delta = (rng() - 0.5) * symDef.vol * 1.6;
          const currentPrice = +(p.currentPrice + delta).toFixed(
            symDef.sym.includes("JPY")
              ? 3
              : symDef.sym === "XAUUSD"
                ? 2
                : symDef.sym.startsWith("US") ||
                    symDef.sym.startsWith("NAS") ||
                    symDef.sym === "BTCUSD"
                  ? 2
                  : 5,
          );
          const contractSize = symDef.sym.includes("BTC")
            ? 1
            : symDef.sym.startsWith("US") || symDef.sym.startsWith("NAS")
              ? 1
              : 100_000;
          const diff =
            p.side === "BUY"
              ? currentPrice - p.openPrice
              : p.openPrice - currentPrice;
          const pl = +(
            (diff * p.lots * contractSize) /
            (symDef.sym === "USDJPY" ? currentPrice : 1)
          ).toFixed(2);
          return { ...p, currentPrice, pl };
        });
      });
    }, 1600);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.status !== "live") return a;
        const floating = positions
          .filter((p) => p.accountId === a.id)
          .reduce((s, p) => s + p.pl, 0);
        return { ...a, equity: +(a.balance + floating).toFixed(2) };
      }),
    );
  }, [positions]);

  if (!authed) {
    return (
      <LoginScreen
        onAuth={() => setAuthed(true)}
        theme={theme}
        setTheme={setTheme}
      />
    );
  }

  return (
    <div className="app">
      <Sidebar
        route={route}
        setRoute={setRoute}
        accountsCount={accounts.length}
        positionsCount={positions.length}
      />
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
          {route === "dashboard" && (
            <Dashboard
              accounts={accounts}
              activeAccountId={activeAccountId}
              positions={positions}
              onConnect={() => setShowConnect(true)}
            />
          )}
          {route === "accounts" && (
            <Accounts
              accounts={accounts}
              onConnect={() => setShowConnect(true)}
              onSelect={(id) => {
                setActiveAccountId(id);
                setRoute("positions");
              }}
            />
          )}
          {route === "positions" && (
            <Positions
              accounts={accounts}
              positions={positions}
              activeAccountId={activeAccountId}
              setActiveAccountId={setActiveAccountId}
            />
          )}
          {route === "history" && (
            <History
              accounts={accounts}
              history={history}
              activeAccountId={activeAccountId}
              setActiveAccountId={setActiveAccountId}
            />
          )}
        </div>
      </div>
      {showConnect && <ConnectModal onClose={() => setShowConnect(false)} />}
    </div>
  );
}
