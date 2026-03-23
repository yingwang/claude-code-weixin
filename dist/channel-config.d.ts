export interface ChannelConfig {
    botToken: string;
    botTokens: string[];
    apiBaseUrl: string;
    skRouteTag?: string;
    pollTimeout: number;
    textChunkLimit: number;
    dmPolicy: "pairing" | "allowlist" | "disabled";
    allowedSenders: string[];
    allowedGroups: string[];
    ackReaction?: string;
    replyToMode?: boolean;
}
/** Channel config directory: ~/.claude/channels/weixin/ */
export declare function getChannelDir(): string;
/**
 * Load channel config from:
 *   ~/.claude/channels/weixin/.env (bot token)
 *   ~/.claude/channels/weixin/config.json (settings)
 */
export declare function loadChannelConfig(): ChannelConfig;
/** Save the bot token to .env with restricted permissions */
export declare function saveBotToken(token: string): void;
/** Save channel settings (not the token) */
export declare function saveChannelSettings(settings: Partial<Omit<ChannelConfig, "botToken">>): void;
