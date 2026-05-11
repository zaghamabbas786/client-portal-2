import { isEffectivePortalAdmin } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

/** Same admin check as `/api/debug/portal-role` but tiny JSON for the client sidebar. */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ admin: false });
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const admin = isEffectivePortalAdmin(profile, session ?? null);
  return Response.json({ admin });
}
