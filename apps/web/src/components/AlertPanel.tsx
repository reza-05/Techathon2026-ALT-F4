import { CheckCircle2, TriangleAlert, Clock3 } from "lucide-react";
import { getRoomDefinition, type OfficeAlert } from "@altf4/shared";
import { formatRelativeTime, formatAbsoluteTime } from "../utils/date-format";

export function AlertPanel({ alerts, simulatedNow }: { alerts: OfficeAlert[]; simulatedNow: string }) {
  const sortedAlerts = [...alerts].sort(
    (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
  );

  return (
    <aside className={`alerts-sidebar ${sortedAlerts.length > 0 ? "alerts-sidebar--active" : ""}`}>
      <div className="alerts-sidebar__header" style={{ marginBottom: "18px" }}>
        <span className="section-kicker" style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", letterSpacing: "1.2px", textTransform: "uppercase" }}>Active Alerts</span>
        <h2 style={{ fontSize: "24px", margin: "4px 0 0", color: "var(--text)" }}>Monitoring panel</h2>
      </div>

      {sortedAlerts.length === 0 ? (
        <div className="alerts-empty" style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "180px",
          borderRadius: "18px",
          border: "1px dashed var(--line)",
          background: "var(--surface)",
          textAlign: "center",
          padding: "24px",
          color: "var(--muted)"
        }}>
          <CheckCircle2 size={24} style={{ color: "var(--accent-mint)", marginBottom: "10px" }} />
          <strong style={{ color: "var(--text)", fontSize: "14px" }}>No active alerts</strong>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted)" }}>All rooms are currently within expected usage.</p>
        </div>
      ) : (
        <div className="alerts-list" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {sortedAlerts.map((alert) => {
            const isCritical = alert.severity === "critical";
            const bgVar = isCritical ? "var(--alert-bg)" : "var(--warning-bg)";
            const borderVar = isCritical ? "var(--alert-border)" : "var(--warning-border)";
            const textVar = isCritical ? "var(--alert-text)" : "var(--warning-text)";
            const severityBadgeText = isCritical ? "CRITICAL" : "WARNING";

            return (
              <article
                key={alert.id}
                className="alert-row"
                style={{
                  background: bgVar,
                  border: `1px solid ${borderVar}`,
                  padding: "14px",
                  borderRadius: "14px",
                  display: "grid",
                  gridTemplateColumns: "24px 1fr",
                  gap: "12px",
                  transition: "all 0.2s ease"
                }}
              >
                <span className="alert-row__icon" style={{ color: textVar, display: "grid", placeItems: "center", width: "24px", height: "24px" }}>
                  <TriangleAlert size={16} />
                </span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <strong style={{ fontSize: "13px", color: "var(--text)" }}>{alert.title}</strong>
                    <span style={{
                      fontSize: "8px",
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: borderVar,
                      color: textVar,
                      letterSpacing: "0.5px"
                    }}>{severityBadgeText}</span>
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginTop: "2px" }}>
                    {getRoomDefinition(alert.roomId).name}
                  </div>
                  <p style={{ margin: "4px 0", fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
                    {alert.message}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "8px" }}>
                    <time className="alert-row__relative" style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: textVar, fontWeight: 600 }}>
                      <Clock3 size={11} />
                      Detected {formatRelativeTime(alert.triggeredAt, simulatedNow)}
                    </time>
                    <time className="alert-row__absolute" style={{ display: "block", fontSize: "10px", color: "var(--muted)" }}>
                      {formatAbsoluteTime(alert.triggeredAt)}
                    </time>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}
