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

let kills = fs.existsSync(DATA_FILE)
  ? JSON.parse(fs.readFileSync(DATA_FILE))
  : {};

let alerted = {}; // prevents duplicate alerts

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
   ⚔️ BOSSES DATABASE
========================= */
const bosses = {
  venatus: { name: "Venatus", type: "interval", hours: 10, location: "Corrupted Basin" },
  viorent: { name: "Viorent", type: "interval", hours: 10, location: "Crescent Lake" },
  ego: { name: "Ego", type: "interval", hours: 10, location: "Ulan Canyon" },

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

  benji: {
    name: "Benji",
    type: "schedule",
    location: "Barbas",
    schedule: [{ day: 0, time: "21:00" }]
  }
};

/* =========================
   🔔 ALERT SYSTEM (+ @HERE)
========================= */
function checkAlerts() {
  const now = Date.now();

  Object.entries(bosses).forEach(([key, b]) => {

    if (!kills[key]) return;

    let nextSpawn;

    if (b.type === "interval") {
      nextSpawn = kills[key] + b.hours * 3600000;
    }

    if (b.type === "schedule") {
      const times = b.schedule.map(s => getNextScheduleTimestamp(s.day, s.time));
      nextSpawn = Math.min(...times);
    }

    const diff = nextSpawn - now;

    // 🔔 10 MIN BEFORE SPAWN
    if (diff <= 10 * 60000 && diff > 9 * 60000) {

      const alertKey = `${key}_${nextSpawn}`;
      if (alerted[alertKey]) return;

      alerted[alertKey] = true;

      // 🎯 PICK CHANNEL (first text channel bot can see)
      const channel = client.channels.cache
        .filter(c => c.isTextBased())
        .first();

      if (channel) {
        channel.send(
          `@here 🔔 **${b.name}** will spawn in **10 minutes!**\n📍 Location: ${b.location}`
        );
      }
    }

    // cleanup old alerts
    if (diff < -60000) {
      delete alerted[`${key}_${nextSpawn}`];
    }
  });
}

/* =========================
   📊 DASHBOARD (optional kept minimal here)
========================= */
function buildDashboard() {
  const now = Date.now();

  const list = Object.entries(bosses).map(([key, b]) => {

    const loc = `Location: ${b.location}`;

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
      const times = b.schedule.map(s => getNextScheduleTimestamp(s.day, s.time));
      nextSpawn = Math.min(...times);
    }

    const diff = nextSpawn - now;

    return {
      text:
        `• **${b.name}**\n` +
        `⏳ In: ${formatTime(diff)}\n` +
        `${loc}`,
      sort: diff
    };
  });

  list.sort((a, b) => a.sort - b.sort);

  return new EmbedBuilder()
    .setTitle('⚔️ RAID DASHBOARD')
    .setColor(0xf1c40f)
    .setDescription(list.map(x => x.text).join('\n\n'))
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
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');
    kills[bossKey] = Date.now() - mins * 60000;
    saveData();
    return message.reply(`🕒 ${bosses[bossKey].name} set ${mins} min ago.`);
  }
});

/* =========================
   🔐 START BOT
========================= */
client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);

  // 🔔 RUN ALERT CHECK EVERY MINUTE
  setInterval(checkAlerts, 60 * 1000);
});

client.login(process.env.TOKEN);
