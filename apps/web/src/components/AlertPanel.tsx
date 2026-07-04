import { CheckCircle2, TriangleAlert } from "lucide-react";
import { getRoomDefinition, type OfficeAlert } from "@altf4/shared";

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-BD", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Dhaka"
  });
}

export function AlertPanel({ alerts }: { alerts: OfficeAlert[] }) {
  return (
    <aside className="alerts-sidebar">
      <div className="alerts-sidebar__header">
        <span className="section-kicker">Active Alerts</span>
        <h2>Monitoring panel</h2>
      </div>

      {alerts.length === 0 ? (
        <div className="alerts-empty">
          <CheckCircle2 size={28} />
          <strong>No active alerts</strong>
          <p>All rooms are currently within expected usage.</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map((alert) => (
            <article key={alert.id} className="alert-row">
              <span className="alert-row__icon">
                <TriangleAlert size={18} />
              </span>
              <div>
                <div className="alert-row__top">
                  <strong>{alert.title}</strong>
                  <time>{formatTime(alert.triggeredAt)}</time>
                </div>
                <small>{getRoomDefinition(alert.roomId).name}</small>
                <p>{alert.message}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}
