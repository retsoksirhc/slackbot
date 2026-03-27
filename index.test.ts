import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface MockQueuedMessage {
    message: {
        type: string;
        text?: string;
        user?: string;
        channel?: string;
        client_msg_id?: string;
    };
    body: {
        authorizations?: Array<{ is_bot: boolean; user_id: string }>;
        api_app_id?: string;
    };
}

class MockApp {
    public static instances: MockApp[] = [];

    public readonly client = {
        chat: {
            postMessage: vi.fn(async (message: object) => ({ ok: true, message })),
            update: vi.fn(async (message: object) => ({ ok: true, message }))
        },
        reactions: {
            add: vi.fn(async (reaction: object) => ({ ok: true, reaction }))
        }
    };

    public messageHandler?: (payload: MockQueuedMessage) => Promise<void>;
    public start = vi.fn(async () => undefined);

    public constructor(_config: object) {
        MockApp.instances.push(this);
    }

    public message(handler: (payload: MockQueuedMessage) => Promise<void>): void {
        this.messageHandler = handler;
    }
}

const postMock = vi.fn();

const setupModule = async () => {
    MockApp.instances = [];
    postMock.mockReset();

    vi.doMock('@slack/bolt', () => ({
        App: MockApp
    }));

    vi.doMock('superagent', () => ({
        post: postMock
    }));

    return await import('./index');
};

describe('slackbot', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.resetAllMocks();
    });

    it('initializes plugins and returns bot API methods', async () => {
        const { start } = await setupModule();
        const plugin = {
            init: vi.fn(async () => undefined),
            handleMessage: vi.fn(async () => undefined)
        };

        const bot = await start({
            botUserOAuthToken: 'xoxb-test',
            botSigningSecret: 'secret',
            botAppToken: 'xapp-test',
            plugins: [plugin]
        });

        expect(plugin.init).toHaveBeenCalledTimes(1);
        expect(plugin.init).toHaveBeenCalledWith(bot);
        expect(typeof bot.postMessage).toBe('function');
        expect(typeof bot.updateMessage).toBe('function');
        expect(typeof bot.reactToMessage).toBe('function');
        expect(typeof bot.sendCommand).toBe('function');
    });

    it('uses superagent with auth header when sendCommand is called', async () => {
        const { start } = await setupModule();

        const sendSpy = vi.fn(async (payload: object) => ({ ok: true, payload }));
        const setSpy = vi.fn(function (this: unknown, _name: string, _value: string) {
            return this;
        });

        const chain = {
            set: setSpy,
            send: sendSpy
        };
        postMock.mockReturnValue(chain);

        const bot = await start({
            botUserOAuthToken: 'xoxb-token',
            botSigningSecret: 'secret',
            botAppToken: 'xapp-token',
            plugins: []
        });

        await bot.sendCommand('chat.postMessage', { text: 'hello' });

        expect(postMock).toHaveBeenCalledWith('https://slack.com/api/chat.postMessage');
        expect(setSpy).toHaveBeenCalledWith('Authorization', 'Bearer xoxb-token');
        expect(setSpy).toHaveBeenCalledWith('Content-Type', 'application/json');
        expect(sendSpy).toHaveBeenCalledWith({ text: 'hello' });
    });

    it('processes queued messages and passes trimmed text to plugins', async () => {
        const { start } = await setupModule();

        const plugin = {
            init: vi.fn(async () => undefined),
            handleMessage: vi.fn(async () => undefined)
        };

        await start({
            botUserOAuthToken: 'xoxb-token',
            botSigningSecret: 'secret',
            botAppToken: 'xapp-token',
            botAppId: 'A_OWN',
            plugins: [plugin]
        });

        const app = MockApp.instances[0];
        expect(app).toBeDefined();
        expect(app.messageHandler).toBeDefined();

        await app.messageHandler?.({
            message: {
                type: 'message',
                text: '<@U_BOT> ping',
                user: 'U_USER',
                channel: 'C_CHANNEL',
                client_msg_id: 'MSG_1'
            },
            body: {
                api_app_id: 'A_OTHER',
                authorizations: [{ is_bot: true, user_id: 'U_BOT' }]
            }
        });

        vi.advanceTimersByTime(20);

        expect(plugin.handleMessage).toHaveBeenCalledTimes(1);
        expect(plugin.handleMessage).toHaveBeenCalledWith(expect.objectContaining({
            type: 'message',
            rawText: '<@U_BOT> ping',
            trimmedText: 'ping',
            fromUser: 'U_USER',
            fromChannel: 'C_CHANNEL',
            eventId: 'MSG_1',
            appId: 'A_OTHER'
        }));
    });

    it('ignores messages from own app id', async () => {
        const { start } = await setupModule();

        const plugin = {
            init: vi.fn(async () => undefined),
            handleMessage: vi.fn(async () => undefined)
        };

        await start({
            botUserOAuthToken: 'xoxb-token',
            botSigningSecret: 'secret',
            botAppToken: 'xapp-token',
            botAppId: 'A_OWN',
            plugins: [plugin]
        });

        const app = MockApp.instances[0];
        await app.messageHandler?.({
            message: {
                type: 'message',
                text: '<@U_BOT> hello',
                user: 'U_USER',
                channel: 'C_CHANNEL',
                client_msg_id: 'MSG_2'
            },
            body: {
                api_app_id: 'A_OWN',
                authorizations: [{ is_bot: true, user_id: 'U_BOT' }]
            }
        });

        vi.advanceTimersByTime(20);

        expect(plugin.handleMessage).not.toHaveBeenCalled();
    });
});
