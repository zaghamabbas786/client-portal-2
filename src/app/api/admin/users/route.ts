import { parsePortalRole } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const admin = createAdminClient();
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    perPage: 500,
  });
  if (listErr) {
    return Response.json({ error: listErr.message }, { status: 400 });
  }
  const ids = list.users.map((u) => u.id);
  if (ids.length === 0) {
    return Response.json({ users: [] });
  }
  const { data: profiles, error: profilesErr } = await admin
    .from("profiles")
    .select("*")
    .in("id", ids);
  if (profilesErr) {
    return Response.json({ error: profilesErr.message }, { status: 400 });
  }
  const profileById = new Map((profiles || []).map((p) => [p.id, p]));
  const users = list.users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    profile: profileById.get(u.id) ?? null,
  }));
  return Response.json({ users });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: {
    email?: string;
    password?: string;
    full_name?: string;
    role?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return Response.json(
      { error: "email and password are required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name ?? "",
      },
    },
  );
  if (createErr || !created.user) {
    return Response.json(
      { error: createErr?.message ?? "Create failed" },
      { status: 400 },
    );
  }

  const role = parsePortalRole(body.role);
  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: created.user.id,
      email: created.user.email,
      full_name: body.full_name ?? "",
      role,
    },
    { onConflict: "id" },
  );
  if (profErr) {
    return Response.json({ error: profErr.message }, { status: 400 });
  }

  return Response.json({ user: created.user });
}
