import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  meta: string;
  tone?: "default" | "neutral" | "danger";
  iconColor?: string;
  iconBg?: string;
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  meta,
  tone = "default",
  iconColor,
  iconBg
}: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__header">
        <span className="kpi-card__icon" style={{
          background: iconBg,
          color: iconColor
        }}>
          <Icon size={16} />
        </span>
        <span className="kpi-card__label">{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{meta}</p>
    </article>
  );
}
