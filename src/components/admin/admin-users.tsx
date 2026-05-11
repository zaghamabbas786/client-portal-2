"use client";



import React, { useCallback, useEffect, useState } from "react";

import { normalizeStoredRole, type PortalRole } from "@/lib/auth/roles";

import { LoadingButton, PageLoader } from "@/components/portal/primitives";



type Row = {

  id: string;

  email: string | undefined;

  created_at: string | undefined;

  profile: {

    id: string;

    full_name: string | null;

    role: string;

  } | null;

};



export function AdminUsers() {

  const [rows, setRows] = useState<Row[]>([]);

  const [msg, setMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);

  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);



  const load = useCallback(async () => {

    setLoading(true);

    const res = await fetch("/api/admin/users");

    const j = await res.json();

    if (!res.ok) setMsg(j.error || "Failed to load users");

    else {

      setMsg(null);

      setRows(j.users ?? []);

    }

    setLoading(false);

  }, []);



  useEffect(() => {

    void load();

  }, [load]);



  async function createUser(e: React.FormEvent<HTMLFormElement>) {

    e.preventDefault();

    if (creating) return;

    const form = e.currentTarget;

    const fd = new FormData(form);

    const email = String(fd.get("email") || "");

    const password = String(fd.get("password") || "");

    const full_name = String(fd.get("full_name") || "");

    const role = fd.get("role") === "admin" ? "admin" : "standard";

    setCreating(true);

    try {

      const res = await fetch("/api/admin/users", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ email, password, full_name, role }),

      });

      const j = await res.json();

      if (!res.ok) {

        setMsg(j.error || "Create failed");

        return;

      }

      form.reset();

      setMsg("User created.");

      await load();

    } finally {

      setCreating(false);

    }

  }



  async function setRole(id: string, role: PortalRole) {

    if (pendingRoleId) return;

    setPendingRoleId(id);

    try {

      const res = await fetch(`/api/admin/users/${id}`, {

        method: "PATCH",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ role }),

      });

      const j = await res.json();

      if (!res.ok) setMsg(j.error || "Update failed");

      else {

        setMsg("Role updated.");

        await load();

      }

    } finally {

      setPendingRoleId(null);

    }

  }



  async function removeUser(id: string) {

    if (pendingDeleteId) return;

    if (!confirm("Delete this user and their linked account rows?")) return;

    setPendingDeleteId(id);

    try {

      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });

      const j = await res.json();

      if (!res.ok) setMsg(j.error || "Delete failed");

      else {

        setMsg("User removed.");

        await load();

      }

    } finally {

      setPendingDeleteId(null);

    }

  }



  return (

    <div className="page">

      <div className="page-head">

        <div>

          <div className="eyebrow" style={{ marginBottom: 8 }}>

            Access control

          </div>

          <h1 className="page-title">Users</h1>

          <div className="page-sub">

            Create portal logins, assign Administrator or Standard access, and

            remove accounts. Only admins see this console.

          </div>

        </div>

      </div>



      <div className="panel" style={{ marginBottom: 24 }}>

        <div className="panel-head">

          <h3 className="panel-title">New user</h3>

        </div>

        <div className="panel-body">

          {msg && (

            <div style={{ fontSize: 13, marginBottom: 12, color: "var(--ink-2)" }}>

              {msg}

            </div>

          )}

          <form

            onSubmit={createUser}

            style={{ display: "grid", gap: 14, maxWidth: 480 }}

          >

            <div className="field">

              <label>Email</label>

              <input name="email" type="email" required autoComplete="off" />

            </div>

            <div className="field">

              <label>Temporary password</label>

              <input

                name="password"

                type="password"

                required

                minLength={6}

                autoComplete="new-password"

              />

            </div>

            <div className="field">

              <label>Display name</label>

              <input name="full_name" type="text" placeholder="Optional" />

            </div>

            <div className="field">

              <label>Role</label>

              <select name="role" defaultValue="standard">

                <option value="standard">Standard</option>

                <option value="admin">Administrator</option>

              </select>

            </div>

            <LoadingButton

              type="submit"

              variant="primary"

              loading={creating}

              loadingText="Creating…"

            >

              Create user

            </LoadingButton>

          </form>

        </div>

      </div>



      <div className="panel">

        <div className="panel-head">

          <h3 className="panel-title">All users</h3>

        </div>

        <div className="panel-body flush">

          {loading ? (

            <PageLoader inline label="Loading users" />

          ) : (

            <table className="tbl">

              <thead>

                <tr>

                  <th>Email</th>

                  <th>Name</th>

                  <th>Role</th>

                  <th className="num">Actions</th>

                </tr>

              </thead>

              <tbody>

                {rows.map((u) => (

                  <tr key={u.id}>

                    <td className="mono" style={{ fontSize: 12.5 }}>

                      {u.email}

                    </td>

                    <td>{u.profile?.full_name || "—"}</td>

                    <td>

                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>

                        <select

                          value={normalizeStoredRole(u.profile?.role ?? "standard")}

                          disabled={pendingRoleId === u.id}

                          onChange={(e) =>

                            setRole(u.id, e.target.value as PortalRole)

                          }

                          style={{

                            fontFamily: "var(--mono)",

                            fontSize: 12,

                            padding: "6px 8px",

                          }}

                        >

                          <option value="standard">Standard</option>

                          <option value="admin">Administrator</option>

                        </select>

                        {pendingRoleId === u.id && <span className="spinner spinner--sm" aria-label="Updating role" />}

                      </div>

                    </td>

                    <td className="num">

                      <LoadingButton

                        variant="ghost"

                        loading={pendingDeleteId === u.id}

                        loadingText="Removing…"

                        style={{ height: 30 }}

                        onClick={() => removeUser(u.id)}

                      >

                        Remove

                      </LoadingButton>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

      </div>

    </div>

  );

}


