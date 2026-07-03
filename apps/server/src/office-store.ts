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
const OFFICE_START_HOUR = 9;
const OFFICE_END_HOUR = 17;
const NORMAL_STEP_MINUTES = 10;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const MAX_ACTIVITY = 8;
const MAX_POWER_POINTS = 20;
const ROOM_USAGE_WEIGHT: Record<RoomId, number> = {
  drawing: 0.62,
  "work-1": 1,
  "work-2": 0.9
};

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
  private drawingRoomOccupied = true;
  private drawingRoomOccupancyTimer = 60;
  private hasProcessedClosing = false;

  constructor() {
    this.runNormalSimulation(true);
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
        this.runNormalSimulation(true);
        break;
      case "after-hours":
        this.simulatedNow = new Date("2026-07-04T20:30:00+06:00");
        this.todayEnergyKwh = 0;
        this.turnAllOff();
        this.setRoomPattern("work-2", ["fan", "fan", "light", "light", "light"]);
        break;
      case "long-running": {
        this.simulatedNow = new Date("2026-07-04T14:45:00+06:00");
        this.todayEnergyKwh = 0;
        this.turnAllOff();
        const startedAt = new Date(this.simulatedNow.getTime() - TWO_HOURS_MS - 30 * 60 * 1000);
        this.devices
          .filter((device) => device.roomId === "work-1")
          .forEach((device) => this.setDeviceState(device, true, startedAt));
        break;
      }
      case "all-off":
        this.simulatedNow = new Date("2026-07-04T18:10:00+06:00");
        this.todayEnergyKwh = 0;
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

    this.runNormalSimulation();
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

  private runNormalSimulation(reset = false): void {
    if (reset) {
      this.simulatedNow = new Date(START_TIME);
      this.todayEnergyKwh = 0;
      this.devices = createInitialDevices(this.simulatedNow.toISOString());
      this.drawingRoomOccupied = true;
      this.drawingRoomOccupancyTimer = 60;
      this.hasProcessedClosing = false;
      this.devices.forEach((device) => {
        if (device.roomId === "work-1" || device.roomId === "work-2") {
          const isOn = device.name !== "Light 3";
          this.setDeviceState(device, isOn, this.simulatedNow);
        } else if (device.roomId === "drawing") {
          const isOn = device.name === "Fan 1" || device.name === "Light 1";
          this.setDeviceState(device, isOn, this.simulatedNow);
        }
      });
      return;
    }

    const previousTime = new Date(this.simulatedNow);
    this.advanceNormalClock();
    const currentTime = this.simulatedNow;

    const prevDhaka = this.getDhakaTime(previousTime);
    const currDhaka = this.getDhakaTime(currentTime);

    const wasBeforeClose = prevDhaka.hour < OFFICE_END_HOUR;
    const isAtOrAfterClose = currDhaka.hour >= OFFICE_END_HOUR && currDhaka.hour < 21;

    let changedCount = 0;

    if (wasBeforeClose && isAtOrAfterClose) {
      this.hasProcessedClosing = true;
      this.addActivity("system", "Office hours ended. Employees leaving the office.");

      const hasLeak = Math.random() < 0.20;
      
      this.devices.forEach((device) => {
        if (hasLeak && device.roomId === "work-2" && device.name === "Fan 2") {
          this.setDeviceState(device, true, this.simulatedNow);
          this.addActivity("device", "Work Room 2 Fan 2 was left running after hours.");
          changedCount++;
        } else if (hasLeak && device.roomId === "work-2" && device.name === "Light 1") {
          this.setDeviceState(device, true, this.simulatedNow);
          this.addActivity("device", "Work Room 2 Light 1 was left on after hours.");
          changedCount++;
        } else {
          if (device.isOn) {
            this.setDeviceState(device, false, this.simulatedNow);
            changedCount++;
          }
        }
      });
    } else if (currDhaka.hour >= OFFICE_START_HOUR && currDhaka.hour < OFFICE_END_HOUR) {
      this.hasProcessedClosing = false;

      this.drawingRoomOccupancyTimer -= NORMAL_STEP_MINUTES;
      if (this.drawingRoomOccupancyTimer <= 0) {
        this.drawingRoomOccupied = !this.drawingRoomOccupied;
        this.drawingRoomOccupancyTimer = 40 + Math.floor(Math.random() * 9) * 10;
        this.addActivity(
          "system",
          this.drawingRoomOccupied ? "Guests arrived in the Drawing Room." : "Drawing Room guests left."
        );
      }

      this.devices.forEach((device) => {
        if (device.roomId === "drawing") {
          if (this.drawingRoomOccupied) {
            const targetState = device.name === "Fan 1" || device.name === "Light 1" || device.name === "Light 2";
            if (device.isOn !== targetState) {
              this.setDeviceState(device, targetState, this.simulatedNow);
              changedCount++;
            }
          } else {
            const targetState = device.name === "Light 1";
            if (device.isOn !== targetState) {
              this.setDeviceState(device, targetState, this.simulatedNow);
              changedCount++;
            }
          }
        } else {
          if (device.type === "light" && (device.name === "Light 2" || device.name === "Light 3")) {
            if (Math.random() < 0.05) {
              const nextState = !device.isOn;
              this.setDeviceState(device, nextState, this.simulatedNow);
              this.addActivity(
                "device",
                `${getRoomDefinition(device.roomId).name} ${device.name} was turned ${nextState ? "ON" : "OFF"} by employees.`
              );
              changedCount++;
            }
          } else {
            const targetState = device.name !== "Light 3";
            if (device.isOn !== targetState) {
              this.setDeviceState(device, targetState, this.simulatedNow);
              changedCount++;
            }
          }
        }
      });
    }

    if (changedCount > 0) {
      const activeDevices = this.devices.filter((d) => d.isOn).length;
      this.addActivity(
        "device",
        `Normal office activity updated: ${activeDevices} devices active across ${this.countActiveRooms()} rooms.`
      );
    }
  }

  private advanceNormalClock(): void {
    const dhaka = this.getDhakaTime(this.simulatedNow);
    
    if (dhaka.hour >= 21 || dhaka.hour < OFFICE_START_HOUR) {
      const nextStart = new Date(this.simulatedNow);
      if (dhaka.hour >= 21) {
        nextStart.setDate(nextStart.getDate() + 1);
      }
      nextStart.setHours(OFFICE_START_HOUR, 0, 0, 0);
      this.simulatedNow = nextStart;
      this.todayEnergyKwh = 0;
      return;
    }

    this.advanceTime(NORMAL_STEP_MINUTES);
  }

  private getDhakaTime(at: Date): { hour: number; minute: number } {
    const hourStr = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Dhaka"
    }).format(at);
    const minuteStr = new Intl.DateTimeFormat("en-GB", {
      minute: "2-digit",
      timeZone: "Asia/Dhaka"
    }).format(at);
    return { hour: Number(hourStr), minute: Number(minuteStr) };
  }

  private countActiveRooms(): number {
    return new Set(
      this.devices.filter((device) => device.isOn).map((device) => device.roomId)
    ).size;
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
    const isAfterHours = hour >= OFFICE_END_HOUR || hour < OFFICE_START_HOUR;

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
