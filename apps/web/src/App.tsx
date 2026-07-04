import { Activity, AlertTriangle, Clock3, Gauge, MoonStar, SunMedium, Zap } from "lucide-react";
import { AlertPanel } from "./components/AlertPanel";
import { ActivityFeed } from "./components/ActivityFeed";
import { KpiCard } from "./components/KpiCard";
import { OfficeMap } from "./components/OfficeMap";
import { useOfficeSocket } from "./use-office-socket";

export function App() {
  const { snapshot, connectionStatus, toggleDevice, togglingIds } = useOfficeSocket();

  if (!snapshot) {
    return (
      <main className="loading-screen">
        <div className="loading-panel">
          <span className="loading-mark"><Zap size={18} /></span>
          <h1>Connecting to Office Mission Control</h1>
          <p>Synchronizing live building telemetry feed...</p>
        </div>
      </main>
    );
  }

  // The website is configured to remain always in Light Mode per requested plan change
  const darknessFactor = 0;

  return (
    <div 
      className="app-shell app-shell--light"
      style={{
        ["--darkness-factor" as any]: darknessFactor
      }}
    >
      <header className="topbar">
        <div>
          <p className="topbar__eyebrow">Welcome, Sir</p>
          <h1>Office energy monitoring dashboard</h1>
        </div>

        <div className="topbar__meta">
          <span className={`topbar__pill topbar__pill--${connectionStatus === "live" ? "live" : "offline"}`}>
            <Activity size={14} />
            {connectionStatus === "live" ? "Live Telemetry Sync" : "Connection offline"}
          </span>
          <span className="topbar__pill">
            <Clock3 size={14} />
            {snapshot.simulatedTime}
          </span>
          <span className={`topbar__pill topbar__pill--${snapshot.isAfterHours ? "after-hours" : "office-hours"}`}>
            {snapshot.isAfterHours ? <MoonStar size={14} /> : <SunMedium size={14} />}
            {snapshot.isAfterHours ? "After hours" : "Office hours"}
          </span>
          <span className="topbar__pill" style={{ fontWeight: 700, color: "var(--accent)" }}>
            Mode: {
              snapshot.scenario === "long-running" ? "2h Anomaly" :
              (snapshot.isAfterHours ? (snapshot.activeAlerts.length > 0 ? "After-hours Leak" : "Closed Idle") : "Office Open")
            }
          </span>
        </div>
      </header>

      <main className="dashboard">
        <section className="kpi-grid">
          <KpiCard
            icon={Gauge}
            label="Total power"
            value={`${snapshot.totalWatts} W`}
            meta="Live office power draw"
            iconColor="var(--system-text)"
            iconBg="var(--system-bg)"
          />
          <KpiCard
            icon={Activity}
            label="Active devices"
            value={`${snapshot.activeDeviceCount}/${snapshot.totalDeviceCount}`}
            meta="Devices currently running"
            iconColor="var(--success-text)"
            iconBg="var(--success-bg)"
          />
          <KpiCard
            icon={Zap}
            label="Energy today"
            value={`${snapshot.todayEnergyKwh.toFixed(2)} kWh`}
            meta="Total integrated building consumption"
            iconColor="var(--warning-text)"
            iconBg="var(--warning-bg)"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Active alerts"
            value={`${snapshot.activeAlerts.length}`}
            meta={snapshot.isAfterHours ? "After-hours monitoring active" : "Continuous room monitoring active"}
            tone={snapshot.activeAlerts.length ? "danger" : "neutral"}
            iconColor={snapshot.activeAlerts.length ? "var(--alert-text)" : "var(--text-muted)"}
            iconBg={snapshot.activeAlerts.length ? "var(--alert-bg)" : "var(--surface-soft)"}
          />
        </section>

        <section className="workspace-grid">
          <OfficeMap
            devices={snapshot.devices}
            rooms={snapshot.rooms}
            onToggleDevice={toggleDevice}
            togglingIds={togglingIds}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <AlertPanel alerts={snapshot.activeAlerts} simulatedNow={snapshot.simulatedNow} />
            <ActivityFeed events={snapshot.recentActivity} simulatedNow={snapshot.simulatedNow} />
          </div>
        </section>
      </main>
    </div>
  );
}
