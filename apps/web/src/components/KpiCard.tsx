import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  meta: string;
  tone?: "mint" | "amber" | "violet" | "blue";
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  meta,
  tone = "mint"
}: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__top">
        <span className="kpi-card__icon">
          <Icon size={18} strokeWidth={2.2} />
        </span>
        <span className="kpi-card__label">{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{meta}</p>
    </article>
  );
}

