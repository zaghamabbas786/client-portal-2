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
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; body: string }> {
  const token = getMetaApiToken();
  const base = getMetaApiBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(META_API_FETCH_MS),
      headers: {
        Accept: "application/json",
        "auth-token": token,
        ...(init?.headers ?? {}),
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

export async function fetchAccountInformation(metaAccountId: string) {
  const path = `/users/current/accounts/${encodeURIComponent(metaAccountId)}/account-information?refreshTerminalState=true`;
  return metaGet<MetaAccountInformation>(path);
}

export async function fetchOpenPositions(metaAccountId: string) {
  const path = `/users/current/accounts/${encodeURIComponent(metaAccountId)}/positions`;
  return metaGet<MetaPosition[]>(path);
}

export async function fetchHistoryDeals(
  metaAccountId: string,
  startIso: string,
  endIso: string,
) {
  const s = encodeURIComponent(startIso);
  const e = encodeURIComponent(endIso);
  const path = `/users/current/accounts/${encodeURIComponent(metaAccountId)}/history-deals/time/${s}/${e}`;
  return metaGet<MetaDeal[]>(path);
}

/** Provision a new MetaAPI account and return its UUID. */
export async function provisionMetaApiAccount(data: {
  login: string;
  password: string;
  server: string;
  platform: "mt4" | "mt5";
  name: string;
}) {
  return metaPost<{ id: string }>(
    getMetaApiProvisioningUrl(),
    "/users/current/accounts",
    {
      login: data.login,
      password: data.password,
      server: data.server,
      platform: data.platform,
      name: data.name,
      type: "cloud-g2",
    },
  );
}
