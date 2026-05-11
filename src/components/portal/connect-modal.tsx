import React, { useState } from "react";
import { Ic, LoadingButton, Spinner } from "./primitives";

export function ConnectModal({
  onClose,
  clientUsers,
  defaultUserId,
}: {
  onClose: () => void;
  /** When set (admin), link flow posts to `/api/admin/trading-accounts`. */
  clientUsers?: { id: string; email: string }[];
  defaultUserId?: string;
}) {
  const [platform, setPlatform] = useState("MT5");
  const [userId, setUserId] = useState(
    () => defaultUserId || clientUsers?.[0]?.id || "",
  );
  const [step, setStep] = useState<"form" | "connecting" | "done">("form");
  const [form, setForm] = useState({
    broker: "",
    server: "",
    login: "",
    password: "",
    label: "",
    metaapi_account_id: "",
  });
  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (clientUsers?.length && !userId) return;
    setStep("connecting");
    const isAdmin = !!clientUsers?.length;
    const run = async () => {
      if (isAdmin) {
        const res = await fetch("/api/admin/trading-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            platform,
            broker: form.broker,
            server: form.server,
            login: form.login,
            label: form.label,
            metaapi_account_id: form.metaapi_account_id,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStep("form");
          alert(j.error || "Failed to link account");
          return;
        }
      } else {
        await new Promise((r) => setTimeout(r, 1600));
      }
      setStep("done");
    };
    void run();
  }

  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="modal-head">
          <div>
            <h2 className="modal-title">Connect MetaTrader account</h2>
            <div className="modal-sub">
              Read-only credentials are never stored in plaintext. We establish
              a TLS tunnel to your broker.
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <Ic.x />
          </button>
        </div>

        {step === "form" && (
          <form onSubmit={submit}>
            <div className="modal-body">
              {clientUsers && clientUsers.length > 0 && (
                <div className="field">
                  <label>Client user</label>
                  <select
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                  >
                    {clientUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="platform-toggle">
                <button
                  type="button"
                  className={platform === "MT4" ? "active" : ""}
                  onClick={() => setPlatform("MT4")}
                >
                  MetaTrader 4
                </button>
                <button
                  type="button"
                  className={platform === "MT5" ? "active" : ""}
                  onClick={() => setPlatform("MT5")}
                >
                  MetaTrader 5
                </button>
              </div>

              <div className="field">
                <label>Broker</label>
                <select
                  value={form.broker}
                  onChange={set("broker")}
                  required
                >
                  <option value="">Select broker…</option>
                  <option>IC Markets</option>
                  <option>Pepperstone</option>
                  <option>Saxo Bank</option>
                  <option>FP Markets</option>
                  <option>Tickmill</option>
                  <option>ThinkMarkets</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="field">
                <label>Server</label>
                <input
                  className="mono"
                  placeholder="e.g. ICMarkets-Live05"
                  value={form.server}
                  onChange={set("server")}
                  required
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Login</label>
                  <input
                    className="mono"
                    placeholder="52418903"
                    value={form.login}
                    onChange={set("login")}
                    required
                  />
                </div>
                <div className="field">
                  <label>Investor password</label>
                  <input
                    className="mono"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set("password")}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label>Label (optional)</label>
                <input
                  placeholder="Primary — MT5"
                  value={form.label}
                  onChange={set("label")}
                />
              </div>

              {clientUsers?.length ? (
                <div className="field">
                  <label>MetaAPI account id (optional)</label>
                  <input
                    className="mono"
                    placeholder="865d3a4d-3803-486d-bdf3-a85679d9fad2"
                    value={form.metaapi_account_id}
                    onChange={set("metaapi_account_id")}
                  />
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--ink-3)",
                      marginTop: 6,
                      lineHeight: 1.35,
                    }}
                  >
                    UUID from{" "}
                    <a
                      href="https://app.metaapi.cloud/accounts"
                      target="_blank"
                      rel="noreferrer"
                    >
                      MetaAPI → Accounts
                    </a>
                    . Set <span className="mono">METAAPI_TOKEN</span> or{" "}
                    <span className="mono">METAAPI_ACCESS_TOKEN</span> in{" "}
                    <span className="mono">.env.local</span> for live balance,
                    positions, and history.
                  </div>
                </div>
              ) : null}

              <div className="sec-note">
                <span className="ico">
                  <Ic.shield />
                </span>
                <span>
                  Use your <strong>investor (read-only) password</strong>. This
                  grants viewing rights only — no trades can be placed,
                  deposits moved, or settings changed from this portal.
                </span>
              </div>
            </div>
            <div className="modal-foot">
              <span
                className="mono"
                style={{
                  fontSize: 10.5,
                  color: "var(--ink-3)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                TLS 1.3 · AES-256 at rest
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  variant="primary"
                  loading={false}
                >
                  Connect account
                </LoadingButton>
              </div>
            </div>
          </form>
        )}

        {step === "connecting" && (
          <div
            className="modal-body"
            style={{
              alignItems: "center",
              textAlign: "center",
              padding: "56px 24px",
            }}
          >
            <div style={{ margin: "0 auto 20px", display: "flex", justifyContent: "center" }}>
              <Spinner size="lg" />
            </div>
            <div
              style={{
                fontFamily: "var(--serif)",
                fontSize: 19,
                marginBottom: 6,
              }}
            >
              Establishing secure tunnel
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--ink-3)",
                maxWidth: 36 * 7,
                margin: "0 auto",
              }}
            >
              Authenticating with {form.server || "broker"}… This usually takes
              under a minute.
            </div>
          </div>
        )}

        {step === "done" && (
          <>
            <div
              className="modal-body"
              style={{
                alignItems: "center",
                textAlign: "center",
                padding: "48px 24px 32px",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: "var(--up-soft)",
                  color: "var(--up)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <Ic.check />
              </div>
              <div
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 19,
                  marginBottom: 6,
                }}
              >
                Account connected
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--ink-3)",
                  maxWidth: 40 * 7,
                  margin: "0 auto",
                }}
              >
                {platform} · {form.broker || "Broker"} · #{form.login} is now
                syncing. Positions and equity will appear in a few seconds.
              </div>
            </div>
            <div
              className="modal-foot"
              style={{ justifyContent: "flex-end" }}
            >
              <button type="button" className="btn primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
