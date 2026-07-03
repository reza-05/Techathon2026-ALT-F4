import { getRoomDefinition, type OfficeSnapshot, type RoomId } from "@altf4/shared";

export function formatStatus(snapshot: OfficeSnapshot): string {
  const roomLines = snapshot.rooms.map((room) => {
    if (room.activeDevices === 0) {
      return `• **${room.name}:** everything is off`;
    }
    return `• **${room.name}:** ${room.activeFans} fan${room.activeFans === 1 ? "" : "s"} and ${room.activeLights} light${room.activeLights === 1 ? "" : "s"} on`;
  });

  return [
    "🏢 **Here’s the live office check:**",
    ...roomLines,
    "",
    `⚡ ${snapshot.activeDeviceCount}/${snapshot.totalDeviceCount} devices are active, drawing **${snapshot.totalWatts}W** in total.`,
    snapshot.activeAlerts.length
      ? `⚠️ I’m also watching ${snapshot.activeAlerts.length} active alert${snapshot.activeAlerts.length === 1 ? "" : "s"}.`
      : "✅ No unusual usage detected right now."
  ].join("\n");
}

export function formatRoom(snapshot: OfficeSnapshot, roomId: RoomId): string {
  const room = snapshot.rooms.find((candidate) => candidate.id === roomId);
  const devices = snapshot.devices.filter((device) => device.roomId === roomId);
  const definition = getRoomDefinition(roomId);

  if (!room) {
    return "I couldn’t find that room. Try Drawing Room, Work Room 1, or Work Room 2.";
  }

  const deviceLines = devices.map(
    (device) =>
      `${device.isOn ? "🟢" : "⚫"} ${device.name}: **${device.isOn ? "ON" : "OFF"}**${device.isOn ? ` · ${device.currentWatts}W` : ""}`
  );

  return [
    `🚪 **${definition.name}** · ${definition.purpose}`,
    ...deviceLines,
    "",
    `Right now this room is drawing **${room.currentWatts}W** with ${room.activeDevices}/5 devices active.`
  ].join("\n");
}

export function formatUsage(snapshot: OfficeSnapshot): string {
  const roomLines = snapshot.rooms.map(
    (room) => `• ${room.name}: **${room.currentWatts}W**`
  );

  return [
    "⚡ **Live energy brief:**",
    `The office is drawing **${snapshot.totalWatts}W** right now.`,
    ...roomLines,
    "",
    `Today’s integrated usage is **${snapshot.todayEnergyKwh.toFixed(2)} kWh** (about **৳${snapshot.estimatedCostBdt.toFixed(2)}**).`,
    "These figures come from the same live backend as the dashboard."
  ].join("\n");
}

