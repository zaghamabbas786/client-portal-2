/**
 * Browser-safe Supabase key: legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` or
 * newer dashboard name `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
 */
export function getSupabasePublicClientKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  );
}
