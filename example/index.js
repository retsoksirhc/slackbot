const SlackBot = require('../bot.js'); // You'll use @retsoksirhc/slackbot here
const PingPlugin = require('./plugins/ping');
const config = require('./config.json');

SlackBot.start({
    ...config,
    plugins: [
        PingPlugin
    ]
}).then((bot) => {
    console.log('Bot started');
});