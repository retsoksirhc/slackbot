import SlackBot from '../index'; // You'll use @retsoksirhc/slackbot here
import PingPlugin from './plugins/ping';
import config from './config.json';

SlackBot.start({
    ...config,
    plugins: [
        PingPlugin
    ]
}).then((bot) => {
    console.log('Bot started');
    bot.postMessage('#general', 'Hello!');
});
