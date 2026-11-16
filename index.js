const { Client, LocalAuth } = require('whatsapp-web.js');


// ⚠️ METS TON NUMÉRO ICI, sans + et sans espace. Exemple pour Cameroun : 237690000000
const ADMIN_NUMBER = '237651143293'; 
const GROUP_NAME = 'A où V'; // Mets le nom exact de ton groupe de jeu

let participants = []; // ceux qui ont fait !join
let usedPairs = new Set(); // pour ne jamais refaire la même combinaison
let gameOpen = false;

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

client.initialize().then(async () => {
    setTimeout(async () => {
        const code = await client.requestPairingCode(ADMIN_NUMBER);
        console.log('TON CODE EST :', code);
    }, 5000);
});

client.on('message', async (msg) => {
    const chat = await msg.getChat();
    if (!chat.isGroup) return; // JAMAIS en privé
    if (chat.name !== GROUP_NAME && GROUP_NAME !== 'TON NOM DE GROUPE') return; // Uniquement ton groupe

    const sender = msg.author || msg.from;
    const senderNumber = sender.replace('@c.us','');
    const isAdmin = senderNumber === ADMIN_NUMBER;
    const text = msg.body.trim().toLowerCase();

    // !join - TOUT LE MONDE PEUT
    if (text === '!join') {
        if (participants.includes(senderNumber)) {
            return msg.reply(`Tu es déjà inscrit @${senderNumber}`);
        }
        participants.push(senderNumber);
        return msg.reply(`✅ Tu es inscrit ! Il y a ${participants.length} joueurs pour 20h.`);
    }

    // !joueurs - VOIR LA LISTE (admin seulement)
    if (text === '!joueurs' && isAdmin) {
        return msg.reply(`Joueurs inscrits (${participants.length}) :\n` + participants.map(p => '@'+p).join('\n'));
    }

    // !duo - SEUL TOI PEUT LANCER
    if (text === '!duo') {
        if (!isAdmin) return; // Les autres sont ignorés, le bot ne répond pas
        if (participants.length < 2) return msg.reply('Pas assez de joueurs. Il faut au moins 2 personnes qui ont fait !join');

        // Choisir 2 au hasard sans répéter la combinaison
        let duo = null;
        let essais = 0;
        while (essais < 100) {
            let a = participants[Math.floor(Math.random() * participants.length)];
            let b = participants[Math.floor(Math.random() * participants.length)];
            if (a === b) continue;
            let key = [a,b].sort().join('|');
            if (!usedPairs.has(key)) {
                usedPairs.add(key);
                duo = [a,b];
                break;
            }
            essais++;
        }
        if (!duo) {
            usedPairs.clear();
            return msg.reply('On a fait toutes les combinaisons ! On recommence à zéro. Ret tape !duo');
        }

        const verite = verites[Math.floor(Math.random() * verites.length)];
        const action = actions[Math.floor(Math.random() * actions.length)];

        return msg.reply(
`🎲 **DUO TIRÉ AU SORT** 🎲\n\n` +
`@${duo[0]} VS @${duo[1]}\n\n` +
`@${duo[0]} pose à @${duo[1]} :\n👉 VÉRITÉ : ${verite}\n\n` +
`@${duo[1]} pose à @${duo[0]} :\n👉 ACTION : ${action}\n\n` +
`Vous avez 2 minutes ! Le patron tape !duo pour le prochain duo.`
        );
    }

    // !reset - SEUL TOI, pour vider les inscrits
    if (text === '!reset' && isAdmin) {
        participants = [];
        usedPairs.clear();
        return msg.reply('Jeu réinitialisé. Tout le monde doit refaire !join');
    }

    // !jouer - SEUL TOI
    if (text === '!jouer' && isAdmin) {
        gameOpen = true;
        return msg.reply('🎮 JEU OUVERT ! Tout le monde tape !join avant 20h. À 20h, je lance les duos !');
    }
});

// Jeu automatique à 20h précise (Heure Douala)
setInterval(async () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Douala' }));
    if (now.getHours() === 20 && now.getMinutes() === 0 && now.getSeconds() < 10) {
        const chats = await client.getChats();
        const group = chats.find(c => c.isGroup && c.name === GROUP_NAME);
        if (group) group.sendMessage(`⏰ 20H PILE ! LE JEU COMMENCE !\n${participants.length} joueurs inscrits.\nPatron, tape !duo pour lancer le premier duo !`);
    }
}, 10000);

client.initialize();
