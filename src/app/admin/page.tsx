import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Administration
          </div>
          <h1 className="page-title">Overview</h1>
          <div className="page-sub">
            Manage Standard users (trading portal) and assign Administrator
            access. Link broker accounts only from this console.
          </div>
        </div>
      </div>
      <div
        className="grid-2"
        style={{ maxWidth: 720, gap: 20, marginTop: 8 }}
      >
        <Link href="/admin/users" className="panel" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="panel-head">
              <h3 className="panel-title">Users</h3>
            </div>
            <div className="panel-body">
              <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
                Manage roles (<strong>Standard</strong> vs{" "}
                <strong>Administrator</strong>), create logins, and remove users.
              </p>
            </div>
          </Link>
        <Link href="/admin/accounts" className="panel" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="panel-head">
              <h3 className="panel-title">Link accounts</h3>
            </div>
            <div className="panel-body">
              <p style={{ fontSize: 14, color: "var(--ink-2)" }}>
                Connect MetaTrader credentials to a Standard user. Only admins
                can create these links.
              </p>
            </div>
          </Link>
      </div>
    </div>
  );
}
