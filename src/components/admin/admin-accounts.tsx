"use client";

import React, { useCallback, useEffect, useState } from "react";
import { isPortalAdminRole } from "@/lib/auth/roles";
import { ConnectModal } from "@/components/portal/connect-modal";
import { LoadingButton, PageLoader } from "@/components/portal/primitives";
import type { TradingAccountRow } from "@/lib/trading-account-mapper";

type UserRow = {
  id: string;
  email: string | undefined;
  profile: { role: string } | null;
};

type EditState = {
  id: string;
  broker: string;
  server: string;
  login: string;
  label: string;
  metaapi_account_id: string;
  saving: boolean;
};

type RetryState = {
  id: string;
  password: string;
  loading: boolean;
  error: string | null;
};

export function AdminAccounts() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [accounts, setAccounts] = useState<TradingAccountRow[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [retry, setRetry] = useState<RetryState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clientUsers = users
    .filter((u) => !isPortalAdminRole(u.profile?.role))
    .map((u) => ({ id: u.id, email: u.email || u.id }));

  function startEdit(a: TradingAccountRow) {
    setEditing({
      id: a.id,
      broker: a.broker,
      server: a.server,
      login: a.login,
      label: a.label,
      metaapi_account_id: a.metaapi_account_id ?? "",
      saving: false,
    });
  }

  async function saveEdit() {
    if (!editing || editing.saving) return;
    setEditing((e) => e && { ...e, saving: true });
    try {
      const res = await fetch(
        `/api/admin/trading-accounts?id=${encodeURIComponent(editing.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            broker: editing.broker,
            server: editing.server,
            login: editing.login,
            label: editing.label,
            metaapi_account_id: editing.metaapi_account_id || null,
          }),
        },
      );
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Save failed"); }
      else { setEditing(null); await load(); }
    } finally {
      setEditing((e) => e && { ...e, saving: false });
    }
  }

  async function retryProvision() {
    if (!retry || retry.loading || !retry.password.trim()) return;
    setRetry((r) => r && { ...r, loading: true, error: null });
    try {
      const res = await fetch(
        `/api/admin/trading-accounts?id=${encodeURIComponent(retry.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provision_password: retry.password }),
        },
      );
      const j = await res.json();
      if (!res.ok) {
        setRetry((r) => r && { ...r, loading: false, error: j.error || "Provisioning failed" });
      } else {
        setRetry(null);
        await load();
      }
    } catch {
      setRetry((r) => r && { ...r, loading: false, error: "Request failed" });
    }
  }

  async function removeAccount(id: string) {
    if (removingId) return;
    if (!confirm("Remove this linked account from the client portal?")) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/admin/trading-accounts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const j = await res.json();
      if (!res.ok) setErr(j.error || "Delete failed");
      else await load();
    } finally {
      setRemovingId(null);
    }
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
          {loading ? (
            <PageLoader inline label="Loading accounts" />
          ) : (
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
                  const assignedLabel = assigned?.email || `${a.user_id.slice(0, 8)}…`;
                  const isEditing = editing?.id === a.id;

                  if (isEditing) {
                    return (
                      <tr key={a.id} style={{ background: "var(--surface-2)" }}>
                        <td style={{ fontSize: 12.5 }}>{assignedLabel}</td>
                        <td>
                          <input
                            className="mono"
                            value={editing.label}
                            onChange={(e) => setEditing((s) => s && { ...s, label: e.target.value })}
                            style={{ width: "100%", fontSize: 12, padding: "4px 6px" }}
                          />
                        </td>
                        <td>{a.platform}</td>
                        <td>
                          <input
                            value={editing.broker}
                            onChange={(e) => setEditing((s) => s && { ...s, broker: e.target.value })}
                            style={{ width: "100%", fontSize: 12, padding: "4px 6px" }}
                          />
                        </td>
                        <td>
                          <input
                            className="mono"
                            value={editing.login}
                            onChange={(e) => setEditing((s) => s && { ...s, login: e.target.value })}
                            style={{ width: 90, fontSize: 12, padding: "4px 6px" }}
                          />
                        </td>
                        <td>
                          <input
                            className="mono"
                            placeholder="MetaAPI UUID"
                            value={editing.metaapi_account_id}
                            onChange={(e) => setEditing((s) => s && { ...s, metaapi_account_id: e.target.value })}
                            style={{ width: "100%", fontSize: 11, padding: "4px 6px" }}
                          />
                        </td>
                        <td className="num" style={{ whiteSpace: "nowrap" }}>
                          <LoadingButton
                            variant="primary"
                            loading={editing.saving}
                            loadingText="Saving…"
                            style={{ height: 28, fontSize: 12 }}
                            onClick={saveEdit}
                          >
                            Save
                          </LoadingButton>
                          <button
                            type="button"
                            className="btn ghost"
                            style={{ height: 28, fontSize: 12, marginLeft: 4 }}
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  const isRetrying = retry?.id === a.id;
                  const noMetaApi = !a.metaapi_account_id?.trim();

                  return (
                    <React.Fragment key={a.id}>
                    <tr>
                      <td style={{ fontSize: 12.5 }}>
                        <span className="truncate" style={{ display: "block" }}>
                          {assignedLabel}
                        </span>
                        <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", display: "block", marginTop: 2 }}>
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
                          : <span style={{ color: "var(--down)" }}>not set</span>}
                      </td>
                      <td className="num" style={{ whiteSpace: "nowrap" }}>
                        {noMetaApi && (
                          <button
                            type="button"
                            className="btn ghost"
                            style={{ height: 30, fontSize: 11, marginRight: 4, color: "var(--up)" }}
                            onClick={() => setRetry(isRetrying ? null : { id: a.id, password: "", loading: false, error: null })}
                          >
                            {isRetrying ? "Cancel" : "Retry MetaAPI"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn ghost"
                          style={{ height: 30, fontSize: 12, marginRight: 4 }}
                          onClick={() => startEdit(a)}
                        >
                          Edit
                        </button>
                        <LoadingButton
                          variant="ghost"
                          loading={removingId === a.id}
                          loadingText="Removing…"
                          disabled={removingId !== null && removingId !== a.id}
                          style={{ height: 30 }}
                          onClick={() => removeAccount(a.id)}
                        >
                          Remove
                        </LoadingButton>
                      </td>
                    </tr>
                    {isRetrying && (
                      <tr style={{ background: "var(--surface-2)" }}>
                        <td colSpan={7} style={{ padding: "10px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: "var(--ink-2)" }}>
                              Investor password for <strong>{a.login}</strong> on <strong>{a.server}</strong>:
                            </span>
                            <input
                              type="password"
                              className="mono"
                              placeholder="Investor password"
                              value={retry.password}
                              onChange={(e) => setRetry((r) => r && { ...r, password: e.target.value })}
                              style={{ fontSize: 12, padding: "4px 8px", width: 200 }}
                              onKeyDown={(e) => { if (e.key === "Enter") void retryProvision(); }}
                            />
                            <LoadingButton
                              variant="primary"
                              loading={retry.loading}
                              loadingText="Provisioning…"
                              style={{ height: 30, fontSize: 12 }}
                              onClick={retryProvision}
                            >
                              Connect to MetaAPI
                            </LoadingButton>
                            {retry.error && (
                              <span style={{ fontSize: 11, color: "var(--down)", maxWidth: 420 }}>{retry.error}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
          )}
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
