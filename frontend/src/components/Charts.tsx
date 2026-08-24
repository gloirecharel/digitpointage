import { useEffect, useState } from 'react';

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ data, size = 180, thickness = 28 }: { data: DonutSlice[]; size?: number; thickness?: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  let offset = 0;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
        </svg>
        <p className="mt-2 text-xs text-slate-400">Aucune donnee</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {data.map((slice, i) => {
            const fraction = slice.value / total;
            const dash = animated ? fraction * circumference : 0;
            const seg = (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                style={{ transition: `stroke-dasharray 0.8s ease ${i * 0.15}s` }}
              />
            );
            offset += fraction * circumference;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-800">{total}</span>
          <span className="text-xs text-slate-400">Total</span>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {data.map((slice, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ background: slice.color }} />
            <span className="text-slate-600">{slice.label}</span>
            <span className="font-semibold text-slate-800">{slice.value}</span>
            <span className="text-xs text-slate-400">({total > 0 ? Math.round((slice.value / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BarItem {
  label: string;
  value: number;
  color?: string;
}

export function BarChart({ data, height = 200, formatValue }: { data: BarItem[]; height?: number; formatValue?: (n: number) => string }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = 100 / Math.max(data.length, 1);

  return (
    <div className="w-full">
      <div className="flex items-end justify-around gap-2" style={{ height }}>
        {data.map((item, i) => {
          const h = animated ? (item.value / maxVal) * (height - 40) : 0;
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end" style={{ width: `${barWidth}%` }}>
              <span className="mb-1 text-xs font-semibold text-slate-700">
                {formatValue ? formatValue(item.value) : item.value}
              </span>
              <div
                className="w-full max-w-[48px] rounded-t-lg transition-all duration-700 ease-out"
                style={{
                  height: `${h}px`,
                  background: item.color || 'linear-gradient(to top, #3b82f6, #60a5fa)',
                  transitionDelay: `${i * 100}ms`,
                }}
              />
              <span className="mt-2 truncate text-center text-[10px] text-slate-500">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface LinePoint {
  label: string;
  value: number;
}

export function LineChart({ data, height = 200, color = '#3b82f6', formatValue }: { data: LinePoint[]; height?: number; color?: string; formatValue?: (n: number) => string }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, [data.length]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
        Aucune donnee
      </div>
    );
  }

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map(d => d.value);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (chartW / Math.max(data.length - 1, 1)) * i;
    const y = padding.top + chartH - ((d.value - minVal) / range) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => padding.top + chartH * f);
  const gridValues = gridLines.map(y => minVal + (1 - (y - padding.top) / chartH) * range);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 300 }}>
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {gridLines.map((y, i) => (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
              {formatValue ? formatValue(gridValues[i]) : Math.round(gridValues[i])}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#lineGradient)" style={{ opacity: animated ? 1 : 0, transition: 'opacity 0.8s ease' }} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 2000,
            strokeDashoffset: animated ? 0 : 2000,
            transition: 'stroke-dashoffset 1.2s ease',
          }}
        />

        {points.map((p, i) => (
          <g key={i} style={{ opacity: animated ? 1 : 0, transition: `opacity 0.3s ease ${0.3 + i * 0.08}s` }}>
            <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2.5" />
            <text x={p.x} y={height - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
