"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  isEffectivePortalAdmin,
  sessionPortalRoleHint,
} from "@/lib/auth/roles";
import { PortalData } from "@/lib/portal-data";
import {
  rowToPortalAccount,
  type ProfileRow,
  type TradingAccountRow,
} from "@/lib/trading-account-mapper";
import type { PortalAccount, HistoryRow, PositionRow } from "@/lib/portal-data";
import type { Session } from "@supabase/supabase-js";
import { LoginScreen } from "./login-screen";
import {
  Accounts,
  Dashboard,
  History,
  Positions,
  Settings,
} from "./portal-pages";
import { Sidebar, Topbar } from "./shell";

/** Browser console + pings server debug route when true (see NEXT_PUBLIC_ENABLE_PORTAL_DEBUG). */
const PORTAL_ROLE_DEBUG_UI =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ENABLE_PORTAL_DEBUG === "true";

/** Server logs to terminal: GET /api/debug/portal-role during dev or when ENABLED (see env). */
async function pingDebugPortalRoleTerminal(): Promise<void> {
  if (!PORTAL_ROLE_DEBUG_UI) return;
  try {
    const res = await fetch("/api/debug/portal-role", {
      credentials: "same-origin",
    });
    const body = await res.json().catch(() => ({}));
    console.info("[portal-app] /api/debug/portal-role:", body);
  } catch {
    console.warn("[portal-app] /api/debug/portal-role request failed");
  }
}

/** Meta snapshot can wait on upstream MetaAPI; never block UI indefinitely */
const METAPI_SNAPSHOT_CLIENT_MS = 32_000;

function abortSignalAfter(ms: number): { signal: AbortSignal; clear: () => void } {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return { signal: AbortSignal.timeout(ms), clear: () => {} };
  }
  const c = new AbortController();
  const id = globalThis.setTimeout(() => c.abort(), ms);
  return {
    signal: c.signal,
    clear: () => globalThis.clearTimeout(id),
  };
}

async function hydrateFromMetaSnapshot(
  mapped: PortalAccount[],
): Promise<{ accounts: PortalAccount[]; positions: PositionRow[]; history: HistoryRow[] }> {
  const mockPositions = PortalData.genPositions(mapped);
  const mockHistory = PortalData.genHistory(mapped, 140);

  const { signal, clear } = abortSignalAfter(METAPI_SNAPSHOT_CLIENT_MS);

  try {
    const res = await fetch("/api/portal/metaapi-snapshot", {
      credentials: "same-origin",
      signal,
    });
    type Snap = {
      live?: boolean;
      patches?: Array<Partial<PortalAccount> & { id: string }>;
      positions?: PositionRow[];
      history?: HistoryRow[];
    };
    const j = (await res.json()) as Snap;
    if (!res.ok || !j.live || !Array.isArray(j.patches)) {
      return {
        accounts: mapped,
        positions: mockPositions,
        history: mockHistory,
      };
    }

    const patchMap = new Map(j.patches.map((p) => [p.id, p]));
    const mergedAccounts = mapped.map((a) => ({
      ...a,
      ...patchMap.get(a.id),
    }));

    const liveNoMeta = mergedAccounts.filter(
      (a) => a.status === "live" && !a.metaApiAccountId,
    );
    const mockPosOnlyMeta = PortalData.genPositions(liveNoMeta);

    const metaPos = Array.isArray(j.positions) ? j.positions : [];

    const mockHistOnlyMeta = PortalData.genHistory(liveNoMeta, 140);
    const metaHist = Array.isArray(j.history) ? j.history : [];
    const history = [...metaHist, ...mockHistOnlyMeta].sort(
      (a, b) => b.closeTime - a.closeTime,
    );

    return {
      accounts: mergedAccounts,
      positions: [...mockPosOnlyMeta, ...metaPos],
      history: history.slice(0, 400),
    };
  } catch {
    return {
      accounts: mapped,
      positions: mockPositions,
      history: mockHistory,
    };
  } finally {
    clear();
  }
}

export function PortalApp() {
  const [supabaseClient, setSupabaseClient] = useState<ReturnType<
    typeof createClient
  > | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSupabaseClient(createClient());
    } catch (e) {
      setConfigError(
        (e as Error).message ||
          "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in .env.local (see .env.example).",
      );
    }
  }, []);

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [route, setRoute] = useState("dashboard");
  const [activeAccountId, setActiveAccountId] = useState("all");
  const [theme, setTheme] = useState("dark");

  const [accounts, setAccounts] = useState<PortalAccount[]>([]);
  const [positions, setPositions] = useState(() =>
    PortalData.genPositions([]),
  );
  const [history, setHistory] = useState(() =>
    PortalData.genHistory([], 140),
  );
  const [dataUpdatedAt, setDataUpdatedAt] = useState(() => Date.now());

  /** Server-derived admin (cookies); fixes sidebar when client profile state lags behind DB */
  const [adminFromServer, setAdminFromServer] = useState<boolean | null>(null);

  const bindUserIdentity = useCallback(
    async (sb: NonNullable<typeof supabaseClient>, authUserId: string) => {
      const { error: guErr } = await sb.auth.getUser();
      if (guErr) console.warn("auth.getUser:", guErr.message);
      const {
        data: { session: curSession },
      } = await sb.auth.getSession();
      const { data: prof, error: profErr } = await sb
        .from("profiles")
        .select("*")
        .eq("id", authUserId)
        .maybeSingle();
      if (profErr) console.error(profErr);
      setProfile(((prof ?? null) as ProfileRow | null) ?? null);
      if (PORTAL_ROLE_DEBUG_UI) {
        console.info("[portal-app] bindUserIdentity", {
          authUserId,
          profileFetched: !!prof,
          profilesError: profErr?.message ?? null,
          rawRole:
            typeof prof === "object" &&
            prof !== null &&
            "role" in prof
              ? String((prof as { role?: unknown }).role)
              : null,
          jwtPortalHintClient: sessionPortalRoleHint(curSession ?? null),
          isEffectivePortalAdminClient: isEffectivePortalAdmin(
            prof ?? null,
            curSession ?? null,
          ),
        });
        void pingDebugPortalRoleTerminal();
      }
    },
    [],
  );

  const loadPortalData = useCallback(
    async (sb: NonNullable<typeof supabaseClient>, uid: string) => {
      try {
        const applyRows = async (raw: unknown[]) => {
          const mapped = raw.map((r) =>
            rowToPortalAccount(r as TradingAccountRow),
          );
          const merged = await hydrateFromMetaSnapshot(mapped);
          setAccounts(merged.accounts);
          setPositions(merged.positions);
          setHistory(merged.history);
          setDataUpdatedAt(Date.now());
        };

        const res = await fetch("/api/portal/trading-accounts", {
          credentials: "same-origin",
        });

        if (res.ok) {
          const j = (await res.json()) as {
            rows?: unknown[];
          };
          await applyRows(j.rows ?? []);
          return;
        }

        if (res.status === 401) {
          await applyRows([]);
          return;
        }

        console.warn(
          "[portal-app] /api/portal/trading-accounts fallback to browser Supabase:",
          res.status,
        );

        const { data: rows, error } = await sb
          .from("trading_accounts")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: true });
        if (error) {
          console.error(error);
          return;
        }
        await applyRows(rows ?? []);
      } catch (e) {
        console.error(e);
      }
    },
    [],
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!supabaseClient) return;

    void (async () => {
      // If auth or profile never resolves, still leave the loading screen.
      const watchdog = window.setTimeout(() => {
        setHydrated(true);
      }, 15_000);
      try {
        const {
          data: { session: s },
        } = await supabaseClient.auth.getSession();
        setSession(s);
        if (s?.user) {
          await bindUserIdentity(supabaseClient, s.user.id);
          void loadPortalData(supabaseClient, s.user.id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        window.clearTimeout(watchdog);
        setHydrated(true);
      }
    })();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      try {
        if (s?.user) {
          await bindUserIdentity(supabaseClient, s.user.id);
          void loadPortalData(supabaseClient, s.user.id);
        } else {
          setProfile(null);
          setAccounts([]);
          setPositions(PortalData.genPositions([]));
          setHistory(PortalData.genHistory([], 140));
        }
      } catch (e) {
        console.error(e);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient, loadPortalData, bindUserIdentity]);

  useEffect(() => {
    if (!supabaseClient || !session?.user?.id) return;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const uid = session.user!.id;
      void bindUserIdentity(supabaseClient, uid);
      void loadPortalData(supabaseClient, uid);
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [supabaseClient, session?.user?.id, bindUserIdentity, loadPortalData]);

  useEffect(() => {
    if (!session?.user?.id) {
      setAdminFromServer(null);
      return;
    }
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/portal/me-admin", {
          credentials: "same-origin",
          signal: ac.signal,
        });
        const j = (await res.json()) as { admin?: boolean };
        if (!ac.signal.aborted) setAdminFromServer(!!j.admin);
      } catch {
        if (!ac.signal.aborted) setAdminFromServer(null);
      }
    })();
    return () => ac.abort();
  }, [session?.user?.id, profile?.role]);

  useEffect(() => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.metaApiAccountId) return a;
        if (a.status !== "live") return a;
        const floating = positions
          .filter((p) => p.accountId === a.id)
          .reduce((s, p) => s + p.pl, 0);
        return { ...a, equity: +(a.balance + floating).toFixed(2) };
      }),
    );
  }, [positions]);

  const onSignIn = useCallback(
    async (email: string, password: string) => {
      if (!supabaseClient) {
        return {
          error: configError || "Supabase is not configured.",
        };
      }
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    [supabaseClient, configError],
  );

  const onSignOut = useCallback(async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    setRoute("dashboard");
    setActiveAccountId("all");
  }, [supabaseClient]);

  const userLabel = useMemo(() => {
    if (profile?.full_name?.trim()) return profile.full_name.trim();
    return session?.user?.email || "User";
  }, [profile, session]);

  const userSub = useMemo(
    () => session?.user?.email || "",
    [session?.user?.email],
  );

  const isAdmin =
    adminFromServer !== null
      ? adminFromServer
      : isEffectivePortalAdmin(profile, session);

  if (configError && !supabaseClient) {
    return (
      <div className="app" style={{ padding: 40, maxWidth: 560 }}>
        <h1 style={{ fontFamily: "var(--serif)" }}>Configuration required</h1>
        <p style={{ color: "var(--ink-2)", marginTop: 12 }}>{configError}</p>
      </div>
    );
  }

  if (!hydrated || !supabaseClient) {
    return (
      <div
        className="app"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-3)",
        }}
      >
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen onSignIn={onSignIn} theme={theme} setTheme={setTheme} />
    );
  }

  return (
    <div className="app">
      <Sidebar
        route={route}
        setRoute={setRoute}
        accountsCount={accounts.length}
        positionsCount={positions.length}
        userLabel={userLabel}
        userSub={userSub}
        isAdmin={isAdmin}
        onSignOut={onSignOut}
      />
      <div className="main">
        <Topbar
          route={route}
          accounts={accounts}
          activeAccountId={activeAccountId}
          setActiveAccountId={setActiveAccountId}
          theme={theme}
          setTheme={setTheme}
        />
        <div className="page">
          {route === "dashboard" && (
            <Dashboard
              accounts={accounts}
              activeAccountId={activeAccountId}
              positions={positions}
              dataUpdatedAt={dataUpdatedAt}
            />
          )}
          {route === "accounts" && (
            <Accounts
              accounts={accounts}
              onSelect={(id) => {
                setActiveAccountId(id);
                setRoute("positions");
              }}
              dataUpdatedAt={dataUpdatedAt}
            />
          )}
          {route === "positions" && (
            <Positions
              accounts={accounts}
              positions={positions}
              activeAccountId={activeAccountId}
              setActiveAccountId={setActiveAccountId}
              dataUpdatedAt={dataUpdatedAt}
            />
          )}
          {route === "history" && (
            <History
              accounts={accounts}
              history={history}
              activeAccountId={activeAccountId}
              setActiveAccountId={setActiveAccountId}
              dataUpdatedAt={dataUpdatedAt}
            />
          )}
          {route === "settings" && supabaseClient && session.user && (
            <Settings
              supabase={supabaseClient}
              userId={session.user.id}
              profile={profile}
              authEmail={session.user.email ?? ""}
              onProfileRefresh={() =>
                bindUserIdentity(supabaseClient, session.user!.id)
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
