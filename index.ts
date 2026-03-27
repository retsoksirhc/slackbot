import * as superagent from 'superagent';
import * as Slack from '@slack/bolt';
import type { BotConfig, Bot, Plugin, SlackMessage } from './types';

export type { BotConfig, Bot, Plugin, SlackMessage } from './types';

interface QueuedMessage {
    message: {
        type: string;
        text?: string;
        user?: string;
        channel?: string;
        client_msg_id?: string;
        [key: string]: unknown;
    };
    body: {
        authorizations?: Array<{ is_bot: boolean; user_id: string }>;
        api_app_id?: string;
        [key: string]: unknown;
    };
}

export const start = async function (config: BotConfig): Promise<Bot> {
    const {
        botUserOAuthToken,
        botSigningSecret,
        botAppToken
    } = config;

    const app = new Slack.App({
        token: botUserOAuthToken,
        signingSecret: botSigningSecret,
        appToken: botAppToken,
        socketMode: true
    });

    const plugins: Plugin[] = [];
    const messageQueue: QueuedMessage[] = [];

    const sendCommand = async (commandName: string, payload: object): Promise<unknown> => {
        try {
            return await superagent.post(`https://slack.com/api/${commandName}`)
                .set('Authorization', `Bearer ${config.botUserOAuthToken}`)
                .set('Content-Type', 'application/json')
                .send(payload);
        } catch (e) {
            console.error('Error sending command');
            console.error(e);
            throw e;
        }
    };

    const updateMessage = async (timestamp: string, channel: string, newText: string, newBlocks: object[] = []): Promise<unknown> => {
        return await app.client.chat.update({
            channel,
            ts: timestamp,
            text: newText,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            blocks: newBlocks as any
        });
    };

    const reactToMessage = async (timestamp: string, channel: string, emoji: string): Promise<unknown> => {
        return await app.client.reactions.add({
            channel, timestamp, name: emoji
        });
    };

    const bot: Bot = {
        postMessage: async (target: string, text: string, blocks: object[] = []): Promise<unknown> => {
            return await app.client.chat.postMessage({
                channel: target,
                text,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                blocks: blocks as any
            });
        },
        updateMessage,
        sendCommand,
        reactToMessage
    };

    await app.start();

    app.message(async (args) => {
        messageQueue.push(args as unknown as QueuedMessage);
    });

    plugins.push(...config.plugins);

    for (const plugin of plugins) {
        await plugin.init(bot);
    }

    const handleMessage = (message: SlackMessage): void => {
        const { appId } = message;

        // Ignore own messages
        if (appId === config.botAppId) {
            return;
        }

        plugins.forEach(plugin => plugin.handleMessage(message));
    };

    const processQueue = (): void => {
        if (messageQueue.length > 0) {
            const event = messageQueue.shift()!;
            const rawMessage = event.message as Record<string, unknown>;
            const botAuthorization = event.body.authorizations?.find(a => a.is_bot);
            const type = event.message.type;
            const rawText = event.message.text;

            if (!rawText) {
                // Happens on image only messages, etc
                setTimeout(processQueue, 10);
                return;
            }

            const botUserRegex = new RegExp(`<@${botAuthorization?.user_id}> ?`);
            const trimmedText = rawText.replace(botUserRegex, '').trim();
            const fromUser = event.message.user ?? '';
            const fromChannel = event.message.channel ?? '';
            const eventId = event.message.client_msg_id ?? '';
            const appId = event.body.api_app_id ?? undefined;

            console.log(`Processing message ${eventId}`);
            try {
                handleMessage({
                    type,
                    rawText,
                    trimmedText,
                    fromUser,
                    fromChannel,
                    eventId,
                    appId,
                    rawMessage
                });
            } catch (e) {
                console.log(`Couldn't process message - ${e}`);
                bot.postMessage(fromChannel, `Couldn't process message. \`\`\`${e}\`\`\``);
            }
        }

        setTimeout(processQueue, 10);
    };

    setTimeout(processQueue, 10);
    return bot;
};

export default {
    start,
};

