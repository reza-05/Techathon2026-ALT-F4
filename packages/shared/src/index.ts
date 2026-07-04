export const ROOM_IDS = ["drawing", "work-1", "work-2"] as const;

export type RoomId = (typeof ROOM_IDS)[number];
export type DeviceType = "fan" | "light";
export type ScenarioId = "normal" | "after-hours" | "long-running" | "all-off";
export type ConnectionStatus = "connecting" | "live" | "offline";

export interface RoomDefinition {
  id: RoomId;
  name: string;
  shortName: string;
  purpose: string;
}

export interface Device {
  id: string;
  roomId: RoomId;
  room: RoomId;
  type: DeviceType;
  name: string;
  status: "on" | "off";
  isOn: boolean;
  ratedWatts: number;
  powerDraw: number;
  currentWatts: number;
  lastChanged: string;
  lastChangedAt: string;
}

export interface RoomSummary {
  id: RoomId;
  name: string;
  activeDevices: number;
  totalDevices: number;
  activeFans: number;
  activeLights: number;
  currentWatts: number;
}

export type AlertType = "after-hours" | "long-running";
export type AlertSeverity = "warning" | "critical";

export interface OfficeAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  roomId: RoomId;
  title: string;
  message: string;
  triggeredAt: string;
}

export interface ActivityEvent {
  id: string;
  kind: "device" | "scenario" | "alert" | "system";
  message: string;
  timestamp: string;
}

export interface PowerPoint {
  timestamp: string;
  watts: number;
}

export interface OfficeSnapshot {
  sequence: number;
  simulatedNow: string;
  simulatedTime: string;
  isAfterHours: boolean;
  scenario: ScenarioId;
  devices: Device[];
  rooms: RoomSummary[];
  activeDeviceCount: number;
  totalDeviceCount: number;
  totalWatts: number;
  todayEnergyKwh: number;
  estimatedCostBdt: number;
  activeAlerts: OfficeAlert[];
  recentActivity: ActivityEvent[];
  powerHistory: PowerPoint[];
}

export const ROOMS: RoomDefinition[] = [
  {
    id: "drawing",
    name: "Drawing Room",
    shortName: "Drawing",
    purpose: "Guest waiting area"
  },
  {
    id: "work-1",
    name: "Work Room 1",
    shortName: "Work 1",
    purpose: "Employee workspace"
  },
  {
    id: "work-2",
    name: "Work Room 2",
    shortName: "Work 2",
    purpose: "Employee workspace"
  }
];

const DEVICE_BLUEPRINT = [
  { type: "fan", name: "Fan 1", ratedWatts: 60 },
  { type: "fan", name: "Fan 2", ratedWatts: 60 },
  { type: "light", name: "Light 1", ratedWatts: 15 },
  { type: "light", name: "Light 2", ratedWatts: 15 },
  { type: "light", name: "Light 3", ratedWatts: 15 }
] as const;

export function createInitialDevices(timestamp: string): Device[] {
  const activeByDefault = new Set([
    "drawing-light-1",
    "work-1-fan-1",
    "work-1-light-1",
    "work-1-light-2",
    "work-2-fan-1",
    "work-2-fan-2",
    "work-2-light-1"
  ]);

  return ROOMS.flatMap((room) =>
    DEVICE_BLUEPRINT.map((blueprint) => {
      const slug = blueprint.name.toLowerCase().replace(" ", "-");
      const id = `${room.id}-${slug}`;
      const isOn = activeByDefault.has(id);

      return {
        id,
        roomId: room.id,
        room: room.id,
        type: blueprint.type,
        name: blueprint.name,
        status: isOn ? "on" : "off",
        isOn,
        ratedWatts: blueprint.ratedWatts,
        powerDraw: isOn ? blueprint.ratedWatts : 0,
        currentWatts: isOn ? blueprint.ratedWatts : 0,
        lastChanged: timestamp,
        lastChangedAt: timestamp
      };
    })
  );
}

export function getRoomDefinition(roomId: RoomId): RoomDefinition {
  const room = ROOMS.find((candidate) => candidate.id === roomId);
  if (!room) {
    throw new Error(`Unknown room: ${roomId}`);
  }
  return room;
}
