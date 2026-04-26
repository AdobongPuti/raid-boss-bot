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
   💾 STORAGE
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

  dalia: { name: "Lady Dalia", hours: 18, location: "Twilight Hill" },

  livera: { name: "Livera", hours: 24, location: "Protector's Ruins" },
  araneo: { name: "Araneo", hours: 24, location: "ToT1" },
  undomiel: { name: "Undomiel", hours: 24, location: "Secret Lab" },
  titore: { name: "Titore", hours: 24, location: "DM2" },

  aquleus: { name: "General Aquleus", hours: 29, location: "ToT2" },
  amentis: { name: "Amentis", hours: 29, location: "LoG" },

  gareth: { name: "Gareth", hours: 32, location: "DM1" },
  braudmore: { name: "Baron Braudmore", hours: 32, location: "BoT" },
  ringor: { name: "Ringor", hours: 32, location: "BoT" },

  shuliar: { name: "Shuliar", hours: 35, location: "RoW" },
  larba: { name: "Larba", hours: 35, location: "RoW" },

  catena: { name: "Catena", hours: 35, location: "DM3" },
  auraq: { name: "Auraq", hours: 35, location: "Garbana 2" },
  tumier: { name: "Tumier", hours: 37, location: "Garbana 3F" },

  metus: { name: "Metus", hours: 48, location: "PoR" },
  wannitas: { name: "Wannitas", hours: 48, location: "PoR" },
  duplican: { name: "Duplican", hours: 48, location: "PoR" },

  secreta: { name: "Secreta", hours: 62, location: "Silvergrass" },
  ordo: { name: "Ordo", hours: 62, location: "Silvergrass" },
  asta: { name: "Asta", hours: 62, location: "Silvergrass" },
  supore: { name: "Supore", hours: 62, location: "Silvergrass" },

  clemantis: { name: "Clemantis", schedule: true, location: "Corrupted Basin" },
  saphirus: { name: "Saphirus", schedule: true, location: "Crescent Lake" },
  neutro: { name: "Neutro", schedule: true, location: "Desert of Screaming" },
  thymele: { name: "Thymele", schedule: true, location: "Twilight Hill" },
  milavy: { name: "Milavy", schedule: true, location: "ToT3" },
  roderick: { name: "Roderick", schedule: true, location: "Garbana 1" },
  benji: { name: "Benji", schedule: true, location: "Barbas" },
  libitina: { name: "Libitina", schedule: true, location: "Unknown" },
  rakajeth: { name: "Rakajeth", schedule: true, location: "Dracas" },
  tumier_fixed: { name: "Tumier", schedule: true, location: "Garbana 3F" },
  nevaeh: { name: "Nevaeh", schedule: true, location: "Kransia" }
};

/* =========================
   🔥 FULL TODAY SEED SYSTEM
========================= */
function seedTodaysKills() {

  const data = {
    /* 🌅 EARLY MORNING */
    ego: 0,
    dalia: 15,

    gareth: 273,
    braudmore: 278,

    titore: 448,

    venatus: 516,
    viorent: 516,

    aquleus: 579,
    amentis: 585,

    /* 🌞 MIDDAY */
    undomiel: 743,
    livera: 743,
    araneo: 743,

    /* 🌇 AFTERNOON */
    saphirus: 1020,

    /* 🌆 EVENING */
    tumier: 1140,
    rakajeth: 1140,

    /* 🌙 NIGHT */
    benji: 1260,
    nevaeh: 1320
  };

  const now = Date.now();

  for (const key in data) {
    if (bosses[key]) {
      kills[key] = now - data[key] * 60000;
    }
  }

  saveData();
}

/* =========================
   📊 DASHBOARD (FIXED)
========================= */
function buildDashboard() {
  const now = Date.now();

  const entries = Object.entries(bosses).map(([key, b]) => {

    if (b.schedule) {
      return `• **${b.name}** — 📅 Scheduled\n📍 ${b.location}`;
    }

    if (!kills[key]) {
      return `• **${b.name}** — 🟢 Alive\n📍 ${b.location}`;
    }

    const respawn = kills[key] + b.hours * 3600000;
    const diff = respawn - now;

    if (diff > 0) {
      return `• **${b.name}** — 🔴 ${formatTime(diff)}\n📍 ${b.location}`;
    }

    return `• **${b.name}** — 🟢 Ready\n📍 ${b.location}`;
  });

  const chunks = [];
  while (entries.length) {
    chunks.push(entries.splice(0, 10).join('\n'));
  }

  const embed = new EmbedBuilder()
    .setTitle('⚔️ RAID BOSS DASHBOARD')
    .setColor(0xf1c40f)
    .setTimestamp();

  chunks.forEach((chunk, i) => {
    embed.addFields({
      name: i === 0 ? '⏳ Boss Status' : '\u200b',
      value: chunk
    });
  });

  return embed;
}

/* =========================
   🔔 ALERT SYSTEM
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

  if (cmd === '!dashboard') {
    return message.reply({ embeds: [buildDashboard()] });
  }
});

/* =========================
   🔐 START BOT
========================= */
client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);

  seedTodaysKills(); // 🔥 LOAD FULL DAILY TIMELINE
});

client.login(process.env.TOKEN);
