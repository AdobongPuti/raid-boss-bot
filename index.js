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
   💾 DATA STORAGE
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
   ⚔️ FULL BOSS LIST
========================= */
const bosses = {

  /* 🔵 10H BOSSES */
  venatus: { name: "Venatus", hours: 10, location: "Corrupted Basin" },
  viorent: { name: "Viorent", hours: 10, location: "Crescent Lake" },
  ego: { name: "Ego", hours: 10, location: "Ulan Canyon" },

  /* 🟡 18H */
  dalia: { name: "Lady Dalia", hours: 18, location: "Twilight Hill" },

  /* 🔵 24H */
  livera: { name: "Livera", hours: 24, location: "Protector's Ruins" },
  araneo: { name: "Araneo", hours: 24, location: "TOT1" },
  undomiel: { name: "Undomiel", hours: 24, location: "Secret Lab" },
  titore: { name: "Titore", hours: 24, location: "DM2" },

  /* 🟠 29–32H */
  aquleus: { name: "General Aquleus", hours: 29, location: "TOT2" },
  amentis: { name: "Amentis", hours: 29, location: "LOG" },

  gareth: { name: "Gareth", hours: 32, location: "DM1" },
  braudmore: { name: "Baron Braudmore", hours: 32, location: "BoT" },
  ringor: { name: "Ringor", hours: 32, location: "BoT" },

  shuliar: { name: "Shuliar", hours: 35, location: "RoW" },
  larba: { name: "Larba", hours: 35, location: "RoW" },

  catena: { name: "Catena", hours: 35, location: "Deadman 3" },
  auraq: { name: "Auraq", hours: 35, location: "Garbana 2" },
  tumier: { name: "Tumier", hours: 37, location: "Garbana 3" },

  /* 🔴 48H */
  metus: { name: "Metus", hours: 48, location: "PoR" },
  wannitas: { name: "Wannitas", hours: 48, location: "PoR" },
  duplican: { name: "Duplican", hours: 48, location: "PoR" },

  /* ⚫ 62H */
  secreta: { name: "Secreta", hours: 62, location: "Silvergrass" },
  ordo: { name: "Ordo", hours: 62, location: "Silvergrass" },
  asta: { name: "Asta", hours: 62, location: "Silvergrass" },
  supore: { name: "Supore", hours: 62, location: "Silvergrass" },

  /* 📅 SCHEDULE BOSSES (NO TIMER LOGIC YET) */
  clemantis: { name: "Clemantis", schedule: true, location: "Corrupted Basin" },
  saphirus: { name: "Saphirus", schedule: true, location: "Crescent Lake" },
  neutro: { name: "Neutro", schedule: true, location: "Desert of Screaming" },
  thymele: { name: "Thymele", schedule: true, location: "Twilight Hill" },
  milavy: { name: "Milavy", schedule: true, location: "TOT3" },
  roderick: { name: "Roderick", schedule: true, location: "Garbana 1" },
  benji: { name: "Benji", schedule: true, location: "Barbas" },
  libitina: { name: "Libitina", schedule: true, location: "Unknown" },
  rakajeth: { name: "Rakajeth", schedule: true, location: "Dracas" },
  tumier_fixed: { name: "Tumier", schedule: true, location: "Garbana 3F" }
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

          if (b.schedule) {
            return `• **${b.name}** — 📅 Scheduled Boss\n📍 ${b.location}`;
          }

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
    const boss = bosses[key];

    if (boss.schedule) continue;
    if (!kills[key]) continue;

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
    if (bosses[bossKey].schedule) return message.reply('📅 Scheduled boss cannot use timer system.');

    kills[bossKey] = Date.now();
    saveData();

    return message.reply(`🟥 ${bosses[bossKey].name} marked as dead.`);
  }

  /* 🟢 !alive */
  if (cmd === '!alive') {
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');

    delete kills[bossKey];
    saveData();

    return message.reply(`🟢 ${bosses[bossKey].name} is now ALIVE.`);
  }

  /* 🕒 !setdead */
  if (cmd === '!setdead') {
    const minutesAgo = parseInt(args[2]);

    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');
    if (bosses[bossKey].schedule) return message.reply('📅 Scheduled boss not supported.');

    if (isNaN(minutesAgo))
      return message.reply('❌ Usage: !setdead <boss> <minutes_ago>');

    kills[bossKey] = Date.now() - minutesAgo * 60000;
    saveData();

    return message.reply(`🕒 ${bosses[bossKey].name} set ${minutesAgo} min ago.`);
  }

  /* ⏰ !next */
  if (cmd === '!next') {
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');
    if (bosses[bossKey].schedule) return message.reply('📅 Scheduled boss.');

    if (!kills[bossKey]) return message.reply('⚠️ No record.');

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
          .map(b => `• ${b.name} ${b.schedule ? '(Scheduled)' : `(${b.hours}h)`}`)
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
