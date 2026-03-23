import type { WeixinApi } from "./weixin/api.js";
import type { ChannelConfig } from "./channel-config.js";
type MessageCallback = (fromUser: string, text: string, contextToken: string, meta: Record<string, string>) => void;
/**
 * Long-poll monitor for incoming WeChat messages.
 * Polls getUpdates and dispatches to a callback.
 */
export declare class Monitor {
    private api;
    private config;
    private onMessage;
    private running;
    private syncBuf?;
    constructor(api: WeixinApi, config: ChannelConfig, onMessage: MessageCallback);
    start(): void;
    stop(): void;
    private pollLoop;
    private poll;
    private dispatch;
    private get syncBufPath();
    private loadSyncBuf;
    private saveSyncBuf;
}
export {};
