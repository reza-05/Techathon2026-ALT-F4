import { BellRing, Cpu, ToggleRight, WandSparkles } from "lucide-react";
import type { ActivityEvent } from "@altf4/shared";

function iconFor(kind: ActivityEvent["kind"]) {
  switch (kind) {
    case "alert":
      return BellRing;
    case "device":
      return ToggleRight;
    case "scenario":
      return WandSparkles;
    case "system":
      return Cpu;
  }
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <section className="side-card activity-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">AUDIT TRAIL</span>
          <h2>Recent activity</h2>
        </div>
      </div>
      <div className="activity-list">
        {events.slice(0, 5).map((event) => {
          const Icon = iconFor(event.kind);
          return (
            <div className="activity-item" key={event.id}>
              <span><Icon size={15} /></span>
              <div>
                <small className="activity-item__kind">{event.kind}</small>
                <p>{event.message}</p>
                <time>
                  {new Date(event.timestamp).toLocaleTimeString("en-BD", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Dhaka"
                  })}
                </time>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
