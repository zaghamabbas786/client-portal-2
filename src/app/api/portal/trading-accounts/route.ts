import { createClient } from "@/lib/supabase/server";

/** Linked broker rows visible to `auth.uid()` (RLS). Uses cookie session so it matches middleware. */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ rows: [], error: "Unauthorized" }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ rows: [], error: error.message }, { status: 400 });
  }
  return Response.json({ rows: rows ?? [] });
}
