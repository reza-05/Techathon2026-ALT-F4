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
    const snapshot = new OfficeStore().applyScenario("after-hours");

    expect(snapshot.activeAlerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "after-hours-work-2",
          type: "after-hours"
        })
      ])
    );
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
});

