# @retsoksirhc/slackbot
A simple slack bot that uses the Slack Bolt API in socket mode. You can register plugins to send and receive messages. See the example app for usage.

NOTE: In version 2.0.0, the webserver was removed from this library. You should turn on socket mode instead, so you don't have to expose an http port to the world.
### Install
```
npm install @retsoksirhc/slackbot
```
### Usage
`index.js`
```js
const SlackBot = require('@retsoksirhc/slackbot');
const MyOwnPlugin = require('./plugins/MyOwnPlugin.js');

const config = {
    botUserOAuthToken: "***provided by slack***",
    botSigningSecret: "***provided by slack***",
    botAppToken: "***provided by slack***",
    plugins: [
        MyOwnPlugin
    ]
}

SlackBot.start(config).then((bot) => {
    console.log('Bot started');
});
```
`./plugins/MyOwnPlugin.js`
```js
module.exports = {
    init: async (bot) => {
        this.bot = bot;
        // Post a message to a channel, connect to a database, etc
    },
    handleMessage: (message) => {
        const {trimmedText, fromUser, fromChannel} = message;
        if (trimmedText === 'ping') {
            this.bot.postMessage(fromChannel, `<@${fromUser}> pong!`);
        }
    }
}
```