"use client";

import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { isEffectivePortalAdmin } from "@/lib/auth/roles";
import {
  rowToPortalAccount,
  type ProfileRow,
  type TradingAccountRow,
} from "@/lib/trading-account-mapper";
import type { PortalAccount, HistoryRow, PositionRow } from "@/lib/portal-data";
import type { Session } from "@supabase/supabase-js";
import { LoginScreen } from "./login-screen";
import { Dashboard } from "./portal-pages";
import { PageLoader } from "./primitives";
import { Sidebar, Topbar } from "./shell";

/** Non-default routes are loaded on demand to keep initial chunk small. */
const Accounts = lazy(() =>
  import("./portal-pages").then((m) => ({ default: m.Accounts })),
);
const History = lazy(() =>
  import("./portal-pages").then((m) => ({ default: m.History })),
);
const Positions = lazy(() =>
  import("./portal-pages").then((m) => ({ default: m.Positions })),
);
const Settings = lazy(() =>
  import("./portal-pages").then((m) => ({ default: m.Settings })),
);

/** Minimum interval between auto-refetches on tab focus / auth events. */
const REFRESH_MIN_INTERVAL_MS = 15_000;

/** Meta overlay; keep short — baseline UI already paints from DB. */
const METAPI_SNAPSHOT_CLIENT_MS = 12_000;

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
      return { accounts: mapped, positions: [], history: [] };
    }

    const patchMap = new Map(j.patches.map((p) => [p.id, p]));
    const mergedAccounts = mapped.map((a) => ({
      ...a,
      ...patchMap.get(a.id),
    }));

    const metaPos = Array.isArray(j.positions) ? j.positions : [];
    const metaHist = Array.isArray(j.history) ? j.history : [];
    const history = metaHist.sort((a, b) => b.closeTime - a.closeTime);

    return {
      accounts: mergedAccounts,
      positions: metaPos,
      history: history.slice(0, 400),
    };
  } catch {
    return { accounts: mapped, positions: [], history: [] };
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [accounts, setAccounts] = useState<PortalAccount[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [dataUpdatedAt, setDataUpdatedAt] = useState(() => Date.now());

  /** Server-derived admin (cookies); fixes sidebar when client profile state lags behind DB */
  const [adminFromServer, setAdminFromServer] = useState<boolean | null>(null);

  const bindUserIdentity = useCallback(
    async (sb: NonNullable<typeof supabaseClient>, authUserId: string) => {
      const { data: prof, error: profErr } = await sb
        .from("profiles")
        .select("*")
        .eq("id", authUserId)
        .maybeSingle();
      if (profErr) console.error(profErr);
      setProfile(((prof ?? null) as ProfileRow | null) ?? null);
    },
    [],
  );

  const loadPortalData = useCallback(
    async (sb: NonNullable<typeof supabaseClient>, uid: string) => {
      const applyBaselineThenMeta = (mapped: PortalAccount[]) => {
        setAccounts(mapped);
        setPositions([]);
        setHistory([]);
        setDataUpdatedAt(Date.now());

        void hydrateFromMetaSnapshot(mapped)
          .then((merged) => {
            setAccounts(merged.accounts);
            setPositions(merged.positions);
            setHistory(merged.history);
            setDataUpdatedAt(Date.now());
          })
          .catch((e) =>
            console.error("[portal-app] Meta snapshot overlay failed:", e),
          );
      };

      try {
        const res = await fetch("/api/portal/trading-accounts", {
          credentials: "same-origin",
        });

        if (res.ok) {
          const j = (await res.json()) as { rows?: unknown[] };
          const mapped = (j.rows ?? []).map((r) =>
            rowToPortalAccount(r as TradingAccountRow),
          );
          applyBaselineThenMeta(mapped);
          return;
        }

        if (res.status === 401) {
          applyBaselineThenMeta([]);
          return;
        }

        console.warn(
          "[portal-app] /api/portal/trading-accounts fallback to browser Supabase:",
          res.status,
        );

        const { data, error } = await sb
          .from("trading_accounts")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: true });
        if (error) {
          console.error(error);
          return;
        }
        applyBaselineThenMeta(
          (data ?? []).map((r) => rowToPortalAccount(r as TradingAccountRow)),
        );
      } catch (e) {
        console.error(e);
      }
    },
    [],
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  /**
   * Tracks the last load + an in-flight promise so concurrent callers (React
   * StrictMode double-mount, INITIAL_SESSION + bootstrap race, TOKEN_REFRESHED)
   * share one fetch instead of duplicating it.
   */
  const lastLoadedForUserRef = useRef<string | null>(null);
  const lastLoadedAtRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const ensureLoaded = useCallback(
    (
      sb: NonNullable<typeof supabaseClient>,
      uid: string,
      force = false,
    ): Promise<void> => {
      const sameUser = lastLoadedForUserRef.current === uid;
      const recent = Date.now() - lastLoadedAtRef.current < REFRESH_MIN_INTERVAL_MS;

      if (inFlightRef.current && sameUser) return inFlightRef.current;
      if (!force && sameUser && recent) return Promise.resolve();

      lastLoadedForUserRef.current = uid;
      lastLoadedAtRef.current = Date.now();
      const p = Promise.all([
        bindUserIdentity(sb, uid),
        loadPortalData(sb, uid),
      ])
        .then(() => undefined)
        .finally(() => {
          if (inFlightRef.current === p) inFlightRef.current = null;
        });
      inFlightRef.current = p;
      return p;
    },
    [bindUserIdentity, loadPortalData],
  );

  useEffect(() => {
    if (!supabaseClient) return;

    let cancelled = false;
    /** Avoid re-running on the implicit INITIAL_SESSION event that fires right after bootstrap. */
    let bootstrapped = false;

    void (async () => {
      const watchdog = window.setTimeout(() => {
        if (!cancelled) setHydrated(true);
      }, 8_000);
      try {
        const {
          data: { session: s },
        } = await supabaseClient.auth.getSession();
        if (cancelled) return;
        setSession(s);
        // Unblock the shell before data loads — UI paints with empty state,
        // then accounts/positions fill in below.
        setHydrated(true);
        if (s?.user) {
          await ensureLoaded(supabaseClient, s.user.id, true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        window.clearTimeout(watchdog);
        bootstrapped = true;
        if (!cancelled) setHydrated(true);
      }
    })();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, s) => {
      // Ignore the synthetic INITIAL_SESSION fired right after bootstrap path.
      if (!bootstrapped && event === "INITIAL_SESSION") return;
      setSession(s);
      if (s?.user) {
        void ensureLoaded(supabaseClient, s.user.id, event === "SIGNED_IN");
      } else {
        lastLoadedForUserRef.current = null;
        lastLoadedAtRef.current = 0;
        setProfile(null);
        setAccounts([]);
        setPositions([]);
        setHistory([]);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabaseClient, ensureLoaded]);

  useEffect(() => {
    if (!supabaseClient || !session?.user?.id) return;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void ensureLoaded(supabaseClient, session.user!.id);
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [supabaseClient, session?.user?.id, ensureLoaded]);

  const sessionUserId = session?.user?.id;
  /** Server admin lookup is cheap (Cache-Control: private, max-age=30) and the
   *  answer is identical for a given user id, so depending on profile?.role
   *  here just caused a redundant call when bindUserIdentity finished. */
  useEffect(() => {
    if (!sessionUserId) {
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
  }, [sessionUserId]);

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
      <div className="app">
        <PageLoader label="Loading portal" />
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
        setRoute={(r) => { setRoute(r); setSidebarOpen(false); }}
        accountsCount={accounts.length}
        positionsCount={positions.length}
        userLabel={userLabel}
        userSub={userSub}
        isAdmin={isAdmin}
        onSignOut={onSignOut}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main">
        <Topbar
          route={route}
          accounts={accounts}
          activeAccountId={activeAccountId}
          setActiveAccountId={setActiveAccountId}
          theme={theme}
          setTheme={setTheme}
          onMenuOpen={() => setSidebarOpen(true)}
        />
        <div className="page">
          {route === "dashboard" && (
            <Dashboard
              accounts={accounts}
              activeAccountId={activeAccountId}
              positions={positions}
              history={history}
              dataUpdatedAt={dataUpdatedAt}
            />
          )}
          <Suspense fallback={<PageLoader inline label="Loading" />}>
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
          </Suspense>
        </div>
      </div>
    </div>
  );
}
