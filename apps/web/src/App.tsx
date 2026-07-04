import { useState } from "react";
import { Activity, BellRing, Building2, Clock3, Gauge, RotateCcw, ShieldAlert, Sparkles, Zap } from "lucide-react";
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="PowerDown dashboard home">
          <span className="brand-mark"><Zap size={14} fill="currentColor" /></span>
          <span>
            <strong>PowerDown</strong>
            <small>OFFICE ENERGY INTELLIGENCE</small>
          </span>
        </a>

        <div className="topbar__center">
          <span className="status-pill">
            <Building2 size={12} />
            ALT+F4 HQ
          </span>
          <span className="status-pill">
            <Clock3 size={12} />
            {dateLabel} · {timeLabel}
          </span>
        </div>

        <div className="topbar__right">
          <span className={`status-pill ${connectionStatus === "live" ? "status-pill--active" : "status-pill--danger"}`}>
            <span className="status-indicator-dot status-indicator-dot--pulse" />
            {connectionStatus === "live" ? "LIVE SYNC" : "OFFLINE"}
          </span>
        </div>
      </header>

      <main className="dashboard">
        <section className="kpi-grid">
          <KpiCard
            icon={Gauge}
            label="Live power"
            value={`${snapshot.totalWatts} W`}
            meta={`${Math.round((snapshot.totalWatts / 495) * 100)}% load capacity`}
            trend="+12% vs last hour"
            sparkPath="M 0 10 L 8 4 L 16 12 L 24 6 L 32 8 L 40 2 L 48 8"
          />
          <KpiCard
            icon={Activity}
            label="Active devices"
            value={`${snapshot.activeDeviceCount} / ${snapshot.totalDeviceCount}`}
            meta={`${snapshot.totalDeviceCount - snapshot.activeDeviceCount} currently off`}
            tone="blue"
            trend={`${snapshot.activeDeviceCount} online`}
            sparkPath="M 0 12 L 12 12 L 12 6 L 24 6 L 24 12 L 36 12 L 36 6 L 48 6"
          />
          <KpiCard
            icon={Zap}
            label="Energy today"
            value={`${snapshot.todayEnergyKwh.toFixed(2)} kWh`}
            meta="Integrated live total"
            tone="violet"
            trend="+0.14 kWh/h"
            sparkPath="M 0 12 Q 16 10, 24 6 T 48 2"
          />
          <KpiCard
            icon={ShieldAlert}
            label="Alert status"
            value={snapshot.activeAlerts.length ? `${snapshot.activeAlerts.length} active` : "All clear"}
            meta={snapshot.activeAlerts.length ? "Abnormal load detected" : "No device leaks"}
            tone="amber"
            trend={snapshot.activeAlerts.length ? "⚠️ Warning" : "✅ Efficient"}
            sparkPath={snapshot.activeAlerts.length ? "M 0 12 L 20 12 L 24 2 L 28 12 L 48 12" : "M 0 12 L 48 12"}
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
            <div className="command-deck">
              <div className="command-deck__meta">
                <span>Scenario control</span>
                <strong>{activeScenario?.label ?? "Normal day"}</strong>
                <small>Simulated timeline controller</small>
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
                        <Icon size={12} />
                        {scenario.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

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

          <article className="insight-card discord-chat">
            <div className="discord-header">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "2px" }}>
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
              <span>#alerts-and-queries</span>
            </div>
            <div className="discord-messages">
              <div className="discord-message">
                <div className="discord-avatar">SR</div>
                <div className="discord-message-content">
                  <div className="discord-message-header">
                    <span className="discord-user">Shifat Reza</span>
                    <span className="discord-time">Today at 1:16 AM</span>
                  </div>
                  <div className="discord-text"><code>/status</code></div>
                </div>
              </div>
              
              <div className="discord-message">
                <div className="discord-avatar discord-avatar--bot" style={{ backgroundColor: "var(--discord)" }}>PD</div>
                <div className="discord-message-content">
                  <div className="discord-message-header">
                    <span className="discord-user" style={{ color: "var(--mint)" }}>PowerDown Bot</span>
                    <span className="discord-bot-badge">Bot</span>
                    <span className="discord-time">Today at 1:16 AM</span>
                  </div>
                  <div className="discord-text">
                    ⚡ <strong>Live energy brief:</strong><br />
                    The office is drawing <strong>{snapshot.totalWatts}W</strong> right now.<br />
                    • Drawing Room: {snapshot.rooms.find(r => r.id === "drawing")?.currentWatts ?? 0}W<br />
                    • Work Room 1: {snapshot.rooms.find(r => r.id === "work-1")?.currentWatts ?? 0}W<br />
                    • Work Room 2: {snapshot.rooms.find(r => r.id === "work-2")?.currentWatts ?? 0}W
                  </div>
                </div>
              </div>
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
