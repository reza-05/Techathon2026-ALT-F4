import "dotenv/config";
import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  Message,
  type ChatInputCommandInteraction
} from "discord.js";
import { io } from "socket.io-client";
import type { OfficeSnapshot, RoomId } from "@altf4/shared";
import { generateAiReply, hasAiRepliesEnabled } from "./ai.js";
import { formatRoom, formatStatus, formatUsage } from "./formatters.js";
import { registerCommands } from "./register-commands.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const alertChannelId = process.env.DISCORD_ALERT_CHANNEL_ID;
const serverApiUrl = process.env.SERVER_API_URL ?? "http://localhost:4000";

if (!token || !clientId) {
  console.log(
    "Discord bot is not configured. Add DISCORD_TOKEN and DISCORD_CLIENT_ID to .env when ready."
  );
} else {
  await startBot(token, clientId);
}

async function startBot(botToken: string, applicationId: string) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  await registerCommands(botToken, applicationId, guildId);

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Discord bot ready as ${readyClient.user.tag}.`);
    connectAlertStream(client);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    await interaction.deferReply();
    try {
      const snapshot = await fetchSnapshot();
      await handleCommand(interaction, snapshot);
    } catch (error) {
      console.error("Discord command failed:", error);
      await interaction.editReply(
        "I can’t reach the live office telemetry feed right now. Please check that the PowerDown mission control is running."
      );
    }
  });

  client.on(Events.MessageCreate, async (message) => {
    await handlePrefixCommand(message);
  });

  await client.login(botToken);
}

async function fetchSnapshot(): Promise<OfficeSnapshot> {
  const response = await fetch(`${serverApiUrl}/api/snapshot`);
  if (!response.ok) {
    throw new Error(`Backend responded with ${response.status}`);
  }
  return response.json() as Promise<OfficeSnapshot>;
}

async function handleCommand(
  interaction: ChatInputCommandInteraction,
  snapshot: OfficeSnapshot
) {
  switch (interaction.commandName) {
    case "status":
      await interaction.editReply(await buildStatusReply(snapshot));
      return;
    case "room": {
      const roomId = interaction.options.getString("name", true) as RoomId;
      await interaction.editReply(await buildRoomReply(snapshot, roomId));
      return;
    }
    case "usage":
      await interaction.editReply(await buildUsageReply(snapshot));
      return;
    default:
      await interaction.editReply("I don’t know that command yet.");
  }
}

async function handlePrefixCommand(message: Message<boolean>) {
  if (message.author.bot) {
    return;
  }

  const content = message.content.trim();
  if (!content.startsWith("!")) {
    return;
  }

  const [command, ...args] = content.split(/\s+/);
  if (!command) {
    return;
  }

  try {
    const snapshot = await fetchSnapshot();

    switch (command.toLowerCase()) {
      case "!status":
        await message.reply(await buildStatusReply(snapshot));
        return;
      case "!usage":
        await message.reply(await buildUsageReply(snapshot));
        return;
      case "!room": {
        const roomId = parseRoomArgument(args.join(" "));
        if (!roomId) {
          await message.reply(
            "Use `!room drawing`, `!room work1`, or `!room work2`."
          );
          return;
        }
        await message.reply(await buildRoomReply(snapshot, roomId));
        return;
      }
      default:
        await message.reply(
          "I know `!status`, `!room <drawing|work1|work2>`, and `!usage`."
        );
    }
  } catch (error) {
    console.error("Discord prefix command failed:", error);
    await message.reply(
      "I can’t reach the live office telemetry feed right now. Please check that the PowerDown mission control is running."
    );
  }
}

function parseRoomArgument(input: string): RoomId | null {
  const normalized = input.toLowerCase().replace(/[^a-z0-9]/g, "");
  switch (normalized) {
    case "drawing":
    case "drawingroom":
      return "drawing";
    case "work1":
    case "workroom1":
      return "work-1";
    case "work2":
    case "workroom2":
      return "work-2";
    default:
      return null;
  }
}

async function buildStatusReply(snapshot: OfficeSnapshot) {
  return buildReply("status", snapshot, () => formatStatus(snapshot));
}

async function buildRoomReply(snapshot: OfficeSnapshot, roomId: RoomId) {
  return buildReply("room", snapshot, () => formatRoom(snapshot, roomId), roomId);
}

async function buildUsageReply(snapshot: OfficeSnapshot) {
  return buildReply("usage", snapshot, () => formatUsage(snapshot));
}

async function buildReply(
  kind: "status" | "room" | "usage",
  snapshot: OfficeSnapshot,
  fallback: () => string,
  roomId?: RoomId
) {
  if (!hasAiRepliesEnabled()) {
    return fallback();
  }

  try {
    return (await generateAiReply(kind, snapshot, roomId)) ?? fallback();
  } catch (error) {
    console.error("OpenAI reply generation failed:", error);
    return fallback();
  }
}

function connectAlertStream(client: Client) {
  if (!alertChannelId) {
    console.log("Proactive Discord alerts are disabled: DISCORD_ALERT_CHANNEL_ID is empty.");
    return;
  }

  const socket = io(serverApiUrl);
  let initialized = false;
  let knownAlertIds = new Set<string>();

  socket.on("snapshot", async (snapshot: OfficeSnapshot) => {
    const currentIds = new Set(snapshot.activeAlerts.map((alert) => alert.id));

    if (!initialized) {
      initialized = true;
      knownAlertIds = currentIds;
      return;
    }

    const newAlerts = snapshot.activeAlerts.filter((alert) => !knownAlertIds.has(alert.id));
    knownAlertIds = currentIds;

    if (newAlerts.length === 0) {
      return;
    }

    const channel = await client.channels.fetch(alertChannelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      console.error("Configured alert channel is not a Discord text channel.");
      return;
    }

    for (const alert of newAlerts) {
      await channel.send(
        [
          alert.severity === "critical" 
            ? "🚨 **CRITICAL MISSION CONTROL ALERT**" 
            : "⚠️ **WARNING MISSION CONTROL ALERT**",
          "──────────────────────────────",
          `📍 **Event:** ${alert.message}`,
          `⚡ **Active Office Load:** **${snapshot.totalWatts}W**`,
          `🔌 **Active Devices:** ${snapshot.activeDeviceCount} of ${snapshot.totalDeviceCount} running`,
          "──────────────────────────────",
          "_*Real-time alert dispatched automatically from Office Mission Control._"
        ].join("\n")
      );
    }
  });
}
