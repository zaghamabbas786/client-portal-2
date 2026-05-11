import { createClient } from "@/lib/supabase/server";
import { isPortalAdminRole } from "@/lib/auth/roles";
import type { User } from "@supabase/supabase-js";

export type AdminCheckResult =
  | { ok: true; user: User; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; response: Response };

export async function requireUser(): Promise<AdminCheckResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return { ok: true, user, supabase };
}

export async function requireAdmin(): Promise<AdminCheckResult> {
  const base = await requireUser();
  if (!base.ok) return base;
  const { data: profile, error } = await base.supabase
    .from("profiles")
    .select("role")
    .eq("id", base.user.id)
    .maybeSingle();
  if (error || !isPortalAdminRole(profile?.role)) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return base;
}
