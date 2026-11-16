const { Client, LocalAuth } = require('whatsapp-web.js');

// ⚠️ METS TON NUMÉRO ICI, avec 237 devant, sans + et sans espace
const ADMIN_NUMBER = '237651143293';
const GROUP_NAME = 'A où V';

let participants = [];
let usedPairs = new Set();

const verites = [
  "C'est quoi ton plus gros secret que personne dans le groupe ne connait ?",
  "Tu as déjà eu un crush sur quelqu'un dans ce groupe ? Qui ?",
  "C'est quoi la chose la plus honteuse que tu as faite en 2026 ?",
  "Tu as déjà menti à ton meilleur ami pour sortir ? Raconte.",
  "C'est quoi ton plus grand fantasme ?"
];

const actions = [
  "Envoie un vocal en chantant une chanson d'amour pour l'autre joueur !",
  "Change ta photo de profil avec la photo de l'autre joueur pendant 10 min !",
  "Envoie un message vocal en disant 'je t'aime' à l'autre joueur !",
  "Fais une déclaration d'amour en 3 phrases à l'autre joueur !",
  "Imite la voix de l'autre joueur dans un vocal !"
];

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] }
});

// ICI C'EST LE CODE, PAS LE QR
client.on('ready', () => console.log('Bot pret !'));

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    if (!chat.isGroup) return;
    if (chat.name !== GROUP_NAME) return;

    const sender = msg.author || msg.from;
    const senderNumber = sender.replace('@c.us','');
    const isAdmin = senderNumber === ADMIN_NUMBER;
    const text = msg.body.trim().toLowerCase();

    if (text === '!join') {
        if (participants.includes(senderNumber)) return msg.reply(`Tu es déjà inscrit @${senderNumber}`);
        participants.push(senderNumber);
        return msg.reply(`✅ Tu es inscrit ! Il y a ${participants.length} joueurs pour 20h.`);
    }

    if (text === '!joueurs' && isAdmin) {
        return msg.reply(`Joueurs (${participants.length}) :\n` + participants.map(p => '@'+p).join('\n'));
    }

    if (text === '!duo') {
        if (!isAdmin) return;
        if (participants.length < 2) return msg.reply('Pas assez de joueurs. Il faut au moins 2 qui ont fait !join');

        let duo = null;
        let essais = 0;
        while (essais < 100) {
            let a = participants[Math.floor(Math.random() * participants.length)];
            let b = participants[Math.floor(Math.random() * participants.length)];
            if (a === b) continue;
            let key = [a,b].sort().join('|');
            if (!usedPairs.has(key)) { usedPairs.add(key); duo = [a,b]; break; }
            essais++;
        }
        if (!duo) { usedPairs.clear(); return msg.reply('On a fait toutes les combinaisons ! Retape !duo'); }

        const verite = verites[Math.floor(Math.random() * verites.length)];
        const action = actions[Math.floor(Math.random() * actions.length)];

        return msg.reply(`🎲 **DUO TIRÉ AU SORT** 🎲\n\n@${duo[0]} VS @${duo[1]}\n\n@${duo[0]} pose à @${duo[1]} :\n👉 VÉRITÉ : ${verite}\n\n@${duo[1]} pose à @${duo[0]} :\n👉 ACTION : ${action}\n\nVous avez 2 minutes ! Patron tape !duo pour le prochain.`);
    }

    if (text === '!reset' && isAdmin) {
        participants = []; usedPairs.clear();
        return msg.reply('Jeu réinitialisé. Tout le monde doit refaire !join');
    }

    if (text === '!jouer' && isAdmin) {
        return msg.reply('🎮 JEU OUVERT ! Tout le monde tape !join avant 20h.');
    }
});

// Demande le CODE à 8 chiffres au lieu du QR
client.initialize().then(async () => {
    setTimeout(async () => {
        try {
            const code = await client.requestPairingCode(ADMIN_NUMBER);
            console.log('TON CODE EST :', code);
        } catch(e) { console.log('Erreur code:', e.message); }
    }, 5000);
});

// Jeu auto à 20h Douala
setInterval(async () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Douala' }));
    if (now.getHours() === 20 && now.getMinutes() === 0 && now.getSeconds() < 10) {
        const chats = await client.getChats();
        const group = chats.find(c => c.isGroup && c.name === GROUP_NAME);
        if (group) group.sendMessage(`⏰ 20H PILE ! LE JEU COMMENCE !\n${participants.length} joueurs inscrits.\nPatron, tape !duo !`);
    }
}, 10000);
