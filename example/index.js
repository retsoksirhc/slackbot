const SlackBot = require('./bot.js');
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