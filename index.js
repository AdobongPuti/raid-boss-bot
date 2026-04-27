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
   ⏳ TIME HELPERS
========================= */
function formatTime(ms) {
  if (ms <= 0) return "Spawned / Alive";

  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const r = m % 60;

  return h > 0 ? `${h}h ${r}m` : `${r}m`;
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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
   ⚔️ BOSSES DATABASE
========================= */
const bosses = {

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
  supore: { name: "Supore", type: "interval", hours: 62, location: "Silvergrass" }
};

/* =========================
   🔁 ALIASES (fix typo help)
========================= */
const aliases = {
  dalia: "lady_dalia",
  braud: "braudmore",
  venauts: "venatus" // 👈 fixes your typo issue
};

/* =========================
   🚀 SAFE COMMAND PARSING
========================= */
client.on('messageCreate', message => {
  if (message.author.bot) return;

  const args = message.content.trim().split(/\s+/);
  const cmd = args[0].toLowerCase();
  let bossKey = aliases[args[1]] || args[1];

  /* =========================
     ⚔️ !SETDEAD FIXED
  ========================= */
  if (cmd === '!setdead') {
    if (!bossKey) return message.reply('❌ Usage: !setdead <boss> <minutes | HH:MM>');
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');

    const input = args[2];
    if (!input) return message.reply('❌ Usage: !setdead <boss> <minutes | HH:MM>');

    let killTime;

    // CASE 1: MINUTES AGO
    if (!isNaN(input)) {
      killTime = Date.now() - parseInt(input) * 60000;
    }

    // CASE 2: HH:MM
    else if (input.includes(':')) {
      const [hh, mm] = input.split(':').map(Number);

      const now = new Date();
      const target = new Date(now);

      target.setHours(hh, mm, 0, 0);

      if (target > now) {
        target.setDate(target.getDate() - 1);
      }

      killTime = target.getTime();
    }

    else {
      return message.reply('❌ Invalid format. Use minutes or HH:MM');
    }

    kills[bossKey] = killTime;
    saveData();

    return message.reply(
      `🕒 ${bosses[bossKey].name} updated.\n📅 ${formatDate(killTime)}`
    );
  }

  /* =========================
     BASIC COMMANDS
  ========================= */
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

  if (cmd === '!reset') {
    kills = {};
    alerted = {};
    saveData();
    return message.reply('🧹 All interval boss data has been reset.');
  }
});

/* =========================
   🔐 START BOT (FIXED)
========================= */
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(checkAlerts, 60000);
});

client.login(process.env.TOKEN);
