import "dotenv/config";
import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  type ChatInputCommandInteraction
} from "discord.js";
import { io } from "socket.io-client";
import type { OfficeSnapshot, RoomId } from "@altf4/shared";
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
    intents: [GatewayIntentBits.Guilds]
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
        "I can’t reach the live office backend right now. Please check that the PowerDown server is running."
      );
    }
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
      await interaction.editReply(formatStatus(snapshot));
      return;
    case "room": {
      const roomId = interaction.options.getString("name", true) as RoomId;
      await interaction.editReply(formatRoom(snapshot, roomId));
      return;
    }
    case "usage":
      await interaction.editReply(formatUsage(snapshot));
      return;
    default:
      await interaction.editReply("I don’t know that command yet.");
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
          alert.severity === "critical" ? "🚨 **Energy alert**" : "⚠️ **Usage alert**",
          alert.message,
          `Current office load: **${snapshot.totalWatts}W** · ${snapshot.activeDeviceCount}/${snapshot.totalDeviceCount} devices active.`,
          "_Sent automatically from the same live backend as the PowerDown dashboard._"
        ].join("\n")
      );
    }
  });
}

