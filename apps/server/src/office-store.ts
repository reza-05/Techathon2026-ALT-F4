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
const START_TIME = "2026-07-04T09:00:00+06:00";
const OFFICE_START_HOUR = 9;
const OFFICE_END_HOUR = 17;
const AFTER_HOURS_END_HOUR = 21;
const SIMULATED_MINUTES_PER_TICK = 10;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const MAX_ACTIVITY = 8;
const MAX_POWER_POINTS = 20;

type StoreListener = (snapshot: OfficeSnapshot) => void;

export class OfficeStore {
  private simulatedNow = new Date(START_TIME);
  private devices: Device[] = [];
  private scenario: ScenarioId = "normal";
  private sequence = 1;
  private todayEnergyKwh = 0;
  private activeAlerts: OfficeAlert[] = [];
  private recentActivity: ActivityEvent[] = [];
  private powerHistory: PowerPoint[] = [];
  private listeners = new Set<StoreListener>();
  private activitySequence = 1;
  private afterHoursLeakInjected = false;
  private manualOverrides = new Map<string, boolean>();

  constructor() {
    this.resetNormalDay();
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
      simulatedTime: this.formatSimulatedTime(this.simulatedNow),
      isAfterHours: this.isAfterHours(this.simulatedNow),
      scenario: this.scenario,
      devices: this.devices.map((device) => ({ ...device })),
      rooms,
      activeDeviceCount: this.devices.filter((device) => device.status === "on").length,
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
    const nextIsOn = device.status !== "on";
    this.setDeviceState(device, nextIsOn);
    this.manualOverrides.set(device.id, nextIsOn);
    this.addActivity(
      "device",
      `${getRoomDefinition(device.roomId).name} ${device.name} turned ${device.status}.`
    );
    return this.commit();
  }

  applyScenario(scenario: ScenarioId): OfficeSnapshot {
    this.scenario = scenario;
    this.todayEnergyKwh = 0;
    this.manualOverrides.clear();

    switch (scenario) {
      case "normal":
        this.resetNormalDay();
        break;
      case "after-hours":
        this.devices = createInitialDevices(this.simulatedNow.toISOString());
        this.simulatedNow = new Date("2026-07-04T20:30:00+06:00");
        this.turnAllOff();
        this.setRoomPattern("work-2", ["fan", "light"]);
        break;
      case "long-running": {
        this.devices = createInitialDevices(this.simulatedNow.toISOString());
        this.simulatedNow = new Date("2026-07-04T14:45:00+06:00");
        this.turnAllOff();
        const startedAt = new Date(this.simulatedNow.getTime() - TWO_HOURS_MS - 30 * 60 * 1000);
        this.devices
          .filter((device) => device.roomId === "work-1")
          .forEach((device) => this.setDeviceState(device, true, startedAt));
        break;
      }
      case "all-off":
        this.devices = createInitialDevices(this.simulatedNow.toISOString());
        this.simulatedNow = new Date("2026-07-04T18:10:00+06:00");
        this.turnAllOff();
        break;
    }

    this.addActivity("scenario", `Simulation changed to ${scenario.replace("-", " ")} mode.`);
    return this.commit();
  }

  runAutomaticStep(): OfficeSnapshot {
    if (this.scenario !== "normal") {
      this.advanceTime(SIMULATED_MINUTES_PER_TICK);
      return this.commit();
    }

    this.advanceNormalClock();
    this.applyNormalOfficeBehavior();
    return this.commit();
  }

  private resetNormalDay(): void {
    this.simulatedNow = new Date(START_TIME);
    this.devices = createInitialDevices(this.simulatedNow.toISOString());
    this.todayEnergyKwh = 0;
    this.afterHoursLeakInjected = false;
    this.manualOverrides.clear();
    this.applyNormalOfficeBehavior(true);
  }

  private advanceNormalClock(): void {
    const currentHour = this.getDhakaHour(this.simulatedNow);

    if (currentHour >= AFTER_HOURS_END_HOUR || currentHour < OFFICE_START_HOUR) {
      const nextStart = new Date(this.simulatedNow);
      if (currentHour >= AFTER_HOURS_END_HOUR) {
        nextStart.setDate(nextStart.getDate() + 1);
      }
      nextStart.setHours(OFFICE_START_HOUR, 0, 0, 0);
      this.simulatedNow = nextStart;
      this.todayEnergyKwh = 0;
      this.afterHoursLeakInjected = false;
      return;
    }

    this.advanceTime(SIMULATED_MINUTES_PER_TICK);
  }

  private applyNormalOfficeBehavior(reset = false): void {
    const isAfterHours = this.isAfterHours(this.simulatedNow);

    if (isAfterHours) {
      if (!this.afterHoursLeakInjected) {
        this.turnAllOff();
        this.setDeviceState(this.findDevice("work-2-fan-2"), true, this.simulatedNow);
        this.setDeviceState(this.findDevice("work-2-light-1"), true, this.simulatedNow);
        this.afterHoursLeakInjected = true;
        if (!reset) {
          this.addActivity("system", "Office hours ended. Leak watch is now active.");
          this.addActivity("device", "Work Room 2 still has devices running after closing time.");
        }
      }
      return;
    }

    this.afterHoursLeakInjected = false;

    const previousStates = new Map(this.devices.map((device) => [device.id, device.status]));
    const minuteOfDay = this.getDhakaMinuteOfDay(this.simulatedNow);
    const guestCycle = Math.floor((minuteOfDay - OFFICE_START_HOUR * 60) / 50) % 2 === 0;

    this.devices.forEach((device) => {
      const manualOverride = this.manualOverrides.get(device.id);
      const nextState = manualOverride ?? this.resolveNormalDeviceState(device, guestCycle);
      this.setDeviceState(device, nextState, this.simulatedNow);
    });

    if (!reset) {
      const changedCount = this.devices.filter(
        (device) => previousStates.get(device.id) !== device.status
      ).length;
      if (changedCount > 0) {
        const activeDevices = this.devices.filter((device) => device.status === "on").length;
        this.addActivity(
          "device",
          `Normal office activity updated: ${activeDevices} devices active across ${this.countActiveRooms()} rooms.`
        );
      }
    }
  }

  private resolveNormalDeviceState(device: Device, drawingOccupied: boolean): boolean {
    const hour = this.getDhakaHour(this.simulatedNow);

    if (device.roomId === "drawing") {
      if (!drawingOccupied) {
        return device.name === "Light 1";
      }
      return device.name === "Fan 1" || device.name === "Light 1" || device.name === "Light 2";
    }

    if (device.roomId === "work-1") {
      if (device.type === "fan") {
        return true;
      }
      if (device.name === "Light 3") {
        return hour < 11 || hour >= 15;
      }
      return true;
    }

    if (device.type === "fan") {
      return true;
    }
    if (device.name === "Light 3") {
      return hour >= 10 && hour < 15;
    }
    if (device.name === "Light 2") {
      return hour < 13 || hour >= 16;
    }
    return true;
  }

  private buildRoomSummaries(): RoomSummary[] {
    return ROOMS.map((room) => {
      const devices = this.devices.filter((device) => device.roomId === room.id);
      return {
        id: room.id,
        name: room.name,
        activeDevices: devices.filter((device) => device.status === "on").length,
        totalDevices: devices.length,
        activeFans: devices.filter((device) => device.type === "fan" && device.status === "on").length,
        activeLights: devices.filter((device) => device.type === "light" && device.status === "on").length,
        currentWatts: devices.reduce((sum, device) => sum + device.powerDraw, 0)
      };
    });
  }

  private setRoomPattern(roomId: RoomId, activeTypes: Array<"fan" | "light">): void {
    const remaining = [...activeTypes];
    this.devices
      .filter((device) => device.roomId === roomId)
      .forEach((device) => {
        const index = remaining.indexOf(device.type);
        const shouldBeOn = index >= 0;
        if (shouldBeOn) {
          remaining.splice(index, 1);
        }
        this.setDeviceState(device, shouldBeOn, this.simulatedNow);
      });
  }

  private turnAllOff(): void {
    this.devices.forEach((device) => this.setDeviceState(device, false, this.simulatedNow));
  }

  private findDevice(deviceId: string): Device {
    const device = this.devices.find((candidate) => candidate.id === deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }
    return device;
  }

  private countActiveRooms(): number {
    return new Set(
      this.devices.filter((device) => device.status === "on").map((device) => device.roomId)
    ).size;
  }

  private setDeviceState(device: Device, isOn: boolean, changedAt = this.simulatedNow): void {
    const nextStatus = isOn ? "on" : "off";
    if (device.status === nextStatus) {
      return;
    }

    device.status = nextStatus;
    device.isOn = isOn;
    device.powerDraw = isOn ? device.ratedWatts : 0;
    device.currentWatts = device.powerDraw;
    device.lastChanged = changedAt.toISOString();
    device.lastChangedAt = device.lastChanged;
  }

  private advanceTime(minutes: number): void {
    const totalWatts = this.devices.reduce((sum, device) => sum + device.powerDraw, 0);
    this.todayEnergyKwh += (totalWatts * (minutes / 60)) / 1000;
    this.simulatedNow = new Date(this.simulatedNow.getTime() + minutes * 60 * 1000);
  }

  private evaluateAlerts(): void {
    const nextAlerts: OfficeAlert[] = [];
    const afterHours = this.isAfterHours(this.simulatedNow);

    for (const roomId of ROOM_IDS) {
      const room = getRoomDefinition(roomId);
      const devices = this.devices.filter((device) => device.roomId === roomId);
      const activeDevices = devices.filter((device) => device.status === "on");

      if (afterHours && activeDevices.length > 0) {
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
        devices.every((device) => device.status === "on") &&
        devices.every(
          (device) =>
            this.simulatedNow.getTime() - new Date(device.lastChanged).getTime() >= TWO_HOURS_MS
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
      .forEach((alert) =>
        this.addActivity("alert", `Resolved: ${alert.title} in ${getRoomDefinition(alert.roomId).name}.`)
      );

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
      watts: this.devices.reduce((sum, device) => sum + device.powerDraw, 0)
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

  private getDhakaHour(at: Date): number {
    return Number(
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: "Asia/Dhaka"
      }).format(at)
    );
  }

  private getDhakaMinuteOfDay(at: Date): number {
    const hour = this.getDhakaHour(at);
    const minute = Number(
      new Intl.DateTimeFormat("en-GB", {
        minute: "2-digit",
        timeZone: "Asia/Dhaka"
      }).format(at)
    );
    return hour * 60 + minute;
  }

  private isAfterHours(at: Date): boolean {
    const hour = this.getDhakaHour(at);
    return hour >= OFFICE_END_HOUR || hour < OFFICE_START_HOUR;
  }

  private formatSimulatedTime(at: Date): string {
    return at.toLocaleTimeString("en-BD", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Dhaka"
    });
  }
}
