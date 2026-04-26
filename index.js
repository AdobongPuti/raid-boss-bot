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

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(kills, null, 2));
}

/* =========================
   ⏳ TIME HELPERS
========================= */
function formatTime(ms) {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const rh = h % 24;
  const rm = m % 60;

  if (d > 0) return `${d}d ${rh}h ${rm}m`;
  if (h > 0) return `${h}h ${rm}m`;
  return `${m}m`;
}

/* =========================
   📅 SCHEDULE ENGINE (GMT+8)
========================= */
const DAY_MS = 86400000;

// Convert weekday + HH:MM → next timestamp
function getNextScheduleTimestamp(day, time) {
  const now = new Date();

  // convert to PH time (assume server already GMT+8 or ignore offset)
  const [hh, mm] = time.split(':').map(Number);

  const result = new Date(now);
  result.setHours(hh, mm, 0, 0);

  const currentDay = result.getDay();
  let diff = day - currentDay;

  if (diff < 0 || (diff === 0 && result.getTime() < now.getTime())) {
    diff += 7;
  }

  result.setDate(result.getDate() + diff);

  return result.getTime();
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
    schedule: [
      { day: 1, time: "11:30" },
      { day: 4, time: "19:00" }
    ],
    location: "Corrupted Basin"
  },

  saphirus: {
    name: "Saphirus",
    type: "schedule",
    schedule: [
      { day: 0, time: "17:00" },
      { day: 2, time: "11:30" }
    ],
    location: "Crescent Lake"
  },

  neutro: {
    name: "Neutro",
    type: "schedule",
    schedule: [
      { day: 2, time: "19:00" },
      { day: 4, time: "11:30" }
    ],
    location: "Desert of Screaming"
  },

  thymele: {
    name: "Thymele",
    type: "schedule",
    schedule: [
      { day: 1, time: "19:00" },
      { day: 3, time: "11:30" }
    ],
    location: "Twilight Hill"
  },

  milavy: {
    name: "Milavy",
    type: "schedule",
    schedule: [{ day: 6, time: "15:00" }],
    location: "ToT3"
  },

  ringor: {
    name: "Ringor",
    type: "schedule",
    schedule: [{ day: 6, time: "17:00" }],
    location: "BoT"
  },

  benji: {
    name: "Benji",
    type: "schedule",
    schedule: [{ day: 0, time: "21:00" }],
    location: "Barbas"
  }
};

/* =========================
   📊 DASHBOARD (FULL SCHEDULE + INTERVAL)
========================= */
function buildDashboard() {
  const now = Date.now();

  const list = Object.entries(bosses).map(([key, b]) => {

    const loc = `Location: ${b.location}`;

    /* 🟢 ALIVE */
    if (!kills[key]) {
      return {
        text: `• **${b.name}**\n🟢 Alive\n${loc}`,
        sort: Infinity
      };
    }

    /* ⏳ INTERVAL BOSSES */
    if (b.type === "interval") {
      const respawn = kills[key] + b.hours * 3600000;
      const diff = respawn - now;

      if (diff > 0) {
        return {
          text:
            `• **${b.name}**\n` +
            `🔴 Spawns in: ${formatTime(diff)}\n` +
            `${loc}`,
          sort: diff
        };
      }

      return {
        text: `• **${b.name}**\n🟢 Ready\n${loc}`,
        sort: 0
      };
    }

    /* 📅 SCHEDULE BOSSES (NEW FULL SYSTEM) */
    if (b.type === "schedule") {

      let nextSpawn = Math.min(
        ...b.schedule.map(s => getNextScheduleTimestamp(s.day, s.time))
      );

      const diff = nextSpawn - now;

      return {
        text:
          `• **${b.name}**\n` +
          `📅 Next Spawn: <t:${Math.floor(nextSpawn / 1000)}:F>\n` +
          `⏳ In: ${formatTime(diff)}\n` +
          `${loc}`,
        sort: diff
      };
    }
  });

  list.sort((a, b) => a.sort - b.sort);

  const entries = list.map(x => x.text);

  const chunks = [];
  while (entries.length) {
    chunks.push(entries.splice(0, 10).join('\n\n'));
  }

  const embed = new EmbedBuilder()
    .setTitle('⚔️ RAID BOSS DASHBOARD (FULL SCHEDULE SYSTEM)')
    .setColor(0xf1c40f)
    .setTimestamp();

  chunks.forEach((chunk, i) => {
    embed.addFields({
      name: i === 0 ? '📊 Next Spawn Priority' : '\u200b',
      value: chunk
    });
  });

  return embed;
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
});

client.login(process.env.TOKEN);
