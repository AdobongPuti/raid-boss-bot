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

let alerted = {};

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
   ⚔️ BOSSES DATABASE (FULL UPDATED LIST)
========================= */
const bosses = {

  /* ===== INTERVAL BOSSES ===== */
  venatus: { name: "Venatus", type: "interval", hours: 10, location: "Corrupted Basin" },
  viorent: { name: "Viorent", type: "interval", hours: 10, location: "Crescent Lake" },
  ego: { name: "Ego", type: "interval", hours: 10, location: "Ulan Canyon" },

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

  /* ===== SCHEDULE BOSSES ===== */
  clemantis: {
    name: "Clemantis",
    type: "schedule",
    location: "Corrupted Basin",
    schedule: [
      { day: 1, time: "11:30" }, // Monday
      { day: 4, time: "19:00" }  // Thursday
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

  milavy: {
    name: "Milavy",
    type: "schedule",
    location: "TOT3",
    schedule: [{ day: 6, time: "15:00" }]
  },

  ringor: {
    name: "Ringor",
    type: "schedule",
    location: "BoT",
    schedule: [{ day: 6, time: "17:00" }]
  },

  roderick: {
    name: "Roderick",
    type: "schedule",
    location: "Unknown",
    schedule: [{ day: 5, time: "19:00" }]
  },

  auraq: {
    name: "Auraq",
    type: "schedule",
    location: "RoW",
    schedule: [
      { day: 3, time: "21:00" },
      { day: 5, time: "22:00" }
    ]
  },

  benji: {
    name: "Benji",
    type: "schedule",
    location: "Barbas",
    schedule: [{ day: 0, time: "21:00" }]
  },

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

  tumier: {
    name: "Tumier",
    type: "schedule",
    location: "Garbana 3F",
    schedule: [{ day: 0, time: "19:00" }]
  }

};

/* =========================
   🔔 ALERT SYSTEM
========================= */
function checkAlerts() {
  const now = Date.now();

  Object.entries(bosses).forEach(([key, b]) => {
    if (!kills[key]) return;

    let nextSpawn;

    if (b.type === "interval") {
      nextSpawn = kills[key] + b.hours * 3600000;
    } else {
      nextSpawn = Math.min(...b.schedule.map(s => getNextScheduleTimestamp(s.day, s.time)));
    }

    const diff = nextSpawn - now;

    if (diff <= 10 * 60000 && diff > 9 * 60000) {
      const alertKey = `${key}_${nextSpawn}`;
      if (alerted[alertKey]) return;

      alerted[alertKey] = true;

      const channel = client.channels.cache
        .filter(c => c.isTextBased())
        .first();

      if (channel) {
        channel.send(
          `@here 🔔 **${b.name}** spawns in 10 minutes!\n📍 ${b.location}`
        );
      }
    }

    if (diff < -60000) {
      delete alerted[`${key}_${nextSpawn}`];
    }
  });
}

/* =========================
   📊 DASHBOARD (TOP 25)
========================= */
function buildDashboard() {
  const now = Date.now();

  const list = Object.entries(bosses).map(([key, b]) => {

    const loc = `📍 Location: ${b.location}`;

    if (!kills[key]) {
      return {
        text: `• **${b.name}**\n🟢 Alive\n${loc}`,
        sort: Infinity
      };
    }

    let nextSpawn;

    if (b.type === "interval") {
      nextSpawn = kills[key] + b.hours * 3600000;
    } else {
      nextSpawn = Math.min(...b.schedule.map(s => getNextScheduleTimestamp(s.day, s.time)));
    }

    const diff = nextSpawn - now;
    const spawnDate = new Date(nextSpawn);

    return {
      text:
        `• **${b.name}**\n` +
        `⏳ In: ${formatTime(diff)}\n` +
        `📅 Spawns at: ${spawnDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}\n` +
        `${loc}`,
      sort: diff
    };
  });

  list.sort((a, b) => a.sort - b.sort);

  const top25 = list.slice(0, 25);

  return new EmbedBuilder()
    .setTitle("⚔️ RAID DASHBOARD (TOP 25 NEAREST SPAWNS)")
    .setColor(0xf1c40f)
    .setDescription(top25.map(x => x.text).join("\n\n"))
    .setTimestamp();
}

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

  if (cmd === '!dead') {
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');
    kills[bossKey] = Date.now();
    saveData();
    return message.reply(`🟥 ${bosses[bossKey].name} marked dead.`);
  }

  if (cmd === '!alive') {
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');
    delete kills[bossKey];
    saveData();
    return message.reply(`🟢 ${bosses[bossKey].name} is alive.`);
  }

  if (cmd === '!setdead') {
    const mins = parseInt(args[2]);

    if (!bosses[bossKey]) {
      return message.reply('❌ Boss not found.');
    }

    if (isNaN(mins)) {
      return message.reply('❌ Usage: !setdead <boss> <minutes>');
    }

    kills[bossKey] = Date.now() - mins * 60000;
    saveData();

    return message.reply(`🕒 ${bosses[bossKey].name} set as killed ${mins} min ago.`);
  }
});

/* =========================
   🔐 START BOT
========================= */
client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(checkAlerts, 60 * 1000);
});

client.login(process.env.TOKEN);
