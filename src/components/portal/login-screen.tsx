import React, { useState } from "react";
import { BrandMark } from "./primitives";

export function LoginScreen({
  onSignIn,
  theme: _theme,
  setTheme: _setTheme,
}: {
  onSignIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  theme: string;
  setTheme: (t: string) => void;
}) {
  void _theme;
  void _setTheme;
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="login-wrap">
      <aside className="login-aside">
        <div className="login-aside-brand">
          <BrandMark size={40} />
          <div
            className="mono"
            style={{
              fontSize: 9.5,
              letterSpacing: "0.18em",
              color: "var(--ink-3)",
              textTransform: "uppercase",
            }}
          >
            Client Portal
          </div>
        </div>

        <div style={{ marginTop: 80, position: "relative" }}>
          <h1 className="login-headline">
            Your capital, <em>observed</em> — not narrated.
          </h1>
          <p
            style={{
              fontSize: 14.5,
              color: "var(--ink-2)",
              maxWidth: "40ch",
              marginTop: 20,
              lineHeight: 1.6,
            }}
          >
            Your administrator connects broker accounts to this portal; you
            view balances, equity, positions, and P&amp;L on refresh.
          </p>
        </div>

        <div className="login-aside-foot">
          <div
            className="mono"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.14em",
              color: "var(--ink-4)",
              textTransform: "uppercase",
            }}
          >
            © 2026 Vivid Capital Portal LLC
          </div>
        </div>
      </aside>

      <main className="login-main">
        <div className="login-form-wrap">
          <div>
            <h2>Sign in to the portal</h2>
            <div className="sub">
              Welcome back. Enter your credentials to continue.
            </div>
          </div>
          <form
            className="login-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              setBusy(true);
              const { error } = await onSignIn(email, pw);
              setBusy(false);
              if (error) setErr(error);
            }}
          >
            {err && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--down)",
                  marginBottom: 8,
                }}
              >
                {err}
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Password</span>
                <a
                  href="#"
                  style={{
                    color: "var(--ink-3)",
                    textTransform: "none",
                    letterSpacing: "normal",
                    fontFamily: "var(--sans)",
                    fontSize: 11.5,
                  }}
                >
                  Forgot?
                </a>
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn primary"
              style={{ height: 40, marginTop: 4, justifyContent: "center" }}
              disabled={busy}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="login-meta">
            <span>Secured by TLS</span>
            <span>
              <a href="#">Need help?</a>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
