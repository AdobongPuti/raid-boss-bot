const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const DATA_FILE = './bossdata.json';

/* =========================
   💾 LOAD / SAVE DATA
========================= */
let kills = fs.existsSync(DATA_FILE)
  ? JSON.parse(fs.readFileSync(DATA_FILE))
  : {};

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(kills, null, 2));
}

/* =========================
   ⏳ TIME FORMAT
========================= */
function formatTime(ms) {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
}

/* =========================
   ⚔️ BOSSES DATABASE
========================= */
const bosses = {
  venatus: { name: "Venatus", hours: 10, location: "Corrupted Basin" },
  viorent: { name: "Viorent", hours: 10, location: "Crescent Lake" },
  ego: { name: "Ego", hours: 10, location: "Ulan Canyon" },

  livera: { name: "Livera", hours: 24, location: "Protector's Ruins" },
  araneo: { name: "Araneo", hours: 24, location: "TOT1" },
  undomiel: { name: "Undomiel", hours: 24, location: "Secret Lab" },

  dalia: { name: "Lady Dalia", hours: 18, location: "Twilight Hill" },
  titore: { name: "Titore", hours: 24, location: "DM2" },

  gareth: { name: "Gareth", hours: 32, location: "DM1" },
  braudmore: { name: "Baron Braudmore", hours: 32, location: "BoT" }
};

/* =========================
   📊 DASHBOARD
========================= */
function buildDashboard() {
  const now = Date.now();

  return new EmbedBuilder()
    .setTitle('⚔️ RAID BOSS DASHBOARD')
    .setColor(0xf1c40f)
    .addFields({
      name: '⏳ Boss Status',
      value: Object.entries(bosses)
        .map(([key, b]) => {
          if (!kills[key]) {
            return `• **${b.name}** — 🟢 Alive\n📍 ${b.location}`;
          }

          const respawn = kills[key] + b.hours * 3600000;
          const diff = respawn - now;

          if (diff > 0) {
            return `• **${b.name}** — 🔴 Respawning in ${formatTime(diff)}\n📍 ${b.location}`;
          }

          return `• **${b.name}** — 🟢 Ready\n📍 ${b.location}`;
        })
        .join('\n')
    })
    .setFooter({ text: 'Raid Boss Tracker System' })
    .setTimestamp();
}

/* =========================
   🔔 10-MIN ALERT SYSTEM
========================= */
setInterval(() => {
  const now = Date.now();

  const channel = client.channels.cache.find(
    c => c.name === '⌛〡fb-spawntime'
  );

  if (!channel) return;

  for (const key in bosses) {
    if (!kills[key]) continue;

    const boss = bosses[key];
    const respawn = kills[key] + boss.hours * 3600000;
    const alertTime = respawn - 10 * 60000;

    if (now >= alertTime && now <= alertTime + 60000) {
      channel.send({
        content: `@here 🔔 ${boss.name} spawning in 10 minutes!\n📍 ${boss.location}`,
        allowedMentions: { parse: ['here'] }
      });
    }
  }
}, 60000);

/* =========================
   🚀 COMMANDS
========================= */
client.on('messageCreate', message => {
  if (message.author.bot) return;

  const args = message.content.toLowerCase().split(' ');
  const cmd = args[0];
  const bossKey = args[1];

  /* ⚔️ !dead */
  if (cmd === '!dead') {
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');

    kills[bossKey] = Date.now();
    saveData();

    return message.reply(`🟥 ${bosses[bossKey].name} marked as dead.`);
  }

  /* 🟢 !alive (reset single boss) */
  if (cmd === '!alive') {
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');

    delete kills[bossKey];
    saveData();

    return message.reply(`🟢 ${bosses[bossKey].name} is now marked ALIVE.`);
  }

  /* 🕒 !setdead <boss> <minutes_ago> */
  if (cmd === '!setdead') {
    const minutesAgo = parseInt(args[2]);

    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');
    if (isNaN(minutesAgo)) return message.reply('❌ Usage: !setdead <boss> <minutes_ago>');

    kills[bossKey] = Date.now() - minutesAgo * 60000;
    saveData();

    return message.reply(
      `🕒 ${bosses[bossKey].name} set as dead ${minutesAgo} minute(s) ago.`
    );
  }

  /* ⏰ !next */
  if (cmd === '!next') {
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');
    if (!kills[bossKey]) return message.reply('⚠️ No record found.');

    const boss = bosses[bossKey];
    const respawn = new Date(kills[bossKey] + boss.hours * 3600000);

    return message.reply(`⏰ Next spawn: ${respawn.toLocaleString()}`);
  }

  /* 📋 !bosses */
  if (cmd === '!bosses') {
    const embed = new EmbedBuilder()
      .setTitle('📋 Boss List')
      .setColor(0x2ecc71)
      .setDescription(
        Object.values(bosses)
          .map(b => `• ${b.name} (${b.hours}h)`)
          .join('\n')
      );

    return message.reply({ embeds: [embed] });
  }

  /* 📊 !dashboard */
  if (cmd === '!dashboard') {
    return message.reply({ embeds: [buildDashboard()] });
  }

  /* 🔄 !reset */
  if (cmd === '!reset') {
    kills = {};
    saveData();
    return message.reply('🔄 All boss data reset.');
  }
});

/* =========================
   🔐 LOGIN
========================= */
client.login(process.env.TOKEN);
