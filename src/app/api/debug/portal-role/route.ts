import {
  isEffectivePortalAdmin,
  profileRoleFromRow,
  sessionPortalRoleHint,
} from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Diagnostics for “admin sidebar missing”. Logs appear in the **terminal** running
 * the Next server (`pnpm dev`), or after `ENABLE_PORTAL_DEBUG=true` /
 * `NEXT_PUBLIC_ENABLE_PORTAL_DEBUG=true` (+ restart).
 */
export async function GET() {
  const enabled =
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_PORTAL_DEBUG === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_PORTAL_DEBUG === "true";

  if (!enabled) {
    return new Response(
      JSON.stringify({ ok: false, reason: "debug route disabled in production" }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("\n──────── [debug/portal-role] ────────");
  console.log("auth.getUser", {
    ok: !!user,
    userId: user?.id ?? null,
    email: user?.email ?? null,
    error: userErr?.message ?? null,
  });
  console.log("auth.getSession", { hasSession: !!session?.user });

  let profile: unknown = null;
  let profileErr: string | null = null;
  let extractedRole: string | undefined;
  let rawRole: unknown = null;

  if (user) {
    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = prof ?? null;
    profileErr = pErr?.message ?? null;
    rawRole =
      typeof prof === "object" && prof !== null && "role" in prof
        ? (prof as { role: unknown }).role
        : null;
    extractedRole = profileRoleFromRow(prof);
    console.log("profiles.maybeSingle", {
      queryId: user.id,
      rowsReturned: profile ? 1 : 0,
      postgrestError: profileErr,
      rawRoleColumn: rawRole ?? null,
      profileRoleExtracted: extractedRole ?? null,
    });
  }

  const hint = sessionPortalRoleHint(session ?? null);
  const effectiveAdmin = isEffectivePortalAdmin(profile, session ?? null);
  console.log("sidebar isAdmin heuristic", {
    sessionPortalHint: hint ?? null,
    effectivePortalAdmin: effectiveAdmin,
  });
  console.log("──────── end debug/portal-role ────────\n");

  return Response.json({
    ok: true,
    authUserId: user?.id ?? null,
    email: user?.email ?? null,
    profileExists: !!profile,
    profilesRowError: profileErr,
    profileRoleRaw: rawRole ?? null,
    profileRoleExtracted: extractedRole ?? null,
    sessionPortalRoleHint: hint ?? null,
    isEffectivePortalAdmin: effectiveAdmin,
  });
}
