const superagent = require('superagent');
const webserver = require('./webserver');

let botConfig = {};

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
    await sendCommand('chat.postMessage', message);
}

const bot = {
    postMessage,
    sendCommand
};

const plugins = [];
const messageQueue = [];

const start = async (config) => {
    const {
        botVerificationToken,
        botUserOAuthToken,
        botAppId,
        botUserId,
        sslKey,
        sslCert,
        serverPort,
        redirectInsecure,
        insecurePort,
        requestPath
    } = config;

    botConfig = {
        botVerificationToken,
        botUserOAuthToken,
        botAppId,
        botUserId
    }
    plugins.push(...config.plugins);

    await webserver({
        messageQueue,
        sslKey,
        sslCert,
        serverPort,
        redirectInsecure,
        insecurePort,
        requestPath,
        botVerificationToken
    });
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
            const message = messageQueue.shift();
            const botAuthorization = message.authorizations.find(authorization => authorization.is_bot);
            const type = message.event.type;
            const rawText = message.event.text;
            const botUserRegex = new RegExp(`\<@${botAuthorization.user_id}\> ?`);
            const trimmedText = rawText.replace(botUserRegex, '').trim();
            const fromUser = message.event.subtype === 'bot_message' ? message.event.username : message.event.user;
            const fromChannel = message.event.channel;
            const eventId = message.event_id;
            const appId = message.event.bot_profile ? message.event.bot_profile.app_id : undefined;

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
