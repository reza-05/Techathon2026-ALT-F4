import { REST, Routes, SlashCommandBuilder } from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show a live status summary for the entire office"),
  new SlashCommandBuilder()
    .setName("room")
    .setDescription("Check every light and fan in one room")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("The room to inspect")
        .setRequired(true)
        .addChoices(
          { name: "Drawing Room", value: "drawing" },
          { name: "Work Room 1", value: "work-1" },
          { name: "Work Room 2", value: "work-2" }
        )
    ),
  new SlashCommandBuilder()
    .setName("usage")
    .setDescription("Show live watts, today’s energy use and estimated cost")
].map((command) => command.toJSON());

export async function registerCommands(
  token: string,
  clientId: string,
  guildId?: string
): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(token);
  const route = guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId);

  await rest.put(route, { body: commands });
  console.log(`Registered ${commands.length} Discord commands ${guildId ? "for the demo server" : "globally"}.`);
}

