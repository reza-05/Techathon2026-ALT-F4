import { Activity, AlertTriangle, Clock3, Gauge, MoonStar, SunMedium, Zap } from "lucide-react";
import { AlertPanel } from "./components/AlertPanel";
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
          <h1>Connecting to live office state</h1>
          <p>Loading the shared backend snapshot.</p>
        </div>
      </main>
    );
  }

  return (
    <div className={`app-shell ${snapshot.isAfterHours ? "app-shell--after-hours" : "app-shell--day"}`}>
      <header className="topbar">
        <div>
          <p className="topbar__eyebrow">Smart Office Monitoring</p>
          <h1>Office energy dashboard</h1>
        </div>

        <div className="topbar__meta">
          <span className={`topbar__pill topbar__pill--${connectionStatus === "live" ? "live" : "offline"}`}>
            <Activity size={14} />
            {connectionStatus === "live" ? "Live backend sync" : "Connection offline"}
          </span>
          <span className="topbar__pill">
            <Clock3 size={14} />
            {snapshot.simulatedTime}
          </span>
          <span className={`topbar__pill topbar__pill--${snapshot.isAfterHours ? "after-hours" : "office-hours"}`}>
            {snapshot.isAfterHours ? <MoonStar size={14} /> : <SunMedium size={14} />}
            {snapshot.isAfterHours ? "After hours" : "Office hours"}
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
          />
          <KpiCard
            icon={Activity}
            label="Active devices"
            value={`${snapshot.activeDeviceCount}/${snapshot.totalDeviceCount}`}
            meta="Devices currently running"
          />
          <KpiCard
            icon={Zap}
            label="Energy today"
            value={`${snapshot.todayEnergyKwh.toFixed(2)} kWh`}
            meta="Integrated from the shared backend"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Active alerts"
            value={`${snapshot.activeAlerts.length}`}
            meta={snapshot.isAfterHours ? "After-hours monitoring active" : "Continuous room monitoring active"}
            tone={snapshot.activeAlerts.length ? "danger" : "neutral"}
          />
        </section>

        <section className="workspace-grid">
          <OfficeMap
            devices={snapshot.devices}
            rooms={snapshot.rooms}
            onToggleDevice={toggleDevice}
            togglingIds={togglingIds}
          />
          <AlertPanel alerts={snapshot.activeAlerts} />
        </section>
      </main>
    </div>
  );
}
