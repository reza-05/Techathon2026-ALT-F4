import { getRoomDefinition, type OfficeSnapshot, type RoomId } from "@altf4/shared";

const openAiApiKey = process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_MODEL ?? "gpt-5.5";

type ReplyKind = "status" | "room" | "usage";

export function hasAiRepliesEnabled() {
  return Boolean(openAiApiKey);
}

export async function generateAiReply(
  kind: ReplyKind,
  snapshot: OfficeSnapshot,
  roomId?: RoomId
): Promise<string | null> {
  if (!openAiApiKey) {
    return null;
  }

  const room = roomId ? snapshot.rooms.find((candidate) => candidate.id === roomId) : null;
  const roomDevices = roomId
    ? snapshot.devices.filter((device) => device.roomId === roomId)
    : [];

  const prompt = [
    `Mode: ${kind}`,
    `Simulated time: ${snapshot.simulatedNow}`,
    `Total load: ${snapshot.totalWatts}W`,
    `Active devices: ${snapshot.activeDeviceCount}/${snapshot.totalDeviceCount}`,
    `Active alerts: ${snapshot.activeAlerts.length}`,
    `Rooms: ${snapshot.rooms.map((item) => `${item.name}=${item.currentWatts}W/${item.activeDevices} active`).join("; ")}`
  ];

  if (room && roomId) {
    prompt.push(
      `Requested room: ${getRoomDefinition(roomId).name}`,
      `Room devices: ${roomDevices
        .map(
          (device) =>
            `${device.name}=${device.isOn ? `ON ${device.currentWatts}W` : "OFF"}`
        )
        .join("; ")}`
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiApiKey}`
    },
    body: JSON.stringify({
      model: openAiModel,
      instructions:
        "You are PowerDown, an office energy assistant for a hackathon demo. Reply in plain text for Discord, keep it warm and human, use the supplied numbers exactly, do not invent data, and keep the answer under 120 words.",
      input: prompt.join("\n")
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API responded with ${response.status}`);
  }

  const payload = (await response.json()) as { output_text?: string };
  return payload.output_text?.trim() || null;
}
