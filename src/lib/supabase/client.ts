import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicClientKey } from "./public-client-key";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = getSupabasePublicClientKey();
  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL and a publishable client key (NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Copy .env.example to .env.local.",
    );
  }
  return createBrowserClient(url, anon);
}
