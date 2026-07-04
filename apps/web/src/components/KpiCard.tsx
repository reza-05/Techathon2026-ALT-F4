import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  meta: string;
  tone?: "mint" | "amber" | "violet" | "blue";
  trend?: string;
  sparkPath?: string;
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  meta,
  tone = "mint",
  trend,
  sparkPath = "M 0 10 Q 12 2, 24 12 T 48 6"
}: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__top">
        <div className="kpi-card__top-left">
          <span className="kpi-card__icon">
            <Icon size={14} strokeWidth={2.2} />
          </span>
          <span className="kpi-card__label">{label}</span>
        </div>
        {trend && (
          <span className="kpi-card__trend">
            {trend}
          </span>
        )}
      </div>
      <strong>{value}</strong>
      <div className="kpi-card__bottom">
        <p>{meta}</p>
        <svg width="48" height="14" viewBox="0 0 48 14" className="kpi-card__spark">
          <path
            d={sparkPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </article>
  );
}
