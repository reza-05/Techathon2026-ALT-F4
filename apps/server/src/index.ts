import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { OfficeStore } from "./office-store.js";

const port = Number(process.env.PORT ?? 4000);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const allowedOrigins = Array.from(
  new Set([webOrigin, "http://localhost:5173", "http://127.0.0.1:5173"])
);
const store = new OfficeStore();
const app = createApp(store);
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  socket.emit("snapshot", store.getSnapshot());
});

store.subscribe((snapshot) => {
  io.emit("snapshot", snapshot);
});

const simulationTimer = setInterval(() => {
  store.runAutomaticStep();
}, 1_000);

// Automatic Keep-Alive pulse to keep Render free tier server awake 24/7
const keepAliveTarget = process.env.RENDER_EXTERNAL_URL ?? "https://techathon2026-alt-f4.onrender.com";
const keepAliveTimer = setInterval(() => {
  if (keepAliveTarget) {
    fetch(`${keepAliveTarget}/health`)
      .then(() => console.log(`[Keep-Alive Pulse] Pinged ${keepAliveTarget}/health`))
      .catch(() => {});
  }
}, 5 * 60 * 1000); // 5-minute interval pulse

httpServer.listen(port, () => {
  console.log(`PowerDown API listening on http://localhost:${port}`);
});

function shutdown() {
  clearInterval(simulationTimer);
  clearInterval(keepAliveTimer);
  io.close();
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
