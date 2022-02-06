const superagent = require('superagent');
const {App} = require('@slack/bolt');

let botConfig = {};
let app;

const sendCommand = async (commandName, payload) => {
    try {
        return await superagent.post(`https://slack.com/api/${commandName}`)
            .set('Authorization', `Bearer ${botConfig.botUserOAuthToken}`)
            .set('Content-Type', 'application/json')
            .send(payload);
    } catch (e) {
        console.error('Error sending command');
        console.error(e);
        throw e;
    }
}

const postMessage = async (target, text) => {
    const message = {
        channel: target,
        text: text
    };
    await app.client.chat.postMessage(message);
}

const bot = {
    postMessage,
    sendCommand
};

const plugins = [];
const messageQueue = [];

const start = async (config) => {
    const {
        botUserOAuthToken,
        botSigningSecret,
        botAppToken
    } = config;

    app = new App({
        token: botUserOAuthToken,
        signingSecret: botSigningSecret,
        appToken: botAppToken,
        socketMode: true
    })

    await app.start();
    app.message((message) => {
        messageQueue.push(message);
    });
    plugins.push(...config.plugins);

    plugins.forEach(async (plugin) => {
        await plugin.init(bot)
    });

    const handleMessage = (message) => {
        const {
            appId
        } = message;
    
        // Ignore own messages
        if (appId === botConfig.botAppId) {
            return;
        }

        console.log(message);
        plugins.forEach(plugin => plugin.handleMessage(message));
    }

    const processQueue = () => {
        if (messageQueue.length > 0) {
            const event = messageQueue.shift();
            const botAuthorization = event.body.authorizations.find(authorization => authorization.is_bot);
            const type = event.type;
            const rawText = event.message.text;
            if (!rawText) {
                // Happens on image only messages, etc
                setTimeout(processQueue, 10);
                return;
            }
            const botUserRegex = new RegExp(`\<@${botAuthorization.user_id}\> ?`);
            const trimmedText = rawText.replace(botUserRegex, '').trim();
            const fromUser = event.message.user;
            const fromChannel = event.message.channel;
            const eventId = event.message.client_msg_id;
            const appId = event.body.api_app_id || undefined;

            console.log(`Processing message ${eventId}`);
            try {
                handleMessage({
                    type,
                    rawText,
                    trimmedText,
                    fromUser,
                    fromChannel,
                    eventId,
                    appId
                });
            } catch (e) {
                console.log(`Couldn't process message - ${e}`);
                postMessage(fromChannel, `Couldn't process message. \`\`\`${e}\`\`\``);
            }
        }

        setTimeout(processQueue, 10);
    }
    setTimeout(processQueue, 10);
    return bot;
}

module.exports = {
    start
};
