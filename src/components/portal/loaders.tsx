import React from "react";

/** Inline circular spinner. Size variants `sm` / `md` / `lg`.
 *  No client hooks here so server components (route-level loading.tsx)
 *  can import it directly. */
export function Spinner({
  size = "md",
  inverse = false,
  className = "",
  label,
}: {
  size?: "sm" | "md" | "lg";
  inverse?: boolean;
  className?: string;
  label?: string;
}) {
  const sizeClass =
    size === "sm" ? "spinner--sm" : size === "lg" ? "spinner--lg" : "";
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label ?? "Loading"}
      className={`spinner ${sizeClass} ${inverse ? "spinner--inverse" : ""} ${className}`.trim()}
    />
  );
}

/** Full-height (or inline) loading screen with an optional caption. */
export function PageLoader({
  label = "Loading",
  inline = false,
}: {
  label?: string;
  inline?: boolean;
}) {
  return (
    <div className={`page-loader ${inline ? "page-loader--inline" : ""}`.trim()}>
      <Spinner size="lg" />
      {label && <span className="page-loader__label">{label}</span>}
    </div>
  );
}
