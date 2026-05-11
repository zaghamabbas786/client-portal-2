import type { PortalAccount } from "@/lib/portal-data";

/** Row shape from public.trading_accounts (Supabase). */
export type TradingAccountRow = {
  id: string;
  user_id: string;
  platform: string;
  broker: string;
  server: string;
  login: string;
  label: string;
  status: string;
  currency: string;
  strategy: string | null;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  leverage: number;
  deposit: number;
  opened_at: string | null;
  seed: number;
  metaapi_account_id?: string | null;
  created_at?: string;
};

export function rowToPortalAccount(row: TradingAccountRow): PortalAccount {
  return {
    id: row.id,
    platform: row.platform,
    broker: row.broker,
    server: row.server,
    login: row.login,
    label: row.label,
    status: row.status,
    currency: row.currency,
    strategy: row.strategy || "—",
    balance: row.balance,
    equity: row.equity,
    margin: row.margin,
    freeMargin: row.free_margin,
    leverage: row.leverage,
    deposit: row.deposit,
    openedAt: row.opened_at || new Date().toISOString().slice(0, 10),
    seed: row.seed,
    metaApiAccountId:
      typeof row.metaapi_account_id === "string" &&
      row.metaapi_account_id.trim()
        ? row.metaapi_account_id.trim()
        : null,
  };
}

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  /** Optional; column added in master.sql `profiles.phone`. */
  phone?: string | null;
  role: "admin" | "standard" | "client";
  created_at?: string;
};
