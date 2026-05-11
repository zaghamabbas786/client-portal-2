import { isPortalAdminRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!isPortalAdminRole(profile?.role)) redirect("/");

  return (
    <div className="app" style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        className="sidebar"
        style={{ width: 248, flexShrink: 0, paddingTop: 16 }}
      >
        <div className="sidebar-brand">
          <Link
            href="/admin"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={{ fontFamily: "var(--serif)", fontSize: 17 }}>
              Admin console
            </div>
            <div
              className="mono"
              style={{
                fontSize: 9.5,
                letterSpacing: "0.18em",
                color: "var(--ink-3)",
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              Vivid Capital
            </div>
          </Link>
        </div>

        <div className="nav-section">Manage</div>
        <Link
          href="/admin/users"
          className="nav-item"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <span>Users</span>
        </Link>
        <Link
          href="/admin/accounts"
          className="nav-item"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <span>Link accounts</span>
        </Link>

        <div className="nav-section">Portal</div>
        <Link
          href="/"
          className="nav-item"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <span>← Client portal</span>
        </Link>
      </aside>
      <div className="main" style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
