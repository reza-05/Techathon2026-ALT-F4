import type { ReactNode } from "react";
import { ROOMS, type Device, type RoomDefinition, type RoomSummary } from "@altf4/shared";

interface OfficeMapProps {
  devices: Device[];
  rooms: RoomSummary[];
  onToggleDevice: (deviceId: string) => Promise<void>;
  togglingIds: string[];
}

const DEVICE_POSITIONS: Record<string, string> = {
  "drawing-fan-1": "device--drawing-fan-1",
  "drawing-fan-2": "device--drawing-fan-2",
  "drawing-light-1": "device--drawing-light-1",
  "drawing-light-2": "device--drawing-light-2",
  "drawing-light-3": "device--drawing-light-3",
  "work-1-fan-1": "device--work-fan-1",
  "work-1-fan-2": "device--work-fan-2",
  "work-1-light-1": "device--work-light-1",
  "work-1-light-2": "device--work-light-2",
  "work-1-light-3": "device--work-light-3",
  "work-2-fan-1": "device--work-fan-1",
  "work-2-fan-2": "device--work-fan-2",
  "work-2-light-1": "device--work-light-1",
  "work-2-light-2": "device--work-light-2",
  "work-2-light-3": "device--work-light-3"
};

export function OfficeMap({ devices, rooms, onToggleDevice, togglingIds }: OfficeMapProps) {
  return (
    <section className="map-card">
      <div className="map-card__header">
        <div>
          <span className="section-kicker">Office Layout (Top View)</span>
          <h2>All rooms have 2 fans and 3 lights</h2>
        </div>
        <div className="map-card__legend">
          <span><i className="legend-swatch legend-swatch--fan" />Fan · 60W</span>
          <span><i className="legend-swatch legend-swatch--light" />Light · 15W</span>
          <span><i className="legend-swatch legend-swatch--door" />Door</span>
          <span><i className="legend-swatch legend-swatch--window" />Window</span>
        </div>
      </div>

      <div className="office-blueprint">
        <div className="office-blueprint__frame">
          <div className="office-window office-window--drawing-top" />
          <div className="office-window office-window--work-1-top" />
          <div className="office-window office-window--work-2-top" />
          <div className="office-window office-window--drawing-left" />
          <div className="office-window office-window--work-2-right" />

          <RoomBlock
            room={ROOMS[0]!}
            summary={rooms.find((item) => item.id === "drawing")}
            devices={devices.filter((item) => item.roomId === "drawing")}
            onToggleDevice={onToggleDevice}
            togglingIds={togglingIds}
          >
            <div className="plant plant--drawing-top-left" />
            <div className="plant plant--drawing-bottom-right" />
            <div className="sofa sofa--vertical" />
            <div className="armchair" />
            <div className="rug" />
            <div className="coffee-table" />
          </RoomBlock>

          <RoomBlock
            room={ROOMS[1]!}
            summary={rooms.find((item) => item.id === "work-1")}
            devices={devices.filter((item) => item.roomId === "work-1")}
            onToggleDevice={onToggleDevice}
            togglingIds={togglingIds}
          >
            <div className="desk desk--work-1-a"><div className="desk__monitor" /><div className="desk__keyboard" /><div className="desk__chair desk__chair--top" /></div>
            <div className="desk desk--work-1-b"><div className="desk__monitor" /><div className="desk__keyboard" /><div className="desk__chair desk__chair--top" /></div>
            <div className="desk desk--work-1-c"><div className="desk__monitor" /><div className="desk__keyboard" /><div className="desk__chair desk__chair--bottom" /><div className="desk__plant" /></div>
            <div className="desk desk--work-1-d"><div className="desk__monitor" /><div className="desk__keyboard" /><div className="desk__chair desk__chair--bottom" /><div className="desk__plant" /></div>
            <div className="filing-cabinet">
              <span />
              <i />
              <i />
              <i />
            </div>
          </RoomBlock>

          <RoomBlock
            room={ROOMS[2]!}
            summary={rooms.find((item) => item.id === "work-2")}
            devices={devices.filter((item) => item.roomId === "work-2")}
            onToggleDevice={onToggleDevice}
            togglingIds={togglingIds}
          >
            <div className="desk desk--work-2-a"><div className="desk__monitor" /><div className="desk__keyboard" /><div className="desk__chair desk__chair--top" /><div className="desk__plant" /></div>
            <div className="desk desk--work-2-b"><div className="desk__monitor" /><div className="desk__keyboard" /><div className="desk__chair desk__chair--top" /><div className="desk__plant" /></div>
            <div className="desk desk--work-2-c"><div className="desk__monitor" /><div className="desk__keyboard" /><div className="desk__chair desk__chair--bottom" /><div className="desk__plant" /></div>
            <div className="desk desk--work-2-d"><div className="desk__monitor" /><div className="desk__keyboard" /><div className="desk__chair desk__chair--bottom" /><div className="desk__plant" /></div>
            <div className="corner-bookcase">
              <i />
              <i />
              <i />
            </div>
          </RoomBlock>

          <div className="office-hallway">
            <div className="plant plant--hall-left" />
            <div className="plant plant--hall-right" />
            <div className="water-cooler" />
            <div className="room-door room-door--entry" aria-hidden="true">
              <span />
            </div>
            <div className="entry-marker">
              <span>Entry</span>
            </div>
          </div>
        </div>

        <div className="blueprint-footer" style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "space-between", marginTop: "24px" }}>
          {rooms.map((room) => {
            const roomDevices = devices.filter((d) => d.roomId === room.id);
            const totalPower = roomDevices.reduce((sum, d) => sum + d.powerDraw, 0);

            return (
              <div key={room.id} className="blueprint-summary-card" style={{ flex: 1, minWidth: "250px", padding: "18px 20px", borderRadius: "18px", border: "1px solid var(--line)", background: "var(--surface)", boxShadow: "var(--shadow)", transition: "all 0.25s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
                  <strong style={{ fontSize: "16px", color: "var(--text)", fontWeight: 700, letterSpacing: "0.2px" }}>{room.name}</strong>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>{totalPower} W</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {roomDevices.map((device) => {
                    const isOn = device.status === "on";
                    return (
                      <div key={device.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px dashed var(--line)", lastChild: { borderBottom: "none" } } as any}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {/* LED indicator */}
                          <span style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: isOn ? "var(--accent-mint)" : "var(--muted)",
                            boxShadow: isOn ? "0 0 8px var(--accent-mint)" : "none",
                            opacity: isOn ? 1 : 0.35,
                            transition: "all 0.2s ease"
                          }} />
                          
                          {/* Device Name */}
                          <span style={{
                            color: isOn ? "var(--text)" : "var(--muted)",
                            fontWeight: isOn ? 600 : 400,
                            fontSize: "15px"
                          }}>{device.name}</span>

                          {/* ON/OFF Pill Badge */}
                          <span style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: "10px",
                            background: isOn ? "var(--success-bg)" : "var(--surface-soft)",
                            color: isOn ? "var(--success-text)" : "var(--muted)",
                            border: `1px solid ${isOn ? "var(--success-border)" : "var(--line)"}`,
                            letterSpacing: "0.2px",
                            textTransform: "uppercase"
                          }}>{isOn ? "ON" : "OFF"}</span>
                        </div>
                        
                        {/* Power Draw */}
                        <span style={{
                          color: isOn ? "var(--text)" : "var(--muted)",
                          fontWeight: 500,
                          fontSize: "14px",
                          opacity: isOn ? 1 : 0.5
                        }}>{device.powerDraw} W</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RoomBlock({
  room,
  summary,
  devices,
  children,
  onToggleDevice,
  togglingIds
}: {
  room: RoomDefinition;
  summary?: RoomSummary;
  devices: Device[];
  children: ReactNode;
  onToggleDevice: (deviceId: string) => Promise<void>;
  togglingIds: string[];
}) {
  const activeLightCount = devices.filter(
    (device) => device.type === "light" && device.status === "on"
  ).length;

  return (
    <article
      className={`blueprint-room blueprint-room--${room.id} blueprint-room--lights-${activeLightCount}`}
    >
      <div className={`blueprint-room__surface blueprint-room__surface--${room.id}`}>
        <div className="blueprint-room__floor-glow" />
        {children}
        {devices.map((device) => (
          <DeviceMarker
            key={device.id}
            device={device}
            extraClass={DEVICE_POSITIONS[device.id] ?? ""}
            onToggle={onToggleDevice}
            isToggling={togglingIds.includes(device.id)}
          />
        ))}
      </div>
      <div className="blueprint-room__label">
        <div>
          <h3>{room.name}</h3>
          <p>{room.purpose}</p>
        </div>
        <strong>{summary?.currentWatts ?? 0} W</strong>
      </div>
      <div className={`room-door room-door--${room.id}`} aria-hidden="true">
        <span />
      </div>
    </article>
  );
}

function DeviceMarker({
  device,
  extraClass = "",
  onToggle,
  isToggling
}: {
  device: Device;
  extraClass?: string;
  onToggle: (deviceId: string) => Promise<void>;
  isToggling: boolean;
}) {
  const isOn = device.status === "on";

  return (
    <button
      type="button"
      className={`device-marker ${extraClass} ${isOn ? "device-marker--on" : "device-marker--off"} device-marker--${device.type} ${isToggling ? "device-marker--busy" : ""}`}
      onClick={() => void onToggle(device.id)}
      disabled={isToggling}
      aria-label={`${device.name} in ${device.roomId}, ${device.powerDraw} watts, is ${isOn ? "on" : "off"}. Click to toggle.`}
      aria-describedby={`${device.id}-tooltip`}
    >
      {device.type === "fan" ? (
        <span className="ceiling-fan" aria-hidden="true">
          <i />
          <i />
          <i />
          <b />
        </span>
      ) : (
        <span className="ceiling-light" aria-hidden="true" />
      )}
      <span
        id={`${device.id}-tooltip`}
        className="device-marker__tooltip"
        role="tooltip"
      >
        <span>{device.name}</span>
        <small>{device.powerDraw} W · {isOn ? "ON" : "OFF"}</small>
      </span>
    </button>
  );
}
