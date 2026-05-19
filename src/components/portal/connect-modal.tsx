import React, { useEffect, useRef, useState } from "react";
import { Ic, LoadingButton, Spinner } from "./primitives";

type Suggestion = { broker: string; server: string };

export function ConnectModal({
  onClose,
  clientUsers,
  defaultUserId,
}: {
  onClose: () => void;
  clientUsers?: { id: string; email: string }[];
  defaultUserId?: string;
}) {
  const [platform, setPlatform] = useState("MT5");
  const [userId, setUserId] = useState(
    () => defaultUserId || clientUsers?.[0]?.id || "",
  );
  const [step, setStep] = useState<"form" | "connecting" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ server: "", login: "", password: "", label: "" });
  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  // Server autocomplete
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (form.server.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/mt-servers?q=${encodeURIComponent(form.server)}&platform=${platform}`,
        );
        const j = (await res.json()) as { suggestions?: Suggestion[] };
        setSuggestions(j.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.server, platform]);

  function pickSuggestion(s: Suggestion) {
    setForm((f) => ({ ...f, server: s.server }));
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (clientUsers?.length && !userId) return;
    setError(null);
    setStep("connecting");
    const isAdmin = !!clientUsers?.length;
    void (async () => {
      if (isAdmin) {
        const res = await fetch("/api/admin/trading-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            platform,
            server: form.server,
            login: form.login,
            password: form.password,
            label: form.label,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStep("form");
          setError(j.error || "Failed to link account. Check credentials and try again.");
          return;
        }
      } else {
        await new Promise((r) => setTimeout(r, 1600));
      }
      setStep("done");
    })();
  }

  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
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
                  <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
                    {clientUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="platform-toggle">
                <button type="button" className={platform === "MT4" ? "active" : ""} onClick={() => setPlatform("MT4")}>
                  MetaTrader 4
                </button>
                <button type="button" className={platform === "MT5" ? "active" : ""} onClick={() => setPlatform("MT5")}>
                  MetaTrader 5
                </button>
              </div>

              {/* Server with autocomplete */}
              <div className="field" style={{ position: "relative" }}>
                <label>Server</label>
                <input
                  className="mono"
                  placeholder="e.g. FTMO-Demo, ICMarkets-Live05"
                  value={form.server}
                  onChange={set("server")}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                  autoComplete="off"
                  required
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    borderRadius: 6, marginTop: 2, maxHeight: 180, overflowY: "auto",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                  }}>
                    {suggestions.map((s) => (
                      <button
                        key={s.server}
                        type="button"
                        onMouseDown={() => pickSuggestion(s)}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "8px 12px", background: "none", border: "none",
                          cursor: "pointer", borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <span className="mono" style={{ fontSize: 12 }}>{s.server}</span>
                        {s.broker && (
                          <span style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: 8 }}>
                            {s.broker}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
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

              {error && (
                <div style={{
                  background: "var(--down-soft, rgba(239,68,68,0.1))",
                  border: "1px solid var(--down)",
                  borderRadius: 6, padding: "10px 14px",
                  color: "var(--down)", fontSize: 13,
                }}>
                  {error}
                </div>
              )}

              <div className="sec-note">
                <span className="ico"><Ic.shield /></span>
                <span>
                  Use your <strong>investor (read-only) password</strong>. This
                  grants viewing rights only — no trades can be placed,
                  deposits moved, or settings changed from this portal.
                </span>
              </div>
            </div>
            <div className="modal-foot">
              <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                TLS 1.3 · AES-256 at rest
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
                <LoadingButton type="submit" variant="primary" loading={false}>
                  Connect account
                </LoadingButton>
              </div>
            </div>
          </form>
        )}

        {step === "connecting" && (
          <div className="modal-body" style={{ alignItems: "center", textAlign: "center", padding: "56px 24px" }}>
            <div style={{ margin: "0 auto 20px", display: "flex", justifyContent: "center" }}>
              <Spinner size="lg" />
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 19, marginBottom: 6 }}>
              Establishing secure tunnel
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", maxWidth: 36 * 7, margin: "0 auto" }}>
              Authenticating with {form.server || "broker"}… This usually takes
              under a minute.
            </div>
          </div>
        )}

        {step === "done" && (
          <>
            <div className="modal-body" style={{ alignItems: "center", textAlign: "center", padding: "48px 24px 32px" }}>
              <div style={{
                width: 42, height: 42, borderRadius: "50%",
                background: "var(--up-soft)", color: "var(--up)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <Ic.check />
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 19, marginBottom: 6 }}>
                Account connected
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-3)", maxWidth: 40 * 7, margin: "0 auto" }}>
                {platform} · {form.server} · #{form.login} is now syncing.
                Positions and equity will appear in a few seconds.
              </div>
            </div>
            <div className="modal-foot" style={{ justifyContent: "flex-end" }}>
              <button type="button" className="btn primary" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
