import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Skip Supabase cookie refresh on API routes (each route handles its own auth
 * via the server client) and on any static-looking asset. Saves ~200-1000ms
 * of upstream auth calls per request — the main reload bottleneck.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) return NextResponse.next();
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|map|txt|xml|woff2?)$).*)",
  ],
};
