import type { ActivityEvent } from "@altf4/shared";
import { formatRelativeTime, formatAbsoluteTime } from "../utils/date-format";
import { TriangleAlert, ToggleRight, Sparkles, Cpu, MessageSquare } from "lucide-react";

export function ActivityFeed({ events, simulatedNow }: { events: ActivityEvent[]; simulatedNow: string }) {
  return (
    <section className="side-card activity-panel" style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "24px", padding: "28px 24px" }}>
      <div className="section-heading" style={{ marginBottom: "20px" }}>
        <div>
          <span className="eyebrow" style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", letterSpacing: "1.2px", textTransform: "uppercase" }}>AUDIT TRAIL</span>
          <h2 style={{ fontSize: "26px", margin: "4px 0 0", color: "var(--text)" }}>Recent activity</h2>
        </div>
      </div>
      
      <div className="activity-timeline" style={{ position: "relative", paddingLeft: "20px" }}>
        {/* Vertical timeline line */}
        <div style={{
          position: "absolute",
          left: "6px",
          top: "8px",
          bottom: "8px",
          width: "2px",
          background: "var(--line)"
        }} />

        <div className="activity-list" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {events.slice(0, 5).map((event) => {
            // Determine styling variables based on event kind
            let bgVar = "var(--system-bg)";
            let borderVar = "var(--system-border)";
            let textVar = "var(--system-text)";
            let Icon = Cpu;
            let title = "System Event";

            if (event.kind === "alert") {
              bgVar = "var(--alert-bg)";
              borderVar = "var(--alert-border)";
              textVar = "var(--alert-text)";
              Icon = TriangleAlert;
              title = event.message.includes("Resolved") ? "Alert Resolved" : "Alert Triggered";
            } else if (event.kind === "device") {
              bgVar = "var(--success-bg)";
              borderVar = "var(--success-border)";
              textVar = "var(--success-text)";
              Icon = ToggleRight;
              title = "Device State Update";
            } else if (event.kind === "scenario") {
              bgVar = "var(--scenario-bg)";
              borderVar = "var(--scenario-border)";
              textVar = "var(--scenario-text)";
              Icon = Sparkles;
              title = "Operation Scenario";
            }

            // Custom check for Discord messages
            if (event.message.toLowerCase().includes("discord") || event.message.toLowerCase().includes("bot")) {
              bgVar = "var(--discord-bg)";
              borderVar = "var(--discord-border)";
              textVar = "var(--discord-text)";
              Icon = MessageSquare;
              title = "Discord Alert Broadcast";
            }

            return (
              <div key={event.id} style={{ position: "relative" }}>
                {/* Timeline dot */}
                <div style={{
                  position: "absolute",
                  left: "-19px",
                  top: "18px",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: textVar,
                  border: "2.5px solid var(--surface)",
                  boxShadow: `0 0 8px ${textVar}`,
                  zIndex: 2
                }} />

                {/* Event Card */}
                <article
                  className="activity-card"
                  style={{
                    background: bgVar,
                    border: `1px solid ${borderVar}`,
                    borderRadius: "14px",
                    padding: "16px 20px",
                    display: "grid",
                    gridTemplateColumns: "28px 1fr",
                    gap: "14px",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "var(--shadow)"
                  }}
                >
                  <span style={{ color: textVar, display: "grid", placeItems: "center", width: "28px", height: "28px" }}>
                    <Icon size={18} />
                  </span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <strong style={{ fontSize: "14px", color: "var(--text)" }}>{title}</strong>
                      <span style={{
                        fontSize: "9px",
                        fontWeight: 800,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: borderVar,
                        color: textVar,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase"
                      }}>{event.kind}</span>
                    </div>
                    <p style={{ margin: "6px 0", fontSize: "13px", color: "var(--muted)", lineHeight: 1.45 }}>
                      {event.message}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--muted)", marginTop: "8px" }}>
                      <span style={{ fontWeight: 500 }}>{formatAbsoluteTime(event.timestamp)}</span>
                      <span>•</span>
                      <span style={{ color: "var(--accent-mint)", fontWeight: 600 }}>{formatRelativeTime(event.timestamp, simulatedNow)}</span>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
