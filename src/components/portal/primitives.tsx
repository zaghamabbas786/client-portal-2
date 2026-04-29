import React, { useEffect, useRef, useState } from "react";

export const Ic = {
  dash: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <rect x="2" y="2" width="5.5" height="6" rx="1" />
      <rect x="8.5" y="2" width="5.5" height="3.5" rx="1" />
      <rect x="2" y="9" width="5.5" height="5" rx="1" />
      <rect x="8.5" y="6.5" width="5.5" height="7.5" rx="1" />
    </svg>
  ),
  accounts: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <rect x="2" y="3.5" width="12" height="9" rx="1.2" />
      <path d="M2 6.5h12" />
      <path d="M4.5 9.5h2M8.5 9.5h3" />
    </svg>
  ),
  positions: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M2 11l3-4 3 2.5 5-6" />
      <path d="M10 3.5h3V6.5" />
    </svg>
  ),
  history: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  ),
  connect: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M6.5 9.5l-2 2a2.12 2.12 0 01-3-3l2-2" />
      <path d="M9.5 6.5l2-2a2.12 2.12 0 013 3l-2 2" />
      <path d="M6 10l4-4" />
    </svg>
  ),
  plus: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  ),
  download: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M8 2v8M4.5 7L8 10.5 11.5 7" />
      <path d="M3 13h10" />
    </svg>
  ),
  search: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5L13.5 13.5" />
    </svg>
  ),
  filter: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M2 3.5h12l-4.5 5.5v4L6.5 11.5V9L2 3.5z" />
    </svg>
  ),
  bell: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M4 7a4 4 0 118 0v2.5l1 2H3l1-2V7z" />
      <path d="M6.5 12.5a1.5 1.5 0 003 0" />
    </svg>
  ),
  gear: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
    </svg>
  ),
  sun: () => (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1" />
    </svg>
  ),
  moon: () => (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M12.5 9.5A5 5 0 016.5 3.5a5 5 0 106 6z" />
    </svg>
  ),
  shield: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M8 1.5L2.5 3.5v4C2.5 11 5 13.5 8 14.5c3-1 5.5-3.5 5.5-7v-4L8 1.5z" />
    </svg>
  ),
  check: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M3 8l3.5 3.5L13 5" />
    </svg>
  ),
  x: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
    </svg>
  ),
  caret: () => (
    <svg
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M2.5 4L5 6.5 7.5 4" />
    </svg>
  ),
  ext: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M6 3H3.5v10h10V10.5M10 3h3v3M13 3L7 9" />
    </svg>
  ),
  refresh: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <path d="M13 3v3h-3" />
      <path d="M13 6A6 6 0 002.5 9" />
      <path d="M3 13v-3h3" />
      <path d="M3 10a6 6 0 0010.5 3" />
    </svg>
  ),
  info: () => (
    <svg
      className="ico"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7v4" />
      <circle cx="8" cy="5" r="0.5" fill="currentColor" />
    </svg>
  ),
};

export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="2"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      <path
        d="M10 13 L20 28 L30 13"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="square"
      />
      <circle cx="20" cy="13" r="1" fill="currentColor" />
    </svg>
  );
}

export const fmt = {
  money(v: number, ccy = "USD", opts: { decimals?: number } = {}) {
    const d = opts.decimals ?? 2;
    const sign = v < 0 ? "−" : "";
    const abs = Math.abs(v);
    const s = abs.toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
    const sym =
      ({ USD: "$", EUR: "€", GBP: "£" } as Record<string, string>)[ccy] || "";
    return sign + sym + s;
  },
  moneySigned(v: number, ccy = "USD") {
    const sign = v > 0 ? "+" : v < 0 ? "−" : "";
    const sym =
      ({ USD: "$", EUR: "€", GBP: "£" } as Record<string, string>)[ccy] || "";
    return (
      sign +
      sym +
      Math.abs(v).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  },
  pct(v: number, d = 2) {
    const sign = v > 0 ? "+" : v < 0 ? "−" : "";
    return sign + Math.abs(v).toFixed(d) + "%";
  },
  num(v: number, d = 2) {
    return v.toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  },
  dateShort(t: number) {
    return new Date(t).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  },
  dateTime(t: number) {
    const d = new Date(t);
    return (
      d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      }) +
      " " +
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    );
  },
  duration(ms: number) {
    const m = Math.floor(ms / 60000);
    if (m < 60) return m + "m";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h " + (m % 60) + "m";
    return Math.floor(h / 24) + "d " + (h % 24) + "h";
  },
};

export function FlashNum({
  value,
  decimals = 2,
  signed = false,
  ccy = null,
  className = "",
}: {
  value: number;
  decimals?: number;
  signed?: boolean;
  ccy?: string | null;
  className?: string;
}) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (prev.current !== value) {
      setFlash(value > prev.current ? "up" : "down");
      prev.current = value;
      const t = setTimeout(() => setFlash(null), 900);
      return () => clearTimeout(t);
    }
  }, [value]);
  let display: string;
  if (ccy)
    display = signed ? fmt.moneySigned(value, ccy) : fmt.money(value, ccy, { decimals });
  else display = (signed && value > 0 ? "+" : "") + fmt.num(value, decimals);
  return (
    <span
      className={`num ${className} ${flash === "up" ? "flash-up-text" : flash === "down" ? "flash-down-text" : ""}`}
    >
      {display}
    </span>
  );
}
