import { Fan, Lightbulb, Sofa, Square } from "lucide-react";
import { ROOMS, type Device, type RoomSummary } from "@altf4/shared";

interface OfficeMapProps {
  devices: Device[];
  rooms: RoomSummary[];
  onToggle: (deviceId: string) => void;
  busyDeviceId: string | null;
}

function relativeTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-BD", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka"
  });
}

export function OfficeMap({ devices, rooms, onToggle, busyDeviceId }: OfficeMapProps) {
  return (
    <div className="office-shell">
      <div className="office-shell__topline">
        <div>
          <span className="eyebrow">LIVE DIGITAL TWIN</span>
          <h2>Office floor</h2>
        </div>
        <div className="map-legend">
          <span><i className="legend-dot legend-dot--on" />Running</span>
          <span><i className="legend-dot" />Off</span>
        </div>
      </div>

      <div className="office-map">
        {ROOMS.map((room) => {
          const roomDevices = devices.filter((device) => device.roomId === room.id);
          const summary = rooms.find((candidate) => candidate.id === room.id);

          return (
            <section className={`room room--${room.id}`} key={room.id}>
              <div className="room__header">
                <div>
                  <h3>{room.name}</h3>
                  <p>{room.purpose}</p>
                </div>
                <span className="room__watts">{summary?.currentWatts ?? 0}W</span>
              </div>

              <div className="room__lights">
                {roomDevices
                  .filter((device) => device.type === "light")
                  .map((device) => (
                    <DeviceButton
                      key={device.id}
                      device={device}
                      onToggle={onToggle}
                      busy={busyDeviceId === device.id}
                    />
                  ))}
              </div>

              <div className="room__furniture" aria-hidden="true">
                {room.id === "drawing" ? (
                  <>
                    <span className="sofa-shape"><Sofa size={28} /></span>
                    <span className="coffee-table" />
                  </>
                ) : (
                  <>
                    <span className="desk"><Square size={28} /><i /><i /></span>
                    <span className="desk"><Square size={28} /><i /><i /></span>
                  </>
                )}
              </div>

              <div className="room__fans">
                {roomDevices
                  .filter((device) => device.type === "fan")
                  .map((device) => (
                    <DeviceButton
                      key={device.id}
                      device={device}
                      onToggle={onToggle}
                      busy={busyDeviceId === device.id}
                    />
                  ))}
              </div>

              <div className="room__footer">
                <span>{summary?.activeDevices ?? 0}/5 active</span>
                <span>{summary?.activeFans ?? 0} fans · {summary?.activeLights ?? 0} lights</span>
              </div>
            </section>
          );
        })}
        <div className="office-corridor">
          <span>ENTRY</span>
          <i />
        </div>
      </div>
      <p className="map-hint">Select any light or fan to simulate a physical state change.</p>
    </div>
  );
}

interface DeviceButtonProps {
  device: Device;
  onToggle: (deviceId: string) => void;
  busy: boolean;
}

function DeviceButton({ device, onToggle, busy }: DeviceButtonProps) {
  const Icon = device.type === "fan" ? Fan : Lightbulb;
  return (
    <button
      type="button"
      className={`map-device map-device--${device.type} ${device.isOn ? "is-on" : ""}`}
      onClick={() => onToggle(device.id)}
      disabled={busy}
      title={`${device.name}: ${device.isOn ? "ON" : "OFF"} · ${device.currentWatts}W · changed ${relativeTime(device.lastChangedAt)}`}
      aria-label={`Turn ${device.name} ${device.isOn ? "off" : "on"}`}
    >
      <span className="map-device__halo" />
      <Icon size={device.type === "fan" ? 29 : 25} strokeWidth={1.8} />
      <small>{device.name}</small>
    </button>
  );
}

