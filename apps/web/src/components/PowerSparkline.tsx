import type { PowerPoint } from "@altf4/shared";

interface PowerSparklineProps {
  points: PowerPoint[];
}

export function PowerSparkline({ points }: PowerSparklineProps) {
  const width = 320;
  const height = 80;
  const values = points.length ? points.map((point) => point.watts) : [0];
  const max = Math.max(...values, 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const path = values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 12) - 6;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="sparkline" aria-label="Recent power consumption trend">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#68f7b2" stopOpacity=".28" />
            <stop offset="100%" stopColor="#68f7b2" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill="url(#spark-fill)" />
        <path d={path} fill="none" stroke="#68f7b2" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="sparkline__labels">
        <span>Earlier</span>
        <span>Live</span>
      </div>
    </div>
  );
}

