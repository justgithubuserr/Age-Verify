const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder().setName('age').setDescription('Verify your age to access the server'),
  new SlashCommandBuilder().setName('age-panel').setDescription('(Admin) Post the age verification panel here'),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log('✅ Commands registered!');
  } catch (err) {
    console.error(err);
  }
})();
