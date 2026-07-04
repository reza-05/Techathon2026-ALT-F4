# 🏢 PowerDown

### **Real-Time Office Energy Digital Twin & Telemetry Monitor**
*Built with passion by **Team ALT+F4** for the Techathon Nationals 2026.*

PowerDown offers a unified, real-time telemetry dashboard and automated alerts for a modern small office workspace. By synchronizing every device state, power reading, and alert lifecycle through a single central telemetry server, it guarantees that web clients, Discord bots, and automated monitors always display identical, matching figures.

> 📝 **Official Correction Note:** The simulated office consists of exactly 3 rooms × (2 fans + 3 lights) = **15 devices total**. Stale references to 18 devices inside the original PDF specifications are confirmed arithmetic errors, rectified in the organizer's follow-up corrections.

---

## 🗺️ System Architecture

Our central telemetry server handles the single source of truth for the office. Web and chat services query and listen to this server to synchronize their views.

```text
                     ┌───────────────────────────────────┐
                     │     PowerDown Telemetry Server    │
                     │  (Express API + Socket.IO Stream) │
                     └─────────────────┬─────────────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                ▼                      ▼                      ▼
    ┌──────────────────────┐ ┌──────────────────┐ ┌──────────────────────┐
    │  Real-Time Web App   │ │  Discord Bot     │ │    Wokwi Hardware    │
    │  (React / Light UI)  │ │  (!status/Alert) │ │  (ESP32 + Relays RX) │
    └──────────────────────┘ └──────────────────┘ └──────────────────────┘
```

---

## 🔄 System Flow Diagrams

### **User Device Toggle & Alert Dispatch Cycles**

```mermaid
sequenceDiagram
    autonumber
    actor Boss as The Boss / Operator
    participant Web as Web Dashboard
    participant Server as Telemetry Server
    participant DBot as Discord Telemetry Bot
    participant DC as Discord Alert Channel

    %% Toggle Flow
    Note over Boss,Server: User Device Toggle Flow
    Boss->>Web: Clicks toggle switch on floorplan
    Web->>Server: POST /api/devices/:id/toggle
    Server->>Server: Update device status & recalculate load
    Server-->>Web: Broadcast updated "snapshot" (Socket.IO)
    Web-->>Web: Re-render UI & recalculate power consumption

    %% Alert Flow
    Note over Server,DC: Alert Evaluator & Discord Dispatch Flow
    Server->>Server: Run periodic evaluator checks
    alt Alert Condition Met (e.g., Active devices after 5 PM)
        Server->>Server: Create timestamped alert object (active: true)
        Server-->>Web: Broadcast updated "snapshot" (Socket.IO)
        Web-->>Web: Shift dashboard UI into alert state (glowing red alerts)
        Server->>DBot: Push new alert event (Socket.IO stream)
        DBot->>DC: Send premium alert message (🚨 CRITICAL MISSION CONTROL ALERT)
    end
```

---

## ⚡ Tech Stack

| Layer | Technologies |
|:---|:---|
| **Frontend Dashboard** | React 18, Vite, Vanilla CSS, TypeScript |
| **Telemetry Server** | Node.js, Express, Socket.IO, TypeScript |
| **Notifications Bot** | Discord.js v14 |
| **Validation & Tests** | TypeScript, Vitest, Supertest |
| **Hardware Emulation** | ESP32 Microcontroller, Wokwi IoT Simulator |
| **Monorepo Engine** | PNPM Workspaces |

---

## 📂 Repository Structure

```text
apps/
  ├── web/         # React real-time telemetry dashboard (Locked in Light Mode)
  ├── server/      # Express API, Socket.IO, and background simulation engine
  └── bot/         # Discord bot listener and proactive channel dispatcher
packages/
  └── shared/      # Shared TypeScript interfaces, rooms/devices seeding schema
hardware/
  └── wokwi/       # ESP32 sketch firmware and SPDT relay-isolated circuit diagrams
```

---

## 🚀 Setup & Installation

### **Prerequisites**
- **Node.js** v22.12 or newer
- **PNPM** v9 or newer

### **Quick Start**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/reza-05/Techathon2026-ALT-F4.git
   cd Techathon2026-ALT-F4
   ```

2. **Install Workspace Dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   *(Open `.env` in your editor to add any optional Discord bot credentials or OpenAI keys if desired).*

4. **Launch the Telemetry Suite**
   - **Full Stack (Server + Web + Bot):**
     ```bash
     pnpm dev
     ```
   - **Core Only (Server + Web, bypasses Discord Bot):**
     ```bash
     pnpm dev:core
     ```

5. **Access the Telemetry Feeds**
   - Live Dashboard: `http://localhost:5173`
   - REST API Telemetry: `http://localhost:4000`

---

## 📡 API Endpoints

Our server exposes clean REST endpoints to view and toggle telemetry states:

| Method | Endpoint | Purpose |
|:---|:---|:---|
| `GET` | `/health` | Server health check |
| `GET` | `/api/snapshot` | Complete versioned building state snapshot |
| `GET` | `/api/devices` | State list of all 15 office devices |
| `GET` | `/api/rooms/:roomId` | Specified room details and its 5 devices |
| `GET` | `/api/usage` | Aggregated office and per-room power consumption |
| `GET` | `/api/alerts` | Current active alerts (timestamped) |
| `POST` | `/api/devices/:deviceId/toggle` | Toggle device state (simulating physical switches) |
| `POST` | `/api/simulation/scenarios/:scenarioId` | Switch active operating scenario |

---

## 🤖 Discord Integration

Our Discord telemetry bot responds to both prefix commands (`!`) and modern Slash Commands (`/`).

### **Setup Instructions**
1. Register a bot application on the [Discord Developer Portal](https://discord.com/developers/applications).
2. Enable **Message Content Intent** (under Bot tab) to support prefix commands.
3. Invite the bot to your guild using the `applications.commands` and `bot` URL generator scopes.
4. Set the credentials in your local `.env` variables:
   - `DISCORD_TOKEN`: Bot token
   - `DISCORD_CLIENT_ID`: Application client ID
   - `DISCORD_GUILD_ID`: Target server ID (registers Slash commands instantly)
   - `DISCORD_ALERT_CHANNEL_ID`: Channel where critical event warnings will be pushed

### **Available Chat Commands**
- `/status` or `!status`: Real-time report of active rooms and device counts.
- `/usage` or `!usage`: Power breakdown, today's integrated consumption (kWh), and cost estimate in BDT.
- `/room <name>` or `!room <name>`: In-depth check of individual room devices and power draw.

---

## ⚙️ Operating Scenarios

You can toggle between different operating states on the dashboard to test the alerts:

1. **Office Open (`NORMAL_DAY`):** 9 AM - 5 PM simulated hours. Random employee activity turns devices ON and OFF.
2. **After-Hours Leak (`AFTER_HOURS_LEAK`):** Office is closed, but devices are intentionally left active, triggering an immediate alert.
3. **2-Hour Anomaly (`TWO_HOUR_ANOMALY`):** Triggers a critical warning when all devices in a room remain active for over two continuous hours.
4. **Closed Idle (`CLOSED_IDLE`):** Office is closed and all devices are turned off. The system enters idle monitoring.

---

## 🛠️ Hardware Simulation

The [`hardware/wokwi`](hardware/wokwi) directory models a single-room deployment:
- **`sketch.ino`**: ESP32 C++ firmware reading physical SPDT inputs, managing relay triggers, calculating wattage, and transmitting structured telemetry payload over Serial JSON.
- **`diagram.json`**: Hardware wiring blueprint showing ESP32 connections with relay channels, input switches, and power loads.

---

## 🧪 Testing & Code Quality

Verify codebase type safety, logic criteria, and test assertions:

```bash
# Run TypeScript compilation check
pnpm typecheck

# Run Vitest unit tests (alert timestamp validation, power logic, timezone checks)
pnpm test

# Run production compilation build
pnpm build
```

---

## 👥 The Team

Designed and developed by **Team ALT+F4**:
- **Reza** ([github.com/reza-05](https://github.com/reza-05))
