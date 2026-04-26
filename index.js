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
   ⏳ TIME UTIL
========================= */
function formatTime(ms) {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
}

/* =========================
   ⚔️ BOSS DATABASE (FINAL)
========================= */
const bosses = {

  /* ⏳ INTERVAL BOSSES */
  venatus: { name: "Venatus", type: "interval", hours: 10, location: "Corrupted Basin" },
  viorent: { name: "Viorent", type: "interval", hours: 10, location: "Crescent Lake" },
  ego: { name: "Ego", type: "interval", hours: 10, location: "Ulan Canyon" },

  livera: { name: "Livera", type: "interval", hours: 24, location: "Protector's Ruins" },
  araneo: { name: "Araneo", type: "interval", hours: 24, location: "ToT1" },
  undomiel: { name: "Undomiel", type: "interval", hours: 24, location: "Secret Lab" },

  lady_dalia: { name: "Lady Dalia", type: "interval", hours: 18, location: "Twilight Hill" },

  aquleus: { name: "General Aquleus", type: "interval", hours: 29, location: "ToT2" },
  amentis: { name: "Amentis", type: "interval", hours: 29, location: "LoG" },

  braudmore: { name: "Baron Braudmore", type: "interval", hours: 32, location: "BoT" },
  gareth: { name: "Gareth", type: "interval", hours: 32, location: "DM1" },
  titore: { name: "Titore", type: "interval", hours: 37, location: "DM2" },

  larba: { name: "Larba", type: "interval", hours: 35, location: "RoW" },
  shuliar: { name: "Shuliar", type: "interval", hours: 35, location: "RoW" },
  catena: { name: "Catena", type: "interval", hours: 35, location: "Deadman 3" },
  auraq: { name: "Auraq", type: "interval", hours: 35, location: "Garbana 2" },

  duplican: { name: "Duplican", type: "interval", hours: 48, location: "PoR" },
  wannitas: { name: "Wannitas", type: "interval", hours: 48, location: "PoR" },
  metus: { name: "Metus", type: "interval", hours: 48, location: "PoR" },

  secreta: { name: "Secreta", type: "interval", hours: 62, location: "Silvergrass" },
  ordo: { name: "Ordo", type: "interval", hours: 62, location: "Silvergrass" },
  asta: { name: "Asta", type: "interval", hours: 62, location: "Silvergrass" },
  supore: { name: "Supore", type: "interval", hours: 62, location: "Silvergrass" },

  /* 📅 SCHEDULE BOSSES */
  clemantis: { name: "Clemantis", type: "schedule", location: "Corrupted Basin" },
  saphirus: { name: "Saphirus", type: "schedule", location: "Crescent Lake" },
  neutro: { name: "Neutro", type: "schedule", location: "Desert of Screaming" },
  thymele: { name: "Thymele", type: "schedule", location: "Twilight Hill" },
  milavy: { name: "Milavy", type: "schedule", location: "ToT3" },
  ringor: { name: "Ringor", type: "schedule", location: "BoT" },
  roderick: { name: "Roderick", type: "schedule", location: "Unknown" },
  benji: { name: "Benji", type: "schedule", location: "Barbas" },
  libitina: { name: "Libitina", type: "schedule", location: "Unknown" },
  rakajeth: { name: "Rakajeth", type: "schedule", location: "Dracas" },
  tumier: { name: "Tumier", type: "schedule", location: "Garbana 3F" }
};

/* =========================
   📊 DASHBOARD (SORTED)
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

    /* 📅 SCHEDULE BOSSES (placeholder logic) */
    return {
      text:
        `• **${b.name}**\n📅 Scheduled Boss\n${loc}`,
      sort: 999999999
    };
  });

  list.sort((a, b) => a.sort - b.sort);

  const entries = list.map(x => x.text);

  const chunks = [];
  while (entries.length) {
    chunks.push(entries.splice(0, 10).join('\n\n'));
  }

  const embed = new EmbedBuilder()
    .setTitle('⚔️ RAID BOSS DASHBOARD')
    .setColor(0xf1c40f)
    .setTimestamp();

  chunks.forEach((chunk, i) => {
    embed.addFields({
      name: i === 0 ? '📊 Nearest Spawn Priority' : '\u200b',
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

  if (cmd === '!bosses') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📋 Boss List')
          .setDescription(Object.values(bosses).map(b => `• ${b.name}`).join('\n'))
      ]
    });
  }
});

/* =========================
   🔐 START BOT
========================= */
client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);
