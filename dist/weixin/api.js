import { randomBytes } from "node:crypto";
import { logger } from "../util/logger.js";
function randomUin() {
    const buf = randomBytes(4);
    return buf.toString("base64");
}
export class WeixinApi {
    baseUrl;
    token;
    routeTag;
    pollTimeout;
    constructor(config) {
        this.baseUrl = config.apiBaseUrl;
        this.token = config.botToken;
        this.routeTag = config.skRouteTag;
        this.pollTimeout = config.pollTimeout;
    }
    headers() {
        const h = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
            AuthorizationType: "ilink_bot_token",
            "X-WECHAT-UIN": randomUin(),
        };
        if (this.routeTag) {
            h["SKRouteTag"] = this.routeTag;
        }
        return h;
    }
    async request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        const init = {
            method,
            headers: this.headers(),
        };
        if (body !== undefined) {
            init.body = JSON.stringify(body);
        }
        const res = await fetch(url, init);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} ${res.statusText} from ${path}`);
        }
        return res.json();
    }
    /** Long-poll for incoming messages */
    async getUpdates(syncBuf) {
        const body = {
            timeout: this.pollTimeout,
        };
        if (syncBuf) {
            body.sync_buf = syncBuf;
        }
        return this.request("POST", "/ilink/bot/getupdates", body);
    }
    /** Send a message to a user */
    async sendMessage(toUser, content, contextToken) {
        const clientId = `claude-weixin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return this.request("POST", "/ilink/bot/sendmessage", {
            msg: {
                from_user_id: "",
                to_user_id: toUser,
                client_id: clientId,
                message_type: 2,
                message_state: 2,
                item_list: [content],
                context_token: contextToken || undefined,
            },
            base_info: { channel_version: "0.1.0" },
        });
    }
    /** Send a text message */
    async sendText(toUser, text, contextToken) {
        return this.sendMessage(toUser, { type: 1, text_item: { text } }, contextToken);
    }
    /** Get QR code for login */
    async getQrCode() {
        return this.request("GET", "/ilink/bot/get_bot_qrcode?bot_type=3");
    }
    /** Check QR code scan status */
    async getQrCodeStatus(qrcode) {
        return this.request("GET", `/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`);
    }
    /** Get pre-signed CDN upload params */
    async getUploadUrl(params) {
        return this.request("POST", "/ilink/bot/getuploadurl", { ...params, no_need_thumb: true, base_info: { channel_version: "0.1.0" } });
    }
    /** Get config (typing ticket etc.) */
    async getConfig() {
        return this.request("POST", "/ilink/bot/getconfig", {});
    }
    /** Send typing indicator */
    async sendTyping(toUser, contextToken, typingTicket) {
        try {
            await this.request("POST", "/ilink/bot/sendtyping", {
                to_user: toUser,
                context_token: contextToken,
                typing_ticket: typingTicket,
            });
        }
        catch (e) {
            logger.debug("sendTyping failed (non-critical):", e);
        }
    }
    /** Static: create API client for QR login (no token needed initially) */
    static forLogin(apiBaseUrl) {
        return new WeixinLoginApi(apiBaseUrl);
    }
}
/** Minimal API client for the login flow (before we have a bot token) */
export class WeixinLoginApi {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async request(path) {
        const res = await fetch(`${this.baseUrl}${path}`, {
            headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status} ${res.statusText} from ${path}`);
        }
        return res.json();
    }
    async getQrCode() {
        return this.request("/ilink/bot/get_bot_qrcode?bot_type=3");
    }
    async getQrCodeStatus(qrcode) {
        return this.request(`/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`);
    }
}
//# sourceMappingURL=api.js.map