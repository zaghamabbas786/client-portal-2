"use client";

import React, { useCallback, useEffect, useState } from "react";
import { isPortalAdminRole } from "@/lib/auth/roles";
import { ConnectModal } from "@/components/portal/connect-modal";
import type { TradingAccountRow } from "@/lib/trading-account-mapper";

type UserRow = {
  id: string;
  email: string | undefined;
  profile: { role: string } | null;
};

export function AdminAccounts() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [accounts, setAccounts] = useState<TradingAccountRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [uRes, aRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/trading-accounts"),
    ]);
    const uj = await uRes.json();
    const aj = await aRes.json();
    if (!uRes.ok) setErr(uj.error || "Users load failed");
    else if (!aRes.ok) setErr(aj.error || "Accounts load failed");
    else {
      setErr(null);
      setUsers(uj.users ?? []);
      setAccounts(aj.accounts ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clientUsers = users
    .filter((u) => !isPortalAdminRole(u.profile?.role))
    .map((u) => ({ id: u.id, email: u.email || u.id }));

  async function removeAccount(id: string) {
    if (!confirm("Remove this linked account from the client portal?")) return;
    const res = await fetch(`/api/admin/trading-accounts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const j = await res.json();
    if (!res.ok) setErr(j.error || "Delete failed");
    else void load();
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Broker connections
          </div>
          <h1 className="page-title">Link MetaTrader accounts</h1>
          <div className="page-sub">
            Connect read-only credentials to a <strong>Standard</strong> user.
            They appear on the trading portal after refresh.
          </div>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn primary"
            onClick={() => setShowModal(true)}
          >
            Connect account
          </button>
        </div>
      </div>

      {err && (
        <div style={{ color: "var(--down)", marginBottom: 16, fontSize: 13 }}>
          {err}
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h3 className="panel-title">Linked accounts</h3>
        </div>
        <div className="panel-body flush">
          <table className="tbl">
              <thead>
                <tr>
                  <th>Client</th>
                <th>Label</th>
                <th>Platform</th>
                <th>Broker</th>
                <th className="mono">Login</th>
                <th className="mono">MetaAPI</th>
                <th className="num">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 24, color: "var(--ink-3)" }}>
                    No linked accounts yet.
                  </td>
                </tr>
              ) : (
                accounts.map((a) => {
                  const assigned = users.find((u) => u.id === a.user_id);
                  const assignedLabel =
                    assigned?.email || `${a.user_id.slice(0, 8)}…`;
                  return (
                  <tr key={a.id}>
                    <td style={{ fontSize: 12.5 }}>
                      <span className="truncate" style={{ display: "block" }}>
                        {assignedLabel}
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: 10,
                          color: "var(--ink-3)",
                          display: "block",
                          marginTop: 2,
                        }}
                      >
                        {a.user_id}
                      </span>
                    </td>
                    <td>{a.label}</td>
                    <td>{a.platform}</td>
                    <td>{a.broker}</td>
                    <td className="mono">{a.login}</td>
                    <td className="mono" style={{ fontSize: 10 }}>
                      {a.metaapi_account_id?.trim()
                        ? `${a.metaapi_account_id.slice(0, 8)}…`
                        : "—"}
                    </td>
                    <td className="num">
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ height: 30 }}
                        onClick={() => removeAccount(a.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && clientUsers.length > 0 && (
        <ConnectModal
          onClose={() => {
            setShowModal(false);
            void load();
          }}
          clientUsers={clientUsers}
          defaultUserId={clientUsers[0]?.id}
        />
      )}

      {showModal && clientUsers.length === 0 && (
        <div className="modal-scrim" onClick={() => setShowModal(false)} role="presentation">
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <div className="modal-body" style={{ padding: 32 }}>
              <p style={{ marginBottom: 16 }}>
                Create at least one <strong>Standard</strong> user under{" "}
                <a href="/admin/users">Users</a> before linking a broker account.
              </p>
              <button type="button" className="btn primary" onClick={() => setShowModal(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
