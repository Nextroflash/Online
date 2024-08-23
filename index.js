const mineflayer = require('mineflayer');
const axios = require('axios');
const express = require('express');
const ejs = require('ejs');
const { webhookURL: configWebhookURL, messageId } = require('./config');

const botOptions = {
  host: 'the8ghzlethalhvh.aternos.me',
  port: 44725,
  username: 'PornStar'
};

let bot;

const createBot = () => {
  bot = mineflayer.createBot(botOptions);

  bot.on('login', () => {
    console.log('Bot logged in');

    setInterval(() => {
      if (canSend) {
        sendPlayersToWebhook();
        canSend = false;
        setTimeout(() => {
          canSend = true;
        }, updateInterval);
      }
    }, updateInterval);
  });

  bot.on('message', async message => {
    try {
      const messageContent = message.toString().trim();

      if (messageContent) {
        const chatData = {
          content: messageContent
        };

        await axios.post(chatWebhookURL, chatData);
      } else {
        console.log('Received an empty message, not sending to webhook.');
      }
    } catch (error) {
      console.error('Error sending chat data to webhook:', error.response ? error.response.data : error.message);
    }
  });

  bot.on('playerJoined', player => console.log(`Player ${player.username} joined the server`));

  bot.on('end', () => {
    console.log('Bot disconnected, reconnecting in 1 second...');
    setTimeout(createBot, 1000); // Attempt to reconnect after 1 second
  });

  bot.on('error', err => {
    console.error('Bot encountered an error:', err);
    bot.end(); // Trigger 'end' event to attempt reconnection
  });
};

createBot();

const updateInterval = 1000;
let canSend = true;

const chatWebhookURL = 'https://discord.com/api/webhooks/1276598418038591610/Zc0nsptmhRpUxpTVVbTA3rycEud8AsjB7ZojOuwxf8rrmTvMFSHiV3CDPoudW_aS53xZ';

const sendPlayersToWebhook = async () => {
  try {
    const players = await getOnlinePlayers();
    const playerList = players.map(player => `- ${player}`).join('\n');

    const embedData = {
      embeds: [
        {
          title: 'Online Players',
          description: playerList,
          color: 0x00ff00
        }
      ]
    };

    await axios.patch(`${configWebhookURL}/messages/${messageId}`, embedData);
  } catch (error) {
    console.error('Error sending data to webhook:', error.response ? error.response.data : error.message);
  }
};

const getOnlinePlayers = async () => {
  return Object.values(bot.players)
    .filter(player => player.username !== bot.username)
    .map(player => player.username);
};

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
  try {
    const onlinePlayers = await getOnlinePlayers();
    res.render('index', { players: onlinePlayers });
  } catch (error) {
    console.error('Error fetching online players:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
