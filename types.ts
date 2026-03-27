export interface BotConfig {
    botUserOAuthToken: string;
    botSigningSecret: string;
    botAppToken: string;
    botAppId?: string;
    plugins: Plugin[];
}

export interface SlackMessage {
    type: string;
    rawText: string;
    trimmedText: string;
    fromUser: string;
    fromChannel: string;
    eventId: string;
    appId: string | undefined;
    rawMessage: Record<string, unknown>;
}

export interface Bot {
    postMessage(target: string, text: string, blocks?: object[]): Promise<unknown>;
    updateMessage(timestamp: string, channel: string, newText: string, newBlocks?: object[]): Promise<unknown>;
    sendCommand(commandName: string, payload: object): Promise<unknown>;
    reactToMessage(timestamp: string, channel: string, emoji: string): Promise<unknown>;
}

export interface Plugin {
    init(bot: Bot): Promise<void>;
    handleMessage(message: SlackMessage): Promise<void> | void;
}
