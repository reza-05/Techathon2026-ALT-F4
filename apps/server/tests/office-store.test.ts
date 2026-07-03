import { describe, expect, it } from "vitest";
import { OfficeStore } from "../src/office-store.js";

describe("OfficeStore", () => {
  it("models exactly 15 devices across three rooms", () => {
    const snapshot = new OfficeStore().getSnapshot();

    expect(snapshot.totalDeviceCount).toBe(15);
    expect(snapshot.rooms).toHaveLength(3);
    expect(snapshot.rooms.every((room) => room.totalDevices === 5)).toBe(true);
  });

  it("calculates watts from the actual active device states", () => {
    const snapshot = new OfficeStore().getSnapshot();
    const calculatedWatts = snapshot.devices.reduce(
      (total, device) => total + (device.isOn ? device.ratedWatts : 0),
      0
    );

    expect(snapshot.totalWatts).toBe(calculatedWatts);
  });

  it("detects an after-hours alert using the shared live state", () => {
    const store = new OfficeStore();
    const snapshot = store.applyScenario("after-hours");

    expect(snapshot.activeAlerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "after-hours-work-2",
          type: "after-hours"
        })
      ])
    );

    const triggeredAt = snapshot.activeAlerts[0]?.triggeredAt;
    const laterSnapshot = store.runAutomaticStep();
    expect(laterSnapshot.activeAlerts[0]?.triggeredAt).toBe(triggeredAt);
  });

  it("detects a room running continuously for more than two hours", () => {
    const snapshot = new OfficeStore().applyScenario("long-running");

    expect(snapshot.activeAlerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "long-running-work-1",
          type: "long-running"
        })
      ])
    );
  });

  it("keeps activity ids unique when several alerts trigger at once", () => {
    const snapshot = new OfficeStore().applyScenario("after-hours");
    const ids = snapshot.recentActivity.map((event) => event.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the normal simulator inside office hours", () => {
    const store = new OfficeStore();

    for (let index = 0; index < 8; index += 1) {
      const snapshot = store.runAutomaticStep();
      const hour = new Date(snapshot.simulatedNow).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: "Asia/Dhaka"
      });

      expect(Number(hour)).toBeGreaterThanOrEqual(9);
      expect(Number(hour)).toBeLessThan(17);
      expect(snapshot.activeAlerts).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            type: "after-hours"
          })
        ])
      );
    }
  });

  it("advances normal simulation time forward even after the last frame", () => {
    const store = new OfficeStore();
    let previousTime = new Date(store.getSnapshot().simulatedNow).getTime();

    for (let index = 0; index < 10; index += 1) {
      const snapshot = store.runAutomaticStep();
      const currentTime = new Date(snapshot.simulatedNow).getTime();

      expect(currentTime).toBeGreaterThan(previousTime);
      previousTime = currentTime;
    }
  });

  it("resets scenario energy totals when changing demo modes", () => {
    const store = new OfficeStore();
    store.runAutomaticStep();
    const snapshot = store.applyScenario("after-hours");

    expect(snapshot.todayEnergyKwh).toBe(0);
  });
});
