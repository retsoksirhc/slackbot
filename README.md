# @retsoksirhc/slackbot
A simple slack bot that uses the event API. You can register plugins to send and receive messages. See the example app for usage.
### Install
```
npm install @retsoksirhc/slackbot
```
### Usage
`index.js`
```js
const SlackBot = require('@retsoksirhc/slackbot');
const MyOwnPlugin = require('./plugins/MyOwnPlugin.js');

SlackBot.start({
    sslKey: "/path/to/your/privkey.pem",
    sslCert: "/path/to/your/fullchain.pem",
    serverPort: 443,
    redirectInsecure: true,
    insecurePort: 80,
    requestPath: "/path-you-configured-for-your-slack-app",
    botVerificationToken: "***provided by slack app config***",
    botUserOAuthToken: "***provided by slack app config***",
    botAppId: "***provided by slack app config***"
    plugins: [
        MyOwnPlugin
    ]
}).then((bot) => {
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