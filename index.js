const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages]
});

const AGE_GROUPS = [
  { id: 'under12',   label: 'Under 12', roleName: 'Under 12', style: ButtonStyle.Secondary, color: 0x95a5a6 },
  { id: 'age12plus', label: '12+',      roleName: '12+',      style: ButtonStyle.Primary,   color: 0x3498db },
  { id: 'age15plus', label: '15+',      roleName: '15+',      style: ButtonStyle.Primary,   color: 0x2ecc71 },
  { id: 'age16plus', label: '16+',      roleName: '16+',      style: ButtonStyle.Success,   color: 0xe67e22 },
  { id: 'age18plus', label: '18+',      roleName: '18+',      style: ButtonStyle.Danger,    color: 0xe74c3c },
];

const ALL_AGE_ROLE_NAMES = AGE_GROUPS.map(g => g.roleName);

async function getOrCreateRole(guild, group) {
  let role = guild.roles.cache.find(r => r.name === group.roleName);
  if (!role) role = await guild.roles.create({ name: group.roleName, color: group.color, reason: 'Age bot' });
  return role;
}

async function getOrCreateUsersRole(guild) {
  let role = guild.roles.cache.find(r => r.name === 'Users');
  if (!role) role = await guild.roles.create({ name: 'Users', color: 0x57f287, reason: 'Age bot' });
  return role;
}

function buildPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🔐 Age Verification')
    .setDescription('Pick your age group to get access to the server.\n\n> ⚠️ Be honest — this keeps younger members safe!')
    .setColor(0x5865f2)
    .addFields(
      { name: '🧒 Under 12', value: 'Kid-friendly channels only', inline: true },
      { name: '👦 12+',      value: 'General channels',           inline: true },
      { name: '🧑 15+',      value: '15+ channels unlocked',      inline: true },
      { name: '🧑 16+',      value: '16+ channels unlocked',      inline: true },
      { name: '🔞 18+',      value: 'All channels unlocked',      inline: true },
    )
    .setFooter({ text: 'You can only pick once. Ask a mod to change it.' });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('under12').setLabel('🧒 Under 12').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('age12plus').setLabel('👦 12+').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('age15plus').setLabel('🧑 15+').setStyle(ButtonStyle.Primary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('age16plus').setLabel('🧑 16+').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('age18plus').setLabel('🔞 18+').setStyle(ButtonStyle.Danger),
  );
  return { embed, components: [row1, row2] };
}

client.on(Events.InteractionCreate, async interaction => {

  if (interaction.isChatInputCommand() && interaction.commandName === 'age') {
    const already = ALL_AGE_ROLE_NAMES.some(n => interaction.member.roles.cache.find(r => r.name === n));
    if (already) return interaction.reply({ content: '✅ You are already verified! Ask a mod to change your age group.', ephemeral: true });
    const { embed, components } = buildPanel();
    return interaction.reply({ embeds: [embed], components, ephemeral: true });
  }

  if (interaction.isChatInputCommand() && interaction.commandName === 'age-panel') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
      return interaction.reply({ content: '❌ You need Manage Roles permission.', ephemeral: true });
    const { embed, components } = buildPanel();
    await interaction.channel.send({ embeds: [embed], components });
    return interaction.reply({ content: '✅ Panel posted!', ephemeral: true });
  }

  if (interaction.isButton()) {
    const group = AGE_GROUPS.find(g => g.id === interaction.customId);
    if (!group) return;
    await interaction.deferReply({ ephemeral: true });
    const { guild, member } = interaction;
    const already = ALL_AGE_ROLE_NAMES.some(n => member.roles.cache.find(r => r.name === n));
    if (already) return interaction.editReply({ content: '⚠️ Already verified! Ask a mod to change your age group.' });
    try {
      const fresh = await guild.members.fetch(member.id);
      const ageRole = await getOrCreateRole(guild, group);
      const usersRole = await getOrCreateUsersRole(guild);
      await fresh.roles.add(ageRole);
      await fresh.roles.add(usersRole);
      const embed = new EmbedBuilder()
        .setTitle('✅ Verified!')
        .setDescription(`You are now **${group.label}** and have been given the **Users** role. Welcome! 🎉`)
        .setColor(group.color);
      await interaction.editReply({ embeds: [embed] });
      const log = guild.channels.cache.find(c => ['verify-log','age-log','mod-log'].includes(c.name));
      if (log) log.send({ embeds: [ new EmbedBuilder().setDescription(`<@${fresh.id}> verified as **${group.label}**`).setColor(group.color).setTimestamp() ] });
    } catch (err) {
      console.error(err);
      interaction.editReply({ content: '❌ Error assigning role. Make sure the bot role is above age roles in Server Settings → Roles.' });
    }
  }
});

client.once(Events.ClientReady, () => console.log(`✅ Logged in as ${client.user.tag}`));
client.login(process.env.DISCORD_TOKEN);
