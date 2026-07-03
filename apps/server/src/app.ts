import cors from "cors";
import express from "express";
import { ROOM_IDS, type RoomId, type ScenarioId } from "@altf4/shared";
import { OfficeStore } from "./office-store.js";

const SCENARIOS: ScenarioId[] = ["normal", "after-hours", "long-running", "all-off"];

export function createApp(store: OfficeStore) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "powerdown-api" });
  });

  app.get("/api/snapshot", (_request, response) => {
    response.json(store.getSnapshot());
  });

  app.get("/api/devices", (_request, response) => {
    response.json(store.getSnapshot().devices);
  });

  app.get("/api/rooms/:roomId", (request, response) => {
    const roomId = request.params.roomId as RoomId;
    if (!ROOM_IDS.includes(roomId)) {
      response.status(404).json({ error: "Room not found" });
      return;
    }
    response.json(store.getRoom(roomId));
  });

  app.get("/api/usage", (_request, response) => {
    const snapshot = store.getSnapshot();
    response.json({
      totalWatts: snapshot.totalWatts,
      todayEnergyKwh: snapshot.todayEnergyKwh,
      estimatedCostBdt: snapshot.estimatedCostBdt,
      rooms: snapshot.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        currentWatts: room.currentWatts
      }))
    });
  });

  app.get("/api/alerts", (_request, response) => {
    response.json(store.getSnapshot().activeAlerts);
  });

  app.post("/api/devices/:deviceId/toggle", (request, response) => {
    try {
      response.json(store.toggleDevice(request.params.deviceId));
    } catch (error) {
      response.status(404).json({
        error: error instanceof Error ? error.message : "Device not found"
      });
    }
  });

  app.post("/api/simulation/scenarios/:scenarioId", (request, response) => {
    const scenario = request.params.scenarioId as ScenarioId;
    if (!SCENARIOS.includes(scenario)) {
      response.status(400).json({ error: "Unknown scenario" });
      return;
    }
    response.json(store.applyScenario(scenario));
  });

  return app;
}

