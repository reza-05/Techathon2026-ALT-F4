import {
  createInitialDevices,
  getRoomDefinition,
  ROOM_IDS,
  ROOMS,
  type ActivityEvent,
  type Device,
  type OfficeAlert,
  type OfficeSnapshot,
  type PowerPoint,
  type RoomId,
  type RoomSummary,
  type ScenarioId
} from "@altf4/shared";

const BDT_PER_KWH = 10.5;
const START_TIME = "2026-07-04T09:10:00+06:00";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const MAX_ACTIVITY = 8;
const MAX_POWER_POINTS = 20;
const NORMAL_FRAMES: Array<{
  time: string;
  activeDeviceIds: string[];
}> = [
  {
    time: "2026-07-04T09:10:00+06:00",
    activeDeviceIds: [
      "drawing-light-1",
      "work-1-fan-1",
      "work-1-light-1",
      "work-1-light-2",
      "work-2-fan-1",
      "work-2-light-1"
    ]
  },
  {
    time: "2026-07-04T10:30:00+06:00",
    activeDeviceIds: [
      "drawing-light-1",
      "drawing-light-2",
      "work-1-fan-1",
      "work-1-fan-2",
      "work-1-light-1",
      "work-1-light-2",
      "work-2-fan-1",
      "work-2-light-1",
      "work-2-light-2"
    ]
  },
  {
    time: "2026-07-04T12:20:00+06:00",
    activeDeviceIds: [
      "drawing-light-1",
      "work-1-fan-1",
      "work-1-fan-2",
      "work-1-light-1",
      "work-1-light-2",
      "work-1-light-3",
      "work-2-fan-1",
      "work-2-fan-2",
      "work-2-light-1",
      "work-2-light-2"
    ]
  },
  {
    time: "2026-07-04T13:45:00+06:00",
    activeDeviceIds: [
      "drawing-light-2",
      "work-1-fan-1",
      "work-1-light-2",
      "work-1-light-3",
      "work-2-fan-1",
      "work-2-fan-2",
      "work-2-light-1"
    ]
  },
  {
    time: "2026-07-04T15:25:00+06:00",
    activeDeviceIds: [
      "drawing-light-1",
      "work-1-fan-1",
      "work-1-fan-2",
      "work-1-light-1",
      "work-1-light-2",
      "work-2-fan-1",
      "work-2-light-1",
      "work-2-light-2"
    ]
  },
  {
    time: "2026-07-04T16:40:00+06:00",
    activeDeviceIds: [
      "drawing-light-1",
      "work-1-fan-1",
      "work-1-light-1",
      "work-2-fan-1",
      "work-2-light-1"
    ]
  }
];

type StoreListener = (snapshot: OfficeSnapshot) => void;

export class OfficeStore {
  private simulatedNow = new Date(START_TIME);
  private devices: Device[] = createInitialDevices(this.simulatedNow.toISOString());
  private scenario: ScenarioId = "normal";
  private sequence = 1;
  private todayEnergyKwh = 0;
  private activeAlerts: OfficeAlert[] = [];
  private recentActivity: ActivityEvent[] = [];
  private powerHistory: PowerPoint[] = [];
  private listeners = new Set<StoreListener>();
  private autoStepIndex = 0;
  private activitySequence = 1;

  constructor() {
    this.addActivity("system", "Live office simulator started.");
    this.recordPowerPoint();
    this.evaluateAlerts();
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): OfficeSnapshot {
    const rooms = this.buildRoomSummaries();
    const totalWatts = rooms.reduce((sum, room) => sum + room.currentWatts, 0);

    return {
      sequence: this.sequence,
      simulatedNow: this.simulatedNow.toISOString(),
      scenario: this.scenario,
      devices: this.devices.map((device) => ({ ...device })),
      rooms,
      activeDeviceCount: this.devices.filter((device) => device.isOn).length,
      totalDeviceCount: this.devices.length,
      totalWatts,
      todayEnergyKwh: Number(this.todayEnergyKwh.toFixed(3)),
      estimatedCostBdt: Number((this.todayEnergyKwh * BDT_PER_KWH).toFixed(2)),
      activeAlerts: this.activeAlerts.map((alert) => ({ ...alert })),
      recentActivity: this.recentActivity.map((event) => ({ ...event })),
      powerHistory: this.powerHistory.map((point) => ({ ...point }))
    };
  }

  getRoom(roomId: RoomId) {
    return {
      room: this.buildRoomSummaries().find((room) => room.id === roomId),
      devices: this.devices.filter((device) => device.roomId === roomId)
    };
  }

  toggleDevice(deviceId: string): OfficeSnapshot {
    const device = this.devices.find((candidate) => candidate.id === deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    this.advanceTime(1);
    this.setDeviceState(device, !device.isOn);
    this.addActivity(
      "device",
      `${getRoomDefinition(device.roomId).name} ${device.name} turned ${device.isOn ? "ON" : "OFF"}.`
    );
    return this.commit();
  }

  applyScenario(scenario: ScenarioId): OfficeSnapshot {
    this.scenario = scenario;

    switch (scenario) {
      case "normal":
        this.autoStepIndex = 0;
        this.loadNormalFrame(0, true);
        break;
      case "after-hours":
        this.simulatedNow = new Date("2026-07-04T20:30:00+06:00");
        this.turnAllOff();
        this.setRoomPattern("work-2", ["fan", "fan", "light", "light", "light"]);
        break;
      case "long-running": {
        this.simulatedNow = new Date("2026-07-04T14:45:00+06:00");
        this.turnAllOff();
        const startedAt = new Date(this.simulatedNow.getTime() - TWO_HOURS_MS - 30 * 60 * 1000);
        this.devices
          .filter((device) => device.roomId === "work-1")
          .forEach((device) => this.setDeviceState(device, true, startedAt));
        break;
      }
      case "all-off":
        this.simulatedNow = new Date("2026-07-04T18:10:00+06:00");
        this.turnAllOff();
        break;
    }

    this.addActivity("scenario", `Simulation changed to ${scenario.replace("-", " ")} mode.`);
    return this.commit();
  }

  runAutomaticStep(): OfficeSnapshot {
    if (this.scenario !== "normal") {
      this.advanceTime(5);
      return this.commit();
    }

    this.autoStepIndex = (this.autoStepIndex + 1) % NORMAL_FRAMES.length;
    this.loadNormalFrame(this.autoStepIndex);
    return this.commit();
  }

  private buildRoomSummaries(): RoomSummary[] {
    return ROOMS.map((room) => {
      const devices = this.devices.filter((device) => device.roomId === room.id);
      return {
        id: room.id,
        name: room.name,
        activeDevices: devices.filter((device) => device.isOn).length,
        totalDevices: devices.length,
        activeFans: devices.filter((device) => device.type === "fan" && device.isOn).length,
        activeLights: devices.filter((device) => device.type === "light" && device.isOn).length,
        currentWatts: devices.reduce((sum, device) => sum + device.currentWatts, 0)
      };
    });
  }

  private setRoomPattern(roomId: RoomId, types: Array<"fan" | "light">): void {
    const devices = this.devices.filter((device) => device.roomId === roomId);
    devices.forEach((device, index) => {
      this.setDeviceState(device, Boolean(types[index]));
    });
  }

  private turnAllOff(): void {
    this.devices.forEach((device) => this.setDeviceState(device, false));
  }

  private loadNormalFrame(frameIndex: number, reset = false): void {
    const frame = NORMAL_FRAMES[frameIndex] ?? NORMAL_FRAMES[0];
    if (!frame) {
      return;
    }
    const nextTime = new Date(frame.time);
    const activeDeviceIds = new Set(frame.activeDeviceIds);

    if (reset) {
      this.simulatedNow = nextTime;
      this.todayEnergyKwh = 0;
      this.devices = createInitialDevices(this.simulatedNow.toISOString());
      this.devices.forEach((device) => this.setDeviceState(device, activeDeviceIds.has(device.id), nextTime));
      return;
    }

    const elapsedMinutes = Math.max(
      1,
      Math.round((nextTime.getTime() - this.simulatedNow.getTime()) / 60_000)
    );
    this.advanceTime(elapsedMinutes);

    const changedDevices: string[] = [];
    this.devices.forEach((device) => {
      const nextState = activeDeviceIds.has(device.id);
      if (device.isOn !== nextState) {
        this.setDeviceState(device, nextState, this.simulatedNow);
        changedDevices.push(
          `${getRoomDefinition(device.roomId).name} ${device.name} ${nextState ? "ON" : "OFF"}`
        );
      }
    });

    if (changedDevices.length > 0) {
      this.addActivity("device", `Normal schedule updated: ${changedDevices.join(", ")}.`);
    }
  }

  private setDeviceState(device: Device, isOn: boolean, changedAt = this.simulatedNow): void {
    if (device.isOn === isOn) {
      if (isOn && changedAt.getTime() !== this.simulatedNow.getTime()) {
        device.lastChangedAt = changedAt.toISOString();
      }
      return;
    }

    device.isOn = isOn;
    device.currentWatts = isOn ? device.ratedWatts : 0;
    device.lastChangedAt = changedAt.toISOString();
  }

  private advanceTime(minutes: number): void {
    const totalWatts = this.devices.reduce((sum, device) => sum + device.currentWatts, 0);
    this.todayEnergyKwh += (totalWatts * (minutes / 60)) / 1000;
    this.simulatedNow = new Date(this.simulatedNow.getTime() + minutes * 60 * 1000);
  }

  private evaluateAlerts(): void {
    const nextAlerts: OfficeAlert[] = [];
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: "Asia/Dhaka"
      }).format(this.simulatedNow)
    );
    const isAfterHours = hour >= 17 || hour < 9;

    for (const roomId of ROOM_IDS) {
      const room = getRoomDefinition(roomId);
      const devices = this.devices.filter((device) => device.roomId === roomId);
      const activeDevices = devices.filter((device) => device.isOn);

      if (isAfterHours && activeDevices.length > 0) {
        nextAlerts.push({
          id: `after-hours-${roomId}`,
          type: "after-hours",
          severity: "critical",
          roomId,
          title: "After-hours energy leak",
          message: `${room.name} still has ${activeDevices.length} device${activeDevices.length === 1 ? "" : "s"} running after 5 PM.`,
          triggeredAt: this.simulatedNow.toISOString()
        });
      }

      const allOnForTwoHours =
        devices.every((device) => device.isOn) &&
        devices.every(
          (device) =>
            this.simulatedNow.getTime() - new Date(device.lastChangedAt).getTime() >= TWO_HOURS_MS
        );

      if (allOnForTwoHours) {
        nextAlerts.push({
          id: `long-running-${roomId}`,
          type: "long-running",
          severity: "warning",
          roomId,
          title: "Unusual continuous usage",
          message: `Every device in ${room.name} has been ON continuously for more than 2 hours.`,
          triggeredAt: this.simulatedNow.toISOString()
        });
      }
    }

    const previousAlerts = new Map(this.activeAlerts.map((alert) => [alert.id, alert]));
    const stableAlerts = nextAlerts.map((alert) => ({
      ...alert,
      triggeredAt: previousAlerts.get(alert.id)?.triggeredAt ?? alert.triggeredAt
    }));
    const previousIds = new Set(previousAlerts.keys());
    const nextIds = new Set(stableAlerts.map((alert) => alert.id));

    stableAlerts
      .filter((alert) => !previousIds.has(alert.id))
      .forEach((alert) => this.addActivity("alert", `${alert.title}: ${alert.message}`));

    this.activeAlerts
      .filter((alert) => !nextIds.has(alert.id))
      .forEach((alert) => this.addActivity("alert", `Resolved: ${alert.title} in ${getRoomDefinition(alert.roomId).name}.`));

    this.activeAlerts = stableAlerts;
  }

  private addActivity(kind: ActivityEvent["kind"], message: string): void {
    this.recentActivity.unshift({
      id: `activity-${this.activitySequence++}`,
      kind,
      message,
      timestamp: this.simulatedNow.toISOString()
    });
    this.recentActivity = this.recentActivity.slice(0, MAX_ACTIVITY);
  }

  private recordPowerPoint(): void {
    this.powerHistory.push({
      timestamp: this.simulatedNow.toISOString(),
      watts: this.devices.reduce((sum, device) => sum + device.currentWatts, 0)
    });
    this.powerHistory = this.powerHistory.slice(-MAX_POWER_POINTS);
  }

  private commit(): OfficeSnapshot {
    this.evaluateAlerts();
    this.sequence += 1;
    this.recordPowerPoint();
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  }
}
