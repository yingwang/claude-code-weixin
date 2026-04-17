import type { ChannelConfig } from "../channel-config.js";
import type { GetUpdatesResponse, SendMessageResponse, QrCodeResponse, QrCodeStatusResponse, GetUploadUrlResponse, GetConfigResponse, MessageItemOutbound } from "./types.js";
export declare class WeixinApi {
    private baseUrl;
    private token;
    private routeTag?;
    private pollTimeout;
    constructor(config: ChannelConfig);
    private headers;
    private request;
    /** Long-poll for incoming messages */
    getUpdates(syncBuf?: string): Promise<GetUpdatesResponse>;
    /** Send a message to a user */
    sendMessage(toUser: string, content: MessageItemOutbound, contextToken: string): Promise<SendMessageResponse>;
    /** Send a text message */
    sendText(toUser: string, text: string, contextToken: string): Promise<SendMessageResponse>;
    /** Get QR code for login */
    getQrCode(): Promise<QrCodeResponse>;
    /** Check QR code scan status */
    getQrCodeStatus(qrcode: string): Promise<QrCodeStatusResponse>;
    /** Get pre-signed CDN upload params */
    getUploadUrl(params: {
        filekey: string;
        media_type: number;
        to_user_id: string;
        rawsize: number;
        rawfilemd5: string;
        filesize: number;
        aeskey: string;
    }): Promise<GetUploadUrlResponse>;
    /** Get config (typing ticket etc.) */
    getConfig(): Promise<GetConfigResponse>;
    /** Send typing indicator */
    sendTyping(toUser: string, contextToken: string, typingTicket: string): Promise<void>;
    /** Static: create API client for QR login (no token needed initially) */
    static forLogin(apiBaseUrl: string): WeixinLoginApi;
}
/** Minimal API client for the login flow (before we have a bot token) */
export declare class WeixinLoginApi {
    private baseUrl;
    constructor(baseUrl: string);
    private request;
    getQrCode(): Promise<QrCodeResponse>;
    getQrCodeStatus(qrcode: string): Promise<QrCodeStatusResponse>;
}
