import { requireAdmin } from "@/lib/auth/guards";
import { parsePortalRole, type PortalRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin"; // still used by DELETE

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  let body: {
    full_name?: string;
    role?: PortalRole | string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, string> = {};
  if (typeof body.full_name === "string") patch.full_name = body.full_name;
  if (typeof body.role === "string") {
    const r = parsePortalRole(body.role);
    patch.role = r;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  // Use the authenticated admin's own client so auth.uid() is set correctly
  // in DB triggers that check the caller's role. Service-role has no JWT so
  // auth.uid() returns null and triggers that guard role changes block it.
  const { data: updated, error } = await gate.supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select("id");
  if (error) return Response.json({ error: error.message }, { status: 400 });
  if (!updated || updated.length === 0) {
    return Response.json(
      { error: "Update blocked — ensure the admin RLS policy exists on profiles." },
      { status: 403 },
    );
  }
  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id } = await params;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  if (id === gate.user.id) {
    return Response.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
