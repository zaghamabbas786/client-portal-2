import type { HistoryRow, PositionRow } from "@/lib/portal-data";
import { symbolDefForSymbol } from "@/lib/portal-data";
import type { MetaDeal, MetaPosition } from "./types";

function decimalsForSymbol(sym: string) {
  if (sym.includes("JPY")) return 3;
  if (sym === "XAUUSD") return 2;
  if (sym.startsWith("US") || sym.startsWith("NAS") || sym === "BTCUSD")
    return 2;
  return 5;
}

function pipMultiplier(sym: string) {
  if (sym === "USDJPY") return 100;
  if (sym === "XAUUSD") return 1;
  if (sym.startsWith("US") || sym.startsWith("NAS") || sym === "BTCUSD")
    return 1;
  return 10_000;
}

export function metaPositionToRow(
  p: MetaPosition,
  portalAccountId: string,
): PositionRow | null {
  if (!p.symbol || p.volume === undefined || p.volume === null) return null;
  const side =
    p.type === "POSITION_TYPE_BUY"
      ? "BUY"
      : p.type === "POSITION_TYPE_SELL"
        ? "SELL"
        : "";
  if (!side) return null;
  const openPrice =
    typeof p.openPrice === "number" ? p.openPrice : p.currentPrice ?? 0;
  const currentPrice =
    typeof p.currentPrice === "number" ? p.currentPrice : openPrice;
  const d = decimalsForSymbol(p.symbol);
  const symDef = symbolDefForSymbol(p.symbol);
  const openTime = p.time ? new Date(p.time).getTime() : Date.now();

  return {
    id: String(p.id),
    accountId: portalAccountId,
    symbol: p.symbol,
    side,
    lots: p.volume,
    openPrice: +openPrice.toFixed(d),
    currentPrice: +currentPrice.toFixed(d),
    pipMultiplier: pipMultiplier(p.symbol),
    symDef,
    openTime,
    pl:
      typeof p.profit === "number"
        ? +p.profit.toFixed(2)
        : 0,
    swap:
      typeof p.swap === "number"
        ? +p.swap.toFixed(2)
        : 0,
    sl: p.stopLoss != null ? p.stopLoss : null,
    tp: p.takeProfit != null ? p.takeProfit : null,
  };
}

function dealSide(type: string): string | null {
  if (type === "DEAL_TYPE_BUY") return "BUY";
  if (type === "DEAL_TYPE_SELL") return "SELL";
  return null;
}

/** Pair DEAL_ENTRY_IN with DEAL_ENTRY_OUT by position id for simplified closed-trade rows. */
export function metaDealsToHistory(
  deals: MetaDeal[],
  portalAccountId: string,
  maxRows: number,
): HistoryRow[] {
  const typed = deals.filter(
    (d) =>
      d.positionId &&
      d.symbol &&
      dealSide(d.type) &&
      d.price != null &&
      !Number.isNaN(Number(d.price)),
  );
  typed.sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );

  const opens = typed.filter((d) => d.entryType === "DEAL_ENTRY_IN");
  const closes = typed.filter((d) => d.entryType === "DEAL_ENTRY_OUT");
  const byPosOpens = new Map<string, MetaDeal[]>();
  for (const d of opens) {
    const k = d.positionId!;
    if (!byPosOpens.has(k)) byPosOpens.set(k, []);
    byPosOpens.get(k)!.push(d);
  }

  const out: HistoryRow[] = [];
  for (const cls of closes) {
    const pid = cls.positionId!;
    const sym = cls.symbol!;
    const cand = byPosOpens.get(pid) ?? [];
    const clsT = new Date(cls.time).getTime();
    let openDeal: MetaDeal | undefined;
    for (let i = cand.length - 1; i >= 0; i--) {
      if (new Date(cand[i]!.time).getTime() <= clsT) {
        openDeal = cand[i];
        break;
      }
    }
    if (!openDeal) continue;

    const openSide =
      dealSide(openDeal.type) ?? dealSide(cls.type);
    if (!openSide) continue;

    const d = decimalsForSymbol(sym);
    const openPrice =
      typeof openDeal.price === "number" ? openDeal.price : cls.price!;
    const closePrice =
      typeof cls.price === "number" ? cls.price : openPrice;

    const comm =
      typeof cls.commission === "number"
        ? cls.commission + (typeof openDeal.commission === "number"
            ? openDeal.commission
            : 0)
        : typeof openDeal.commission === "number"
          ? openDeal.commission
          : 0;
    const plRaw =
      typeof cls.profit === "number"
        ? cls.profit
        : typeof openDeal.profit === "number"
          ? openDeal.profit
          : 0;
    const vol =
      typeof cls.volume === "number"
        ? cls.volume
        : typeof openDeal.volume === "number"
          ? openDeal.volume!
          : 0;

    out.push({
      id: `#${cls.id}`,
      accountId: portalAccountId,
      symbol: sym,
      side: openSide,
      lots: vol,
      openPrice: +openPrice.toFixed(d),
      closePrice: +closePrice.toFixed(d),
      openTime: new Date(openDeal.time).getTime(),
      closeTime: new Date(cls.time).getTime(),
      pl: +plRaw.toFixed(2),
      commission: +comm.toFixed(2),
      net: +(plRaw + comm).toFixed(2),
    });
  }

  out.sort((a, b) => b.closeTime - a.closeTime);
  return out.slice(0, maxRows);
}
