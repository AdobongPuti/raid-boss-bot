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
const ALERT_CHANNEL_ID = 'PUT_CHANNEL_ID_HERE';

/* =========================
   💾 STORAGE
========================= */
let kills = fs.existsSync(DATA_FILE)
  ? JSON.parse(fs.readFileSync(DATA_FILE))
  : {};

let alerted = {};

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(kills, null, 2));
}

/* =========================
   ⏳ TIME HELPERS (NO TIMEZONE LOCK)
========================= */
function formatTime(ms) {
  if (ms <= 0) return "Spawned / Alive";

  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const r = m % 60;

  return h > 0 ? `${h}h ${r}m` : `${r}m`;
}

function formatDate(ts) {
  return new Date(ts).toLocaleString();
}

/* =========================
   📅 SCHEDULE HELPER
========================= */
function getNextScheduleTimestamp(day, time) {
  const now = new Date();
  const [hh, mm] = time.split(':').map(Number);

  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);

  let diff = day - target.getDay();

  if (diff < 0 || (diff === 0 && target < now)) {
    diff += 7;
  }

  target.setDate(target.getDate() + diff);
  return target.getTime();
}

/* =========================
   ⚔️ FULL BOSSES DATABASE
========================= */
const bosses = {

  /* INTERVAL BOSSES */
  venatus: { name: "Venatus", type: "interval", hours: 10, location: "Corrupted Basin" },
  viorent: { name: "Viorent", type: "interval", hours: 10, location: "Crescent Lake" },
  ego: { name: "Ego", type: "interval", hours: 21, location: "Ulan Canyon" },
  lady_dalia: { name: "Lady Dalia", type: "interval", hours: 18, location: "Twilight Hill" },

  livera: { name: "Livera", type: "interval", hours: 24, location: "Protector's Ruins" },
  araneo: { name: "Araneo", type: "interval", hours: 24, location: "ToT 1" },
  undomiel: { name: "Undomiel", type: "interval", hours: 24, location: "Secret Lab" },

  gareth: { name: "Gareth", type: "interval", hours: 32, location: "DM1" },
  braudmore: { name: "Baron Braudmore", type: "interval", hours: 32, location: "BoT" },
  titore: { name: "Titore", type: "interval", hours: 37, location: "DM2" },

  aquleus: { name: "General Aquleus", type: "interval", hours: 29, location: "ToT2" },
  amentis: { name: "Amentis", type: "interval", hours: 29, location: "LoG" },

  shuliar: { name: "Shuliar", type: "interval", hours: 35, location: "RoW" },
  larba: { name: "Larba", type: "interval", hours: 35, location: "RoW" },
  catena: { name: "Catena", type: "interval", hours: 35, location: "DM3" },

  wannitas: { name: "Wannitas", type: "interval", hours: 48, location: "PoR" },
  metus: { name: "Metus", type: "interval", hours: 48, location: "PoR" },
  duplican: { name: "Duplican", type: "interval", hours: 48, location: "PoR" },

  secreta: { name: "Secreta", type: "interval", hours: 62, location: "Silvergrass" },
  ordo: { name: "Ordo", type: "interval", hours: 62, location: "Silvergrass" },
  asta: { name: "Asta", type: "interval", hours: 62, location: "Silvergrass" },
  supore: { name: "Supore", type: "interval", hours: 62, location: "Silvergrass" },

  /* SCHEDULE BOSSES */
  clemantis: {
    name: "Clemantis",
    type: "schedule",
    location: "Corrupted Basin",
    schedule: [
      { day: 1, time: "11:30" },
      { day: 4, time: "19:00" }
    ]
  },

  saphirus: {
    name: "Saphirus",
    type: "schedule",
    location: "Crescent Lake",
    schedule: [
      { day: 0, time: "17:00" },
      { day: 2, time: "11:30" }
    ]
  },

  neutro: {
    name: "Neutro",
    type: "schedule",
    location: "Desert of Screaming",
    schedule: [
      { day: 2, time: "19:00" },
      { day: 4, time: "11:30" }
    ]
  },

  thymele: {
    name: "Thymele",
    type: "schedule",
    location: "Twilight Hill",
    schedule: [
      { day: 1, time: "19:00" },
      { day: 3, time: "11:30" }
    ]
  },

  milavy: { name: "Milavy", type: "schedule", location: "TOT3", schedule: [{ day: 6, time: "15:00" }] },
  ringor: { name: "Ringor", type: "schedule", location: "BoT", schedule: [{ day: 6, time: "17:00" }] },
  roderick: { name: "Roderick", type: "schedule", location: "Unknown", schedule: [{ day: 5, time: "19:00" }] },

  auraq: {
    name: "Auraq",
    type: "schedule",
    location: "RoW",
    schedule: [
      { day: 3, time: "21:00" },
      { day: 5, time: "22:00" }
    ]
  },

  benji: { name: "Benji", type: "schedule", location: "Barbas", schedule: [{ day: 0, time: "21:00" }] },

  libitina: {
    name: "Libitina",
    type: "schedule",
    location: "Unknown",
    schedule: [
      { day: 1, time: "21:00" },
      { day: 6, time: "21:00" }
    ]
  },

  rakajeth: {
    name: "Rakajeth",
    type: "schedule",
    location: "Dracas",
    schedule: [
      { day: 2, time: "22:00" },
      { day: 0, time: "19:00" }
    ]
  },

  tumier: { name: "Tumier", type: "schedule", location: "Garbana 3F", schedule: [{ day: 0, time: "19:00" }] }
};

/* =========================
   🔁 ALIASES
========================= */
const aliases = {
  dalia: "lady_dalia",
  braud: "braudmore",
  venauts: "venatus"
};

/* =========================
   📊 DASHBOARD (FIXED)
========================= */
function buildDashboard() {
  const now = Date.now();

  const intervalList = [];
  const scheduleList = [];

  Object.entries(bosses).forEach(([key, b]) => {
    let nextSpawn;

    if (b.type === "interval") {
      if (!kills[key]) {
        intervalList.push({
          name: b.name,
          text: `🟢 Alive\n📍 ${b.location}`,
          sort: -1
        });
        return;
      }

      nextSpawn = kills[key] + b.hours * 3600000;

      intervalList.push({
        name: b.name,
        text:
          `⏳ ${formatTime(nextSpawn - now)}\n` +
          `📅 ${formatDate(nextSpawn)}\n` +
          `📍 ${b.location}`,
        sort: nextSpawn - now
      });

    } else {
      nextSpawn = Math.min(...b.schedule.map(s => getNextScheduleTimestamp(s.day, s.time)));

      scheduleList.push({
        name: b.name,
        text:
          `⏳ ${formatTime(nextSpawn - now)}\n` +
          `📅 ${formatDate(nextSpawn)}\n` +
          `📍 ${b.location}`,
        sort: nextSpawn - now
      });
    }
  });

  intervalList.sort((a, b) => a.sort - b.sort);
  scheduleList.sort((a, b) => a.sort - b.sort);

  const format = (arr) =>
    arr.slice(0, 10).map(x => `**${x.name}**\n${x.text}`).join("\n\n");

  return new EmbedBuilder()
    .setTitle("⚔️ RAID DASHBOARD")
    .setColor(0xf1c40f)
    .addFields(
      { name: "⏱️ Interval Bosses", value: format(intervalList) || "No data", inline: true },
      { name: "📅 Scheduled Bosses", value: format(scheduleList) || "No data", inline: true }
    )
    .setTimestamp();
}

/* =========================
   🚀 COMMANDS
========================= */
client.on('messageCreate', message => {
  if (message.author.bot) return;

  const args = message.content.trim().split(/\s+/);
  const cmd = args[0].toLowerCase();
  const bossKey = aliases[args[1]?.toLowerCase()] || args[1]?.toLowerCase();

  if (cmd === '!dashboard')
    return message.reply({ embeds: [buildDashboard()] });

  if (cmd === '!dead') {
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');
    kills[bossKey] = Date.now();
    saveData();
    return message.reply(`🟥 ${bosses[bossKey].name} marked dead.`);
  }

  if (cmd === '!alive') {
    delete kills[bossKey];
    saveData();
    return message.reply(`🟢 ${bosses[bossKey].name} is alive.`);
  }

  if (cmd === '!setdead') {
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');

    const input = args[2];
    if (!input) return message.reply('❌ Usage: !setdead <boss> <minutes | HH:MM>');

    let killTime;

    if (!isNaN(input)) {
      killTime = Date.now() - input * 60000;
    } else if (input.includes(':')) {
      const [hh, mm] = input.split(':').map(Number);
      const now = new Date();
      const target = new Date(now);
      target.setHours(hh, mm, 0, 0);
      if (target > now) target.setDate(target.getDate() - 1);
      killTime = target.getTime();
    } else {
      return message.reply('❌ Invalid format.');
    }

    kills[bossKey] = killTime;
    saveData();

    return message.reply(
      `🕒 **${bosses[bossKey].name} updated**\n📅 ${formatDate(killTime)}`
    );
  }

  if (cmd === '!reset') {
    kills = {};
    alerted = {};
    saveData();
    return message.reply('🧹 Reset complete.');
  }
});

/* =========================
   🔐 START BOT
========================= */
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(checkAlerts, 60000);
});

client.login(process.env.TOKEN);
