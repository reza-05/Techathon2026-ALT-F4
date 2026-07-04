import type { ActivityEvent } from "@altf4/shared";

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
          return (
            <div className={`activity-item activity-item--${event.kind}`} key={event.id}>
              <div>
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
