import { getMetaApiBaseUrl, getMetaApiProvisioningUrl, getMetaApiToken } from "./env";
import type {
  MetaAccountInformation,
  MetaDeal,
  MetaPosition,
} from "./types";

/** Avoid hanging the portal when MetaAPI is slow or unreachable */
const META_API_FETCH_MS = 28_000;

async function metaGet<T>(
  path: string,
  baseUrlOverride?: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number; body: string }> {
  const token = getMetaApiToken();
  const base = (baseUrlOverride || getMetaApiBaseUrl()).replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(META_API_FETCH_MS),
      headers: {
        Accept: "application/json",
        "auth-token": token,
      },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, status: res.status, body: text.slice(0, 500) };
    try {
      return { ok: true, data: JSON.parse(text) as T };
    } catch {
      return { ok: false, status: res.status, body: "invalid JSON from MetaAPI" };
    }
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : typeof e === "string" ? e : "fetch failed";
    return { ok: false, status: 0, body: msg.slice(0, 500) };
  }
}

function randomTransactionId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function metaPost<T>(
  baseUrl: string,
  path: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; status: number; body: string }> {
  const token = getMetaApiToken();
  const base = baseUrl.replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(META_API_FETCH_MS),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "auth-token": token,
        "transaction-id": randomTransactionId(),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, status: res.status, body: text.slice(0, 500) };
    try {
      return { ok: true, data: JSON.parse(text) as T };
    } catch {
      return { ok: false, status: res.status, body: "invalid JSON from MetaAPI" };
    }
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : typeof e === "string" ? e : "fetch failed";
    return { ok: false, status: 0, body: msg.slice(0, 500) };
  }
}

export async function fetchAccountInformation(metaAccountId: string, region?: string | null) {
  const path = `/users/current/accounts/${encodeURIComponent(metaAccountId)}/account-information?refreshTerminalState=true`;
  return metaGet<MetaAccountInformation>(path, getMetaApiBaseUrl(region));
}

export async function fetchOpenPositions(metaAccountId: string, region?: string | null) {
  const path = `/users/current/accounts/${encodeURIComponent(metaAccountId)}/positions?refreshTerminalState=true`;
  return metaGet<MetaPosition[]>(path, getMetaApiBaseUrl(region));
}

export async function fetchHistoryDeals(
  metaAccountId: string,
  startIso: string,
  endIso: string,
  region?: string | null,
) {
  const s = encodeURIComponent(startIso);
  const e = encodeURIComponent(endIso);
  const path = `/users/current/accounts/${encodeURIComponent(metaAccountId)}/history-deals/time/${s}/${e}`;
  return metaGet<MetaDeal[]>(path, getMetaApiBaseUrl(region));
}

/** Find an existing MetaAPI account by login + server, or provision a new one.
 *  Returns the MetaAPI account id and region. */
export async function provisionMetaApiAccount(data: {
  login: string;
  password: string;
  server: string;
  platform: "mt4" | "mt5";
  name: string;
}): Promise<{ ok: true; data: { id: string; region: string } } | { ok: false; status: number; body: string }> {
  const provUrl = getMetaApiProvisioningUrl();

  type ProvAccount = { id: string; login: string | number; server: string; region?: string };

  // Check if the account is already provisioned in MetaAPI.
  const listRes = await metaGet<ProvAccount[]>("/users/current/accounts", provUrl);
  if (listRes.ok && Array.isArray(listRes.data)) {
    const existing = listRes.data.find(
      (a) => String(a.login) === data.login && a.server === data.server,
    );
    if (existing) {
      const region = existing.region || "new-york";
      console.log(`[metaapi] Found existing account ${existing.id} region=${region}`);
      return { ok: true, data: { id: existing.id, region } };
    }
  }

  // Create a new MetaAPI account.
  const createRes = await metaPost<{ id: string }>(
    provUrl,
    "/users/current/accounts",
    {
      login: data.login,
      password: data.password,
      server: data.server,
      platform: data.platform,
      name: data.name,
      reliability: "regular",
    },
  );
  if (!createRes.ok) return createRes;

  // Fetch the newly created account to get its region.
  const detailRes = await metaGet<ProvAccount>(
    `/users/current/accounts/${encodeURIComponent(createRes.data.id)}`,
    provUrl,
  );
  const region = detailRes.ok ? (detailRes.data.region || "new-york") : "new-york";
  console.log(`[metaapi] Provisioned account ${createRes.data.id} region=${region}`);
  return { ok: true, data: { id: createRes.data.id, region } };
}
