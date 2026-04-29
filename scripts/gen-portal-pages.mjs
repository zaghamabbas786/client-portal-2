import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const raw = fs.readFileSync(
  path.join(root, "unpacked/dd30360c-0e55-4dcd-9e79-8c5e68da76cd.js"),
  "utf8",
);

const header = `import React, { useMemo, useState } from "react";
import type { HistoryRow, PortalAccount, PositionRow } from "@/lib/portal-data";
import { PortalData } from "@/lib/portal-data";
import { EquityChart, Sparkline } from "./charts";
import { FlashNum, fmt, Ic } from "./primitives";

`;

let body = raw
  .replace(/^\/\*[\s\S]*?\*\/\s*/, "")
  .replace(
    /const \{ useState: useP, useMemo: useM, useEffect: useE \} = React;\s*/,
    "",
  )
  .replace(/^function /gm, "export function ")
  .replace(/\s*Object\.assign\(window, \{[\s\S]*$/m, "");

const out = `${header}${body.trim()}\n`;
fs.writeFileSync(
  path.join(root, "src/components/portal/portal-pages.tsx"),
  out,
);
console.log("ok", out.length);
