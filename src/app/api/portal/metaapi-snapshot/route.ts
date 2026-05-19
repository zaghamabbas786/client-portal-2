import {
  fetchAccountInformation,
  fetchHistoryDeals,
  fetchOpenPositions,
} from "@/lib/metaapi/client";
import { metaApiConfigured } from "@/lib/metaapi/env";
import { metaDealsToHistory, metaPositionToRow } from "@/lib/metaapi/mappers";
import type { MetaAccountInformation, MetaDeal, MetaPosition } from "@/lib/metaapi/types";
import type { HistoryRow, PortalAccount, PositionRow } from "@/lib/portal-data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  rowToPortalAccount,
  type TradingAccountRow,
} from "@/lib/trading-account-mapper";

function normalizeDealArray(payload: unknown): MetaDeal[] {
  if (Array.isArray(payload)) return payload as MetaDeal[];
  if (
    typeof payload === "object" &&
    payload !== null &&
    "deals" in payload &&
    Array.isArray((payload as { deals: unknown }).deals)
  )
    return (payload as { deals: MetaDeal[] }).deals;
  return [];
}

function normalizePositionArray(payload: unknown): MetaPosition[] {
  if (Array.isArray(payload)) return payload as MetaPosition[];
  if (
    typeof payload === "object" &&
    payload !== null &&
    "positions" in payload &&
    Array.isArray((payload as { positions: unknown }).positions)
  )
    return (payload as { positions: MetaPosition[] }).positions;
  return [];
}

function portalPatchFromMeta(
  baseline: PortalAccount,
  info: MetaAccountInformation | null,
): Partial<PortalAccount> & { id: string } {
  const p = baseline.platform;
  const platformUpper =
    info?.platform?.toLowerCase() === "mt4"
      ? "MT4"
      : info?.platform?.toLowerCase() === "mt5"
        ? "MT5"
        : p;

  const loginStr =
    info?.login != null ? String(info.login) : baseline.login;

  return {
    id: baseline.id,
    platform: platformUpper,
    broker: info?.broker ?? baseline.broker,
    server: info?.server ?? baseline.server,
    login: loginStr,
    currency: info?.currency ?? baseline.currency,
    balance:
      typeof info?.balance === "number" ? info.balance : baseline.balance,
    equity: typeof info?.equity === "number" ? info.equity : baseline.equity,
    margin: typeof info?.margin === "number" ? info.margin : baseline.margin,
    freeMargin:
      typeof info?.freeMargin === "number"
        ? info.freeMargin
        : baseline.freeMargin,
    leverage:
      typeof info?.leverage === "number" ? info.leverage : baseline.leverage,
    metaApiAccountId: baseline.metaApiAccountId,
  };
}

/** Live MetaApi state — `METAAPI_TOKEN` stays on the server. */
export async function GET() {
  if (!metaApiConfigured()) {
    return Response.json({ live: false as const });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rows, error } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", user.id);
  if (error)
    return Response.json({ error: error.message }, { status: 400 });

  const linked = (rows ?? []).filter((r): r is TradingAccountRow => {
    const raw = (r as TradingAccountRow).metaapi_account_id;
    const id = typeof raw === "string" ? raw.trim() : "";
    return id.length > 0;
  });

  console.log(`[metaapi-snapshot] user=${user.id} total_accounts=${(rows ?? []).length} linked_with_metaapi_id=${linked.length}`);

  if (linked.length === 0) {
    return Response.json({
      live: true as const,
      patches: [],
      positions: [],
      history: [],
    });
  }

  const end = new Date().toISOString();
  /** Allow 1Y filter in portal; MetaAPI returns closed deals in window. */
  const start = new Date(Date.now() - 400 * 86400_000).toISOString();

  const settled = await Promise.allSettled(
    linked.map(async (row) => {
      const baseline = rowToPortalAccount(row);
      const metaId = row.metaapi_account_id!.trim();
      const region = row.metaapi_region?.trim() || null;

      console.log(`[metaapi-snapshot] fetching account ${metaId} region=${region ?? "new-york(default)"}`);

      const [infoRes, posRes, dealsRes] = await Promise.all([
        fetchAccountInformation(metaId, region),
        fetchOpenPositions(metaId, region),
        fetchHistoryDeals(metaId, start, end, region),
      ]);

      if (!infoRes.ok) {
        console.error(`[metaapi-snapshot] account-information failed for ${metaId}: status=${infoRes.status} body=${infoRes.body}`);
      } else {
        console.log(`[metaapi-snapshot] account-information for ${metaId}:`, JSON.stringify(infoRes.data));
      }
      if (!posRes.ok) {
        console.error(`[metaapi-snapshot] positions failed for ${metaId}: status=${posRes.status} body=${posRes.body}`);
      } else {
        console.log(`[metaapi-snapshot] positions count for ${metaId}: ${normalizePositionArray(posRes.data).length}`);
      }

      const info = infoRes.ok ? infoRes.data : null;
      const posList = posRes.ok ? normalizePositionArray(posRes.data) : [];
      const deals = dealsRes.ok ? normalizeDealArray(dealsRes.data) : [];

      // Compute equity from balance + floating P&L (profit + swap) of open positions.
      // Some brokers (e.g. FTMO) return the floating P&L in MetaAPI's equity field
      // instead of the actual account equity, so we derive it ourselves when possible.
      let effectiveInfo = info;
      if (info && typeof info.balance === "number") {
        const floating = posList.reduce(
          (s, p) =>
            s +
            (typeof p.profit === "number" ? p.profit : 0) +
            (typeof p.swap === "number" ? p.swap : 0),
          0,
        );
        effectiveInfo = { ...info, equity: +(info.balance + floating).toFixed(2) };
      }

      const patches = portalPatchFromMeta(baseline, effectiveInfo);

      // Write live values back to DB so admin panel stays accurate and last-known
      // values are available if MetaAPI is temporarily unreachable.
      if (effectiveInfo && typeof effectiveInfo.balance === "number") {
        const admin = createAdminClient();
        await admin.from("trading_accounts").update({
          balance: effectiveInfo.balance,
          equity: effectiveInfo.equity ?? effectiveInfo.balance,
          margin: typeof effectiveInfo.margin === "number" ? effectiveInfo.margin : undefined,
          free_margin: typeof effectiveInfo.freeMargin === "number" ? effectiveInfo.freeMargin : undefined,
          leverage: typeof effectiveInfo.leverage === "number" ? effectiveInfo.leverage : undefined,
          currency: effectiveInfo.currency ?? undefined,
          broker: effectiveInfo.broker ?? undefined,
          server: effectiveInfo.server ?? undefined,
        }).eq("id", row.id);
      }

      const positions = posList
        .map((p) => metaPositionToRow(p, baseline.id))
        .filter((x): x is NonNullable<typeof x> => x != null);

      const history = metaDealsToHistory(deals, baseline.id, 600);

      return { patches, positions, history };
    }),
  );

  const patches: Array<Partial<PortalAccount> & { id: string }> = [];
  const positions: PositionRow[] = [];
  const history: HistoryRow[] = [];

  for (const s of settled) {
    if (s.status !== "fulfilled") continue;
    patches.push(s.value.patches);
    positions.push(...s.value.positions);
    history.push(...s.value.history);
  }

  history.sort((a, b) => b.closeTime - a.closeTime);
  const historyTrimmed = history.slice(0, 600);

  return Response.json({
    live: true as const,
    patches,
    positions,
    history: historyTrimmed,
  });
}
