import { requireAdmin } from "@/lib/auth/guards";
import { getMetaApiProvisioningUrl, getMetaApiToken, metaApiConfigured } from "@/lib/metaapi/env";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  if (!metaApiConfigured()) {
    return Response.json({ suggestions: [] });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const platform = searchParams.get("platform") === "MT4" ? "4" : "5";

  if (q.length < 2) return Response.json({ suggestions: [] });

  try {
    const base = getMetaApiProvisioningUrl().replace(/\/$/, "");
    const url = `${base}/known-mt-servers/${platform}/search?query=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { "auth-token": getMetaApiToken() },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) return Response.json({ suggestions: [] });
    const data = (await res.json()) as { broker?: string; server?: string }[];
    const suggestions = Array.isArray(data)
      ? data.map((s) => ({ broker: s.broker ?? "", server: s.server ?? "" })).filter((s) => s.server)
      : [];
    return Response.json({ suggestions });
  } catch {
    return Response.json({ suggestions: [] });
  }
}
