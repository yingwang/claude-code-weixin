import { type ChannelConfig } from "../channel-config.js";
/**
 * Manages the sender allowlist for the WeChat channel.
 * Only users on the allowlist can push messages to Claude Code.
 */
export declare class AllowlistManager {
    private allowed;
    private config;
    constructor(config: ChannelConfig);
    isAllowed(senderId: string): boolean;
    add(senderId: string): void;
    remove(senderId: string): void;
    list(): string[];
    private get filePath();
    private load;
    private save;
}
