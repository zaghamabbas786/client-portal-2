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
    let msg = "fetch failed";
    if (e instanceof Error) {
      msg = e.message;
      const cause = (e as Error & { cause?: unknown }).cause;
      if (cause instanceof Error) msg += ` — cause: ${cause.message}`;
    } else if (typeof e === "string") {
      msg = e;
    }
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

  // MetaAPI list endpoint returns _id (with underscore); POST creation response returns id.
  type ProvAccount = { _id?: string; id?: string; login: string | number; server: string; region?: string; state?: string };

  function extractId(a: ProvAccount): string {
    return (a._id || a.id || "").trim();
  }

  // Check if the account is already provisioned in MetaAPI.
  const listRes = await metaGet<ProvAccount[]>("/users/current/accounts", provUrl);
  if (listRes.ok && Array.isArray(listRes.data)) {
    const existing = listRes.data.find(
      (a) => String(a.login) === data.login && a.server === data.server,
    );
    if (existing) {
      const id = extractId(existing);
      const region = existing.region || "new-york";
      console.log(`[metaapi] Found existing account ${id} region=${region} state=${existing.state}`);
      if (id) return { ok: true, data: { id, region } };
    }
  }

  // Create a new MetaAPI account.
  // MetaAPI returns 202 Accepted while validating credentials (not 201).
  // The 202 body is NOT the account object — re-list to find the new account.
  const createRes = await metaPost<ProvAccount>(
    provUrl,
    "/users/current/accounts",
    {
      login: data.login,
      password: data.password,
      server: data.server,
      platform: data.platform,
      name: data.name,
      magic: 0,
      reliability: "regular",
    },
  );

  // 202 means "validation in progress" — account was accepted, re-list to find the UUID.
  // 201 means created immediately — response body has the account object.
  if (!createRes.ok) return createRes;

  // If the POST returned the account object directly (201), try to use it.
  const directId = extractId(createRes.data);
  if (directId) {
    const region = createRes.data.region || "new-york";
    console.log(`[metaapi] Provisioned account ${directId} region=${region}`);
    return { ok: true, data: { id: directId, region } };
  }

  // 202 case: re-list to find the newly accepted account.
  const listRes2 = await metaGet<ProvAccount[]>("/users/current/accounts", provUrl);
  if (listRes2.ok && Array.isArray(listRes2.data)) {
    const found = listRes2.data.find(
      (a) => String(a.login) === data.login && a.server === data.server,
    );
    if (found) {
      const id = extractId(found);
      const region = found.region || "new-york";
      console.log(`[metaapi] Provisioned account (202 flow) ${id} region=${region} state=${found.state}`);
      if (id) return { ok: true, data: { id, region } };
    }
  }

  return { ok: false, status: 202, body: "Account accepted by MetaAPI but UUID not yet available — retry in a minute" };
}
