"use client";

import Link from "next/link";
import { useState } from "react";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app" style={{ display: "flex", minHeight: "100vh" }}>
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      <aside
        className={`sidebar${sidebarOpen ? " sidebar--open" : ""}`}
        style={{ width: 248, flexShrink: 0, paddingTop: 16 }}
      >
        <div className="sidebar-brand">
          <Link href="/admin" style={{ textDecoration: "none", color: "inherit" }} onClick={() => setSidebarOpen(false)}>
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
        <Link href="/admin/users" className="nav-item" style={{ textDecoration: "none", color: "inherit" }} onClick={() => setSidebarOpen(false)}>
          <span>Users</span>
        </Link>
        <Link href="/admin/accounts" className="nav-item" style={{ textDecoration: "none", color: "inherit" }} onClick={() => setSidebarOpen(false)}>
          <span>Link accounts</span>
        </Link>

        <div className="nav-section">Portal</div>
        <Link href="/" className="nav-item" style={{ textDecoration: "none", color: "inherit" }}>
          <span>← Client portal</span>
        </Link>
      </aside>

      <div className="main" style={{ flex: 1, minWidth: 0 }}>
        <header className="topbar">
          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="4.5" x2="16" y2="4.5" />
              <line x1="2" y1="9" x2="16" y2="9" />
              <line x1="2" y1="13.5" x2="16" y2="13.5" />
            </svg>
          </button>
          <div className="crumbs">
            <span>Admin</span>
          </div>
          <div className="topbar-actions">
            <Link href="/" className="btn ghost" style={{ fontSize: 12, height: 30 }}>
              ← Portal
            </Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
