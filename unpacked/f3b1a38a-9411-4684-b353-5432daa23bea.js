/* Equity curve chart — minimalist SVG */
/* global React, fmt */

const { useState: useStateChart, useRef: useRefChart, useMemo: useMemoChart } = React;

function EquityChart({ data, height = 320, accent = 'var(--accent)', showAxis = true }) {
  const [hover, setHover] = useStateChart(null);
  const wrapRef = useRefChart(null);
  const pad = { t: 20, r: 20, b: showAxis ? 28 : 12, l: showAxis ? 58 : 12 };
  const [w, setW] = useStateChart(800);

  React.useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(e => {
      for (const ent of e) setW(Math.floor(ent.contentRect.width));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const { path, area, ticks, xTicks, min, max } = useMemoChart(() => {
    if (!data || data.length < 2) return { path: '', area: '', ticks: [], xTicks: [], min: 0, max: 0 };
    const ys = data.map(d => d.eq);
    let mn = Math.min(...ys), mx = Math.max(...ys);
    const range = mx - mn || 1;
    mn -= range * 0.08; mx += range * 0.08;
    const iw = w - pad.l - pad.r;
    const ih = height - pad.t - pad.b;
    const xs = (i) => pad.l + (i / (data.length - 1)) * iw;
    const ys2 = (v) => pad.t + (1 - (v - mn) / (mx - mn)) * ih;
    let p = '', a = '';
    data.forEach((d, i) => {
      const x = xs(i), y = ys2(d.eq);
      p += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2) + ' ';
    });
    a = p + `L${xs(data.length - 1).toFixed(2)} ${(pad.t + ih).toFixed(2)} L${xs(0).toFixed(2)} ${(pad.t + ih).toFixed(2)} Z`;

    // y ticks — 4
    const ticks = [];
    for (let i = 0; i <= 4; i++) {
      const v = mn + (mx - mn) * (i / 4);
      ticks.push({ v, y: ys2(v) });
    }
    // x ticks — 5 evenly spaced
    const xTicks = [];
    const n = Math.min(5, data.length);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor((data.length - 1) * (i / (n - 1)));
      xTicks.push({ t: data[idx].t, x: xs(idx) });
    }
    return { path: p, area: a, ticks, xTicks, min: mn, max: mx };
  }, [data, w, height]);

  function onMove(e) {
    if (!data?.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const iw = w - pad.l - pad.r;
    const rel = (x - pad.l) / iw;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1))));
    const ih = height - pad.t - pad.b;
    const yPos = pad.t + (1 - (data[idx].eq - min) / (max - min)) * ih;
    const xPos = pad.l + (idx / (data.length - 1)) * iw;
    setHover({ idx, x: xPos, y: yPos });
  }

  const first = data[0]?.eq || 0;
  const last = data[data.length - 1]?.eq || 0;
  const up = last >= first;
  const stroke = up ? 'var(--up)' : 'var(--down)';
  const fill = up ? 'var(--up-soft)' : 'var(--down-soft)';

  return (
    <div className="equity-wrap" ref={wrapRef} style={{ height, position: 'relative' }}
         onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg width={w} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="eq-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={up ? 'var(--up)' : 'var(--down)'} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={up ? 'var(--up)' : 'var(--down)'} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {showAxis && ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={t.y} y2={t.y} stroke="var(--rule)" strokeWidth="1" strokeDasharray={i === ticks.length - 1 ? 'none' : '2 3'}/>
            <text x={pad.l - 10} y={t.y + 3.5} textAnchor="end"
                  style={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--ink-3)', letterSpacing: '0.02em' }}>
              {(t.v / 1000).toFixed(0)}k
            </text>
          </g>
        ))}
        {showAxis && xTicks.map((t, i) => (
          <text key={i} x={t.x} y={height - 10} textAnchor="middle"
                style={{ fontFamily: 'var(--mono)', fontSize: 10, fill: 'var(--ink-3)', letterSpacing: '0.04em' }}>
            {fmt.dateShort(t.t)}
          </text>
        ))}
        <path d={area} fill="url(#eq-area)"/>
        <path d={path} fill="none" stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 6px ' + (up ? 'rgba(61,214,140,0.22)' : 'rgba(240,106,106,0.22)') + ')' }}/>
        {hover && (
          <g>
            <line x1={hover.x} x2={hover.x} y1={pad.t} y2={height - pad.b} stroke="var(--ink-3)" strokeDasharray="2 2" strokeWidth="1"/>
            <circle cx={hover.x} cy={hover.y} r="4" fill="var(--bg)" stroke={stroke} strokeWidth="1.5"/>
          </g>
        )}
      </svg>
      {hover && data[hover.idx] && (
        <div className="equity-hover" style={{
          left: Math.min(hover.x + 12, w - 160),
          top: Math.max(hover.y - 40, 0),
        }}>
          <div className="h-d">{fmt.dateShort(data[hover.idx].t)}</div>
          <div className="h-v">${data[hover.idx].eq.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
        </div>
      )}
    </div>
  );
}

function Sparkline({ data, width = 140, height = 36, positive }) {
  if (!data || data.length < 2) return null;
  const ys = data.map(d => d.eq);
  const mn = Math.min(...ys), mx = Math.max(...ys);
  const rng = mx - mn || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - 2 - ((d.eq - mn) / rng) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const up = data[data.length - 1].eq >= data[0].eq;
  const color = positive !== undefined ? (positive ? 'var(--up)' : 'var(--down)') : (up ? 'var(--up)' : 'var(--down)');
  return (
    <svg width={width} height={height} className="account-sparkline">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

Object.assign(window, { EquityChart, Sparkline });
