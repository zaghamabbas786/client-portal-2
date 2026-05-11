import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { HistoryRow, PortalAccount, PositionRow } from "@/lib/portal-data";
import { sampleCurve } from "@/lib/equity-curve-sample";

export { sampleCurve };

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:-]/g, "").replace("T", "-");
}

function csvEscape(cell: string | number): string {
  const s = cell === null || cell === undefined ? "" : String(cell);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsvLines(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

export function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadTradeHistoryCsv(rows: HistoryRow[]) {
  const csvRows: (string | number)[][] = [
    [
      "Ticket",
      "Symbol",
      "Side",
      "Lots",
      "Open price",
      "Close price",
      "Open (ISO UTC)",
      "Close (ISO UTC)",
      "Commission",
      "Net P&L",
    ],
    ...rows.map((h) => [
      h.id,
      h.symbol,
      h.side,
      h.lots.toFixed(2),
      h.openPrice,
      h.closePrice,
      new Date(h.openTime).toISOString(),
      new Date(h.closeTime).toISOString(),
      h.commission.toFixed(2),
      h.net.toFixed(2),
    ]),
  ];
  const blob = new Blob([`\uFEFF${buildCsvLines(csvRows)}`], {
    type: "text/csv;charset=utf-8",
  });
  triggerDownload(`trade-history-${stamp()}.csv`, blob);
}

export function downloadTradeHistoryPdf(rows: HistoryRow[], subtitle: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.text("Vivid Capital · Trade history", 14, 16);
  doc.setFontSize(9);
  const subLines = doc.splitTextToSize(subtitle, 260);
  doc.text(subLines, 14, 22);
  const startY = 22 + subLines.length * 4.5;
  autoTable(doc, {
    startY,
    head: [
      [
        "Ticket",
        "Symbol",
        "Side",
        "Lots",
        "Open",
        "Close",
        "Closed UTC",
        "Comm.",
        "Net",
      ],
    ],
    body:
      rows.length === 0
        ? [
            [
              "—",
              "No rows",
              "—",
              "—",
              "—",
              "—",
              "—",
              "—",
              "—",
            ],
          ]
        : rows.map((h) => [
            String(h.id),
            h.symbol,
            h.side,
            h.lots.toFixed(2),
            String(h.openPrice),
            String(h.closePrice),
            new Date(h.closeTime).toISOString().slice(0, 16).replace("T", " "),
            h.commission.toFixed(2),
            h.net.toFixed(2),
          ]),
    styles: { fontSize: 7, cellPadding: 1.2 },
    headStyles: { fillColor: [42, 44, 51], textColor: 255 },
    margin: { left: 14, right: 14 },
  });
  doc.save(`trade-history-${stamp()}.pdf`);
}

export function downloadDashboardCsv(opts: {
  dataUpdatedAt: number;
  rangeLabel: string;
  scopeLabel: string;
  summaryRows: [string, string][];
  curve: readonly { t: number; eq: number }[];
  positions: PositionRow[];
  accounts: PortalAccount[];
}) {
  const row: (string | number)[][] = [];
  row.push(["Dashboard export"]);
  row.push(["Portal snapshot (local)", new Date(opts.dataUpdatedAt).toISOString()]);
  row.push(["Equity curve range", opts.rangeLabel]);
  row.push(["Account scope", opts.scopeLabel]);
  row.push([]);
  row.push(["Summary"]);
  row.push(["Metric", "Value"]);
  for (const [k, v] of opts.summaryRows) row.push([k, v]);
  row.push([]);
  row.push(["Equity curve"]);
  row.push(["Timestamp (ISO UTC)", "Equity USD"]);
  for (const pt of opts.curve) {
    row.push([new Date(pt.t).toISOString(), pt.eq.toFixed(2)]);
  }
  row.push([]);
  row.push(["Open positions"]);
  row.push(["Symbol", "Side", "Lots", "Open price", "Current price", "Swap", "P&L"]);
  for (const p of opts.positions) {
    row.push([
      p.symbol,
      p.side,
      p.lots.toFixed(2),
      p.openPrice,
      p.currentPrice,
      p.swap.toFixed(2),
      p.pl.toFixed(2),
    ]);
  }
  row.push([]);
  row.push(["Connected accounts"]);
  row.push(["Label", "Platform", "Broker", "Login", "Status", "Equity", "Deposit", "Currency"]);
  for (const a of opts.accounts) {
    row.push([
      a.label,
      a.platform,
      a.broker,
      a.login,
      a.status,
      a.equity.toFixed(2),
      a.deposit.toFixed(2),
      a.currency,
    ]);
  }
  const blob = new Blob([`\uFEFF${buildCsvLines(row)}`], {
    type: "text/csv;charset=utf-8",
  });
  triggerDownload(`dashboard-${stamp()}.csv`, blob);
}

function pdfFinalY(doc: jsPDF): number {
  type DocTbl = jsPDF & { lastAutoTable?: { finalY: number } };
  const y = (doc as DocTbl).lastAutoTable?.finalY;
  return typeof y === "number" ? y : 40;
}

export function downloadDashboardPdf(opts: {
  dataUpdatedAt: number;
  rangeLabel: string;
  scopeLabel: string;
  summaryRows: [string, string][];
  curveSample: readonly { t: number; eq: number }[];
  positions: PositionRow[];
  accounts: PortalAccount[];
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFontSize(15);
  doc.text("Vivid Capital · Dashboard", 14, 18);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Snapshot: ${new Date(opts.dataUpdatedAt).toLocaleString("en-GB")}`, 14, 25);
  doc.text(`Range: ${opts.rangeLabel} · Scope: ${opts.scopeLabel}`, 14, 30);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 36,
    head: [["Metric", "Value"]],
    body: opts.summaryRows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [42, 44, 51] },
    margin: { left: 14, right: 14 },
  });

  let nextY = pdfFinalY(doc) + 10;
  doc.setFontSize(10);
  doc.text("Equity curve (sampled points)", 14, nextY);
  nextY += 4;

  autoTable(doc, {
    startY: nextY,
    head: [["UTC", "Equity USD"]],
    body:
      opts.curveSample.length === 0
        ? [["—", "No curve data"]]
        : opts.curveSample.map((p) => [
            new Date(p.t).toISOString().slice(0, 16).replace("T", " "),
            p.eq.toFixed(2),
          ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [42, 44, 51] },
    margin: { left: 14, right: 14 },
  });

  nextY = pdfFinalY(doc) + 10;
  doc.text("Open positions", 14, nextY);
  nextY += 4;

  autoTable(doc, {
    startY: nextY,
    head: [["Symbol", "Side", "Lots", "Open", "Current", "P&L"]],
    body:
      opts.positions.length === 0
        ? [["—", "—", "—", "—", "—", "No open positions"]]
        : opts.positions.map((p) => [
            p.symbol,
            p.side,
            p.lots.toFixed(2),
            String(p.openPrice),
            String(p.currentPrice),
            p.pl.toFixed(2),
          ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [42, 44, 51] },
    margin: { left: 14, right: 14 },
  });

  nextY = pdfFinalY(doc) + 10;
  doc.text("Connected accounts", 14, nextY);
  nextY += 4;

  autoTable(doc, {
    startY: nextY,
    head: [["Label", "Platform", "Broker", "Login", "Status", "Equity"]],
    body: opts.accounts.map((a) => [
      a.label.slice(0, 28),
      a.platform,
      a.broker.slice(0, 18),
      a.login,
      a.status,
      a.status === "live" ? a.equity.toFixed(2) : "—",
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [42, 44, 51] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`dashboard-${stamp()}.pdf`);
}
