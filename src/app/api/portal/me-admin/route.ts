import { isEffectivePortalAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

/** Tiny JSON for the client sidebar admin check. */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json(
      { admin: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  // Session + profile in parallel — session is only needed for JWT role hint.
  const [{ data: sessionData }, { data: profile }] = await Promise.all([
    supabase.auth.getSession(),
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const admin = isEffectivePortalAdmin(profile, sessionData.session ?? null);
  return Response.json(
    { admin },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
