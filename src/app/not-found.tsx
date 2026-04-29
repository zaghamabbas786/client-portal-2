import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "var(--sans, system-ui, sans-serif)",
        color: "var(--ink, #e7ecf4)",
        background: "var(--bg, #0a0e15)",
      }}
    >
      <h1 style={{ fontSize: "1.25rem" }}>Page not found</h1>
      <Link href="/" style={{ color: "var(--accent, #3b82f6)" }}>
        Back to portal
      </Link>
    </div>
  );
}
