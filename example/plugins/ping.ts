import type { Bot, SlackMessage, Plugin } from '../../types';

interface PingPlugin extends Plugin {
    bot?: Bot;
}

const plugin: PingPlugin = {
    init: async function (bot: Bot): Promise<void> {
        plugin.bot = bot;
        // Post a message, connect to a database, etc
    },
    handleMessage: async function (message: SlackMessage): Promise<void> {
        const { trimmedText, fromUser, fromChannel } = message;
        switch (trimmedText.toLowerCase()) {
            case 'ping':
                await plugin.bot?.postMessage(fromChannel, `<@${fromUser}> pong!`);
                break;
            default:
        }
    }
};

export default plugin;
