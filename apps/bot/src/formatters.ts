import { getRoomDefinition, type OfficeSnapshot, type RoomId } from "@altf4/shared";

export function formatStatus(snapshot: OfficeSnapshot): string {
  const roomLines = snapshot.rooms.map((room) => {
    if (room.activeDevices === 0) {
      return `  ├─ **${room.name}** · All systems stand by (0W)`;
    }
    return `  ├─ **${room.name}** · ${room.activeLights} Light${room.activeLights === 1 ? "" : "s"}, ${room.activeFans} Fan${room.activeFans === 1 ? "" : "s"} active · **${room.currentWatts}W**`;
  });

  return [
    "🏢 **OFFICE SYSTEM STATUS**",
    "──────────────────────────────",
    ...roomLines,
    "──────────────────────────────",
    `⚡ **Active Devices:** ${snapshot.activeDeviceCount} of ${snapshot.totalDeviceCount} running · **${snapshot.totalWatts}W** total draw`,
    snapshot.activeAlerts.length
      ? `🚨 **Active Alerts:** ${snapshot.activeAlerts.length} issue${snapshot.activeAlerts.length === 1 ? "" : "s"} requiring attention`
      : "🟢 **Monitoring:** All systems operating within normal parameters."
  ].join("\n");
}

export function formatRoom(snapshot: OfficeSnapshot, roomId: RoomId): string {
  const room = snapshot.rooms.find((candidate) => candidate.id === roomId);
  const devices = snapshot.devices.filter((device) => device.roomId === roomId);
  const definition = getRoomDefinition(roomId);

  if (!room) {
    return "❌ **Invalid Query:** Please specify: Drawing Room, Work Room 1, or Work Room 2.";
  }

  const deviceLines = devices.map(
    (device) =>
      `  ${device.isOn ? "🟢" : "⚫"} **${device.name}** · ${device.isOn ? "Active" : "Idle"} · ${device.isOn ? `**${device.currentWatts}W**` : "0W"}`
  );

  return [
    `🚪 **ROOM METRICS · ${definition.name.toUpperCase()}**`,
    `_*${definition.purpose}*_`,
    "──────────────────────────────",
    ...deviceLines,
    "──────────────────────────────",
    `⚡ **Current Room Load:** ${room.currentWatts}W · ${room.activeDevices} of 5 active devices.`
  ].join("\n");
}

export function formatUsage(snapshot: OfficeSnapshot): string {
  const roomLines = snapshot.rooms.map(
    (room) => `  ├─ **${room.name}** · ${room.currentWatts}W`
  );

  return [
    "⚡ **OFFICE ENERGY METRICS BRIEF**",
    "──────────────────────────────",
    `🔋 **Total Real-Time Load:** **${snapshot.totalWatts}W**`,
    ...roomLines,
    "──────────────────────────────",
    `📉 **Today's Consumption:** **${snapshot.todayEnergyKwh.toFixed(2)} kWh**`,
    `💸 **Projected Daily Cost:** **৳${snapshot.estimatedCostBdt.toFixed(2)} BDT**`,
    "──────────────────────────────",
    "_Values synchronized in real-time with the main telemetry dashboard._"
  ].join("\n");
}

