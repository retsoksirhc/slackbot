# @retsoksirhc/slackbot
A simple slack bot that uses the Slack Bolt API in socket mode. You can register plugins to send and receive messages. See the example app for usage.

NOTE: In version 2.0.0, the webserver was removed from this library. You should turn on socket mode instead, so you don't have to expose an http port to the world.
### Install
```
npm install @retsoksirhc/slackbot
```
### Usage
`index.ts`
```ts
import SlackBot from '@retsoksirhc/slackbot';
import MyOwnPlugin from './plugins/MyOwnPlugin';

const config = {
    botUserOAuthToken: "***provided by slack***",
    botSigningSecret: "***provided by slack***",
    botAppToken: "***provided by slack***",
    plugins: [
        MyOwnPlugin
    ]
};

SlackBot.start(config).then((bot) => {
    console.log('Bot started');
});
```
`./plugins/MyOwnPlugin.ts`
```ts
import type { Bot, Plugin, SlackMessage } from '@retsoksirhc/slackbot';

interface MyPlugin extends Plugin {
    bot?: Bot;
}

const plugin: MyPlugin = {
    init: async (bot: Bot) => {
        plugin.bot = bot;
        // Post a message to a channel, connect to a database, etc
    },
    handleMessage: (message: SlackMessage) => {
        const { trimmedText, fromUser, fromChannel } = message;
        if (trimmedText === 'ping') {
            plugin.bot?.postMessage(fromChannel, `<@${fromUser}> pong!`);
        }
    }
};

export default plugin;
```