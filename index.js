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
   💾 PERSISTENT STORAGE
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
  venatus: { name: "Venatus", hours: 10, location: "Corrupted Basin", spawnTime: "08:36 AM" },
  viorent: { name: "Viorent", hours: 10, location: "Crescent Lake", spawnTime: "08:36 AM" },
  ego: { name: "Ego", hours: 10, location: "Ulan Canyon", spawnTime: "12:33 AM" },

  dalia: { name: "Lady Dalia", hours: 18, location: "Twilight Hill", spawnTime: "12:48 AM" },

  gareth: { name: "Gareth", hours: 32, location: "DM1", spawnTime: "04:33 AM" },
  braudmore: { name: "Baron Braudmore", hours: 32, location: "BoT", spawnTime: "04:38 AM" },

  titore: { name: "Titore", hours: 24, location: "DM2", spawnTime: "07:28 AM" },

  aquleus: { name: "General Aquleus", hours: 29, location: "ToT2", spawnTime: "09:39 AM" },
  amentis: { name: "Amentis", hours: 29, location: "LoG", spawnTime: "09:45 AM" },

  undomiel: { name: "Undomiel", hours: 24, location: "Secret Lab", spawnTime: "12:23 PM" },
  livera: { name: "Livera", hours: 24, location: "Protector's Ruins", spawnTime: "12:23 PM" },
  araneo: { name: "Araneo", hours: 24, location: "ToT1", spawnTime: "12:23 PM" },

  saphirus: { name: "Saphirus", hours: 24, location: "Crescent Lake", spawnTime: "05:00 PM" },

  tumier: { name: "Tumier", hours: 37, location: "Garbana 3F", spawnTime: "07:00 PM" },
  rakajeth: { name: "Rakajeth", hours: 24, location: "Dracas", spawnTime: "07:00 PM" },

  benji: { name: "Benji", hours: 24, location: "Barbas", spawnTime: "09:00 PM" },

  nevaeh: { name: "Nevaeh", hours: 24, location: "Kransia", spawnTime: "10:00 PM" }
};

/* =========================
   🔥 TODAY SEED (KILLS)
========================= */
function seedTodaysKills() {
  const data = {
    ego: 0,
    dalia: 15,
    gareth: 273,
    braudmore: 278,
    titore: 448,
    venatus: 516,
    viorent: 516,
    aquleus: 579,
    amentis: 585,
    undomiel: 743,
    livera: 743,
    araneo: 743
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

    if (!kills[key]) {
      return `• **${b.name}**
🟢 Spawn: ${b.spawnTime || "Unknown"}
🟢 Alive
📍 ${b.location}`;
    }

    const respawn = kills[key] + b.hours * 3600000;
    const diff = respawn - now;

    return `• **${b.name}**
🟢 Spawn: ${b.spawnTime || "Unknown"}
${diff > 0 ? `🔴 ${formatTime(diff)}` : "🟢 Ready"}
📍 ${b.location}`;
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
   🚀 COMMANDS
========================= */
client.on('messageCreate', message => {
  if (message.author.bot) return;

  const args = message.content.toLowerCase().split(' ');
  const cmd = args[0];
  const bossKey = args[1];

  /* 📊 DASHBOARD */
  if (cmd === '!dashboard') {
    return message.reply({ embeds: [buildDashboard()] });
  }

  /* 🟥 DEAD */
  if (cmd === '!dead') {
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');

    kills[bossKey] = Date.now();
    saveData();

    return message.reply(`🟥 ${bosses[bossKey].name} marked dead.`);
  }

  /* 🟢 ALIVE */
  if (cmd === '!alive') {
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');

    delete kills[bossKey];
    saveData();

    return message.reply(`🟢 ${bosses[bossKey].name} is alive.`);
  }

  /* 🕒 SET DEAD */
  if (cmd === '!setdead') {
    const mins = parseInt(args[2]);
    if (!bosses[bossKey]) return message.reply('❌ Boss not found.');

    kills[bossKey] = Date.now() - mins * 60000;
    saveData();

    return message.reply(`🕒 ${bosses[bossKey].name} set ${mins} min ago.`);
  }

  /* 📋 BOSSES */
  if (cmd === '!bosses') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📋 Boss List')
          .setDescription(
            Object.values(bosses)
              .map(b => `• ${b.name} (${b.hours ? b.hours + 'h' : 'Scheduled'})`)
              .join('\n')
          )
      ]
    });
  }

  /* 🔄 RESET */
  if (cmd === '!reset') {
    kills = {};
    saveData();
    return message.reply('🔄 All boss data reset.');
  }
});

/* =========================
   🔐 START BOT
========================= */
client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
  seedTodaysKills();
});

client.login(process.env.TOKEN);
