import { useState } from "react";
import {
  Activity,
  BellRing,
  Bot,
  Building2,
  CalendarClock,
  Clock3,
  Gauge,
  Leaf,
  Radio,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Zap
} from "lucide-react";
import type { ScenarioId } from "@altf4/shared";
import { ActivityFeed } from "./components/ActivityFeed";
import { AlertPanel } from "./components/AlertPanel";
import { KpiCard } from "./components/KpiCard";
import { OfficeMap } from "./components/OfficeMap";
import { PowerSparkline } from "./components/PowerSparkline";
import { API_URL, useOfficeSocket } from "./use-office-socket";

const SCENARIOS: Array<{
  id: ScenarioId;
  label: string;
  icon: typeof Sparkles;
}> = [
  { id: "normal", label: "Normal day", icon: Activity },
  { id: "after-hours", label: "After-hours leak", icon: BellRing },
  { id: "long-running", label: "2h anomaly", icon: Clock3 },
  { id: "all-off", label: "Close office", icon: RotateCcw }
];

export function App() {
  const { snapshot, connectionStatus } = useOfficeSocket();
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);
  const [scenarioBusy, setScenarioBusy] = useState(false);

  async function toggleDevice(deviceId: string) {
    setBusyDeviceId(deviceId);
    try {
      await fetch(`${API_URL}/api/devices/${deviceId}/toggle`, { method: "POST" });
    } finally {
      setBusyDeviceId(null);
    }
  }

  async function activateScenario(scenarioId: ScenarioId) {
    setScenarioBusy(true);
    try {
      await fetch(`${API_URL}/api/simulation/scenarios/${scenarioId}`, { method: "POST" });
    } finally {
      setScenarioBusy(false);
    }
  }

  if (!snapshot) {
    return (
      <main className="loading-screen">
        <div className="brand-mark"><Zap size={28} /></div>
        <span className="loading-pulse" />
        <h1>Connecting to the office…</h1>
        <p>Waking up the live energy twin.</p>
      </main>
    );
  }

  const simulatedDate = new Date(snapshot.simulatedNow);
  const timeLabel = simulatedDate.toLocaleTimeString("en-BD", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka"
  });
  const dateLabel = simulatedDate.toLocaleDateString("en-BD", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Dhaka"
  });
  const activeScenario = SCENARIOS.find((scenario) => scenario.id === snapshot.scenario);
  const alertTone = snapshot.activeAlerts.length ? "amber" : "mint";

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="PowerDown dashboard home">
          <span className="brand-mark"><Zap size={22} fill="currentColor" /></span>
          <span>
            <strong>PowerDown</strong>
            <small>OFFICE ENERGY INTELLIGENCE</small>
          </span>
        </a>

        <div className="topbar__center">
          <span className="office-pill"><Building2 size={15} />ALT+F4 HQ</span>
          <span className="time-pill"><CalendarClock size={15} />{dateLabel} · {timeLabel}</span>
        </div>

        <div className={`live-status live-status--${connectionStatus}`}>
          <Radio size={15} />
          <span>{connectionStatus === "live" ? "Live sync" : connectionStatus}</span>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero-row">
          <article className="hero-card">
            <div className="hero-card__copy">
              <span className="eyebrow"><Leaf size={13} />LIVE OFFICE ENERGY TWIN</span>
              <h1>A live control view for smarter office energy decisions.</h1>
              <p>
                Track every light, fan, power spike, and after-hours anomaly across all three rooms
                from one focused dashboard.
              </p>
            </div>

            <div className="hero-card__stats">
              <div>
                <span>Live load</span>
                <strong>{snapshot.totalWatts}W</strong>
                <small>{snapshot.activeDeviceCount} active devices right now</small>
              </div>
              <div>
                <span>Office coverage</span>
                <strong>3 rooms</strong>
                <small>Drawing, Work Room 1, Work Room 2</small>
              </div>
              <div>
                <span>Alert watch</span>
                <strong>{snapshot.activeAlerts.length}</strong>
                <small>{snapshot.activeAlerts.length ? "Needs attention" : "Everything stable"}</small>
              </div>
            </div>

            <div className="hero-card__notes">
              <span>15 devices monitored in real time</span>
              <span>After-hours and 2-hour anomaly detection</span>
              <span>Shared live state across dashboard and Discord bot</span>
            </div>
          </article>

          <div className="command-deck">
            <div className="command-deck__meta">
              <span>Simulation control</span>
              <strong>{activeScenario?.label ?? "Normal day"}</strong>
              <small>{dateLabel} · {timeLabel} · Asia/Dhaka simulated clock</small>
            </div>

            <div className="status-strip">
              <span className={`status-chip status-chip--${connectionStatus}`}>
                <Radio size={14} />
                {connectionStatus === "live" ? "Realtime sync" : connectionStatus}
              </span>
              <span className={`status-chip status-chip--${alertTone}`}>
                <ShieldAlert size={14} />
                {snapshot.activeAlerts.length ? `${snapshot.activeAlerts.length} active alerts` : "No active alerts"}
              </span>
            </div>

            <div className="demo-lab">
              <span>Simulation lab</span>
              <div className="scenario-buttons">
                {SCENARIOS.map((scenario) => {
                  const Icon = scenario.icon;
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      className={snapshot.scenario === scenario.id ? "is-active" : ""}
                      onClick={() => activateScenario(scenario.id)}
                      disabled={scenarioBusy}
                    >
                      <Icon size={14} />
                      {scenario.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="kpi-grid">
          <KpiCard
            icon={Gauge}
            label="Live power"
            value={`${snapshot.totalWatts} W`}
            meta={`${Math.round((snapshot.totalWatts / 495) * 100)}% of 495W capacity`}
          />
          <KpiCard
            icon={Activity}
            label="Active devices"
            value={`${snapshot.activeDeviceCount} / ${snapshot.totalDeviceCount}`}
            meta={`${snapshot.totalDeviceCount - snapshot.activeDeviceCount} currently off`}
            tone="blue"
          />
          <KpiCard
            icon={Zap}
            label="Energy today"
            value={`${snapshot.todayEnergyKwh.toFixed(2)} kWh`}
            meta="Integrated from live power"
            tone="violet"
          />
          <KpiCard
            icon={ShieldAlert}
            label="Alert status"
            value={snapshot.activeAlerts.length ? `${snapshot.activeAlerts.length} live` : "All clear"}
            meta={snapshot.activeAlerts.length ? "Review alert panel for room-level issues" : "No abnormal usage detected"}
            tone="amber"
          />
        </section>

        <section className="dashboard-grid">
          <OfficeMap
            devices={snapshot.devices}
            rooms={snapshot.rooms}
            onToggle={toggleDevice}
            busyDeviceId={busyDeviceId}
          />
          <aside className="sidebar-stack">
            <AlertPanel alerts={snapshot.activeAlerts} />
            <ActivityFeed events={snapshot.recentActivity} />
          </aside>
        </section>

        <section className="insights-row">
          <article className="insight-card insight-card--chart">
            <div className="section-heading">
              <div>
                <span className="eyebrow">LIVE LOAD</span>
                <h2>Power trend</h2>
              </div>
              <strong>{snapshot.totalWatts} W</strong>
            </div>
            <PowerSparkline points={snapshot.powerHistory} />
          </article>

          <article className="insight-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">ROOM BREAKDOWN</span>
                <h2>Where energy goes</h2>
              </div>
            </div>
            <div className="room-bars">
              {snapshot.rooms.map((room) => (
                <div className="room-bar" key={room.id}>
                  <div><span>{room.name}</span><strong>{room.currentWatts}W</strong></div>
                  <span><i style={{ width: `${Math.max(3, (room.currentWatts / 150) * 100)}%` }} /></span>
                </div>
              ))}
            </div>
          </article>

          <article className="insight-card bot-card">
            <span className="bot-card__icon"><Bot size={26} /></span>
            <div>
              <span className="eyebrow">DISCORD COPILOT</span>
              <h2>Ask without opening a browser.</h2>
              <p>Use <code>/status</code>, <code>/room</code> or <code>/usage</code> for the same live data.</p>
            </div>
          </article>
        </section>
      </main>

      <footer>
        <span>PowerDown · Team ALT+F4</span>
        <span>Sequence #{snapshot.sequence} · One source of truth</span>
      </footer>
    </div>
  );
}
