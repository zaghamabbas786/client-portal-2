/** Shared curve downsampling — no heavy deps so chart pages skip jspdf bundle. */

export function sampleCurve(
  pts: readonly { t: number; eq: number }[],
  maxRows: number,
): { t: number; eq: number }[] {
  if (pts.length <= maxRows) return [...pts];
  const step = Math.ceil(pts.length / maxRows);
  const out: { t: number; eq: number }[] = [];
  for (let i = 0; i < pts.length; i += step) out.push(pts[i]!);
  const last = pts[pts.length - 1];
  const prev = out[out.length - 1];
  if (last && prev && last.t !== prev.t) out.push(last);
  return out.slice(-maxRows);
}
