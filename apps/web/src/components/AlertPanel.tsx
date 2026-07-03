import { CheckCircle2, ShieldAlert, TriangleAlert } from "lucide-react";
import type { OfficeAlert } from "@altf4/shared";

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-BD", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka"
  });
}

export function AlertPanel({ alerts }: { alerts: OfficeAlert[] }) {
  return (
    <section className="side-card alert-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ATTENTION NEEDED</span>
          <h2>Active alerts</h2>
        </div>
        <span className={`count-badge ${alerts.length ? "has-alerts" : ""}`}>{alerts.length}</span>
      </div>

      <div className="alert-list">
        {alerts.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={32} />
            <strong>Everything looks efficient</strong>
            <p>No unusual energy usage detected.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <article className={`alert-item alert-item--${alert.severity}`} key={alert.id}>
              <span className="alert-item__icon">
                {alert.severity === "critical" ? <ShieldAlert size={20} /> : <TriangleAlert size={20} />}
              </span>
              <div>
                <div className="alert-item__top">
                  <strong>{alert.title}</strong>
                  <time>{formatTime(alert.triggeredAt)}</time>
                </div>
                <p>{alert.message}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

