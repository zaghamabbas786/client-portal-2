import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("trading_accounts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ accounts: data ?? [] });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: {
    user_id?: string;
    platform?: string;
    broker?: string;
    server?: string;
    login?: string;
    label?: string;
    metaapi_account_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = typeof body.user_id === "string" ? body.user_id : "";
  const platform = typeof body.platform === "string" ? body.platform : "MT5";
  const broker = typeof body.broker === "string" ? body.broker.trim() : "";
  const server = typeof body.server === "string" ? body.server.trim() : "";
  const login = typeof body.login === "string" ? body.login.trim() : "";
  const label =
    typeof body.label === "string" && body.label.trim()
      ? body.label.trim()
      : `${platform} — ${broker}`;

  const metaapiId =
    typeof body.metaapi_account_id === "string"
      ? body.metaapi_account_id.trim()
      : "";

  if (!userId || !broker || !server || !login) {
    return Response.json(
      { error: "user_id, broker, server, and login are required" },
      { status: 400 },
    );
  }

  const seed = Math.floor(Math.random() * 900) + 100;
  const deposit = 100_000;
  const balance = deposit * 0.98;
  const margin = 9200;
  const freeMargin = balance - margin;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("trading_accounts")
    .insert({
      user_id: userId,
      platform,
      broker,
      server,
      login,
      label,
      status: "live",
      currency: "USD",
      strategy: "Client account",
      balance,
      equity: balance + 1200,
      margin,
      free_margin: freeMargin,
      leverage: 100,
      deposit,
      opened_at: new Date().toISOString().slice(0, 10),
      seed,
      metaapi_account_id: metaapiId ? metaapiId : null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ account: data });
}

export async function DELETE(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id query" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("trading_accounts").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
