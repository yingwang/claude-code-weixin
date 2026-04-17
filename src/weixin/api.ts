import { randomBytes } from "node:crypto";
import type { ChannelConfig } from "../channel-config.js";
import type {
  GetUpdatesResponse,
  SendMessageResponse,
  QrCodeResponse,
  QrCodeStatusResponse,
  GetUploadUrlResponse,
  GetConfigResponse,
  MessageItemOutbound,
} from "./types.js";
import { logger } from "../util/logger.js";

function randomUin(): string {
  const buf = randomBytes(4);
  return buf.toString("base64");
}

export class WeixinApi {
  private baseUrl: string;
  private token: string;
  private routeTag?: string;
  private pollTimeout: number;

  constructor(config: ChannelConfig) {
    this.baseUrl = config.apiBaseUrl;
    this.token = config.botToken;
    this.routeTag = config.skRouteTag;
    this.pollTimeout = config.pollTimeout;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
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

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
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
    return res.json() as Promise<T>;
  }

  /** Long-poll for incoming messages */
  async getUpdates(syncBuf?: string): Promise<GetUpdatesResponse> {
    const body: Record<string, unknown> = {
      timeout: this.pollTimeout,
    };
    if (syncBuf) {
      body.sync_buf = syncBuf;
    }
    return this.request<GetUpdatesResponse>(
      "POST",
      "/ilink/bot/getupdates",
      body
    );
  }

  /** Send a message to a user */
  async sendMessage(
    toUser: string,
    content: MessageItemOutbound,
    contextToken: string
  ): Promise<SendMessageResponse> {
    const clientId = `claude-weixin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return this.request<SendMessageResponse>(
      "POST",
      "/ilink/bot/sendmessage",
      {
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
      }
    );
  }

  /** Send a text message */
  async sendText(
    toUser: string,
    text: string,
    contextToken: string
  ): Promise<SendMessageResponse> {
    return this.sendMessage(
      toUser,
      { type: 1, text_item: { text } } as MessageItemOutbound,
      contextToken
    );
  }

  /** Get QR code for login */
  async getQrCode(): Promise<QrCodeResponse> {
    return this.request<QrCodeResponse>(
      "GET",
      "/ilink/bot/get_bot_qrcode?bot_type=3"
    );
  }

  /** Check QR code scan status */
  async getQrCodeStatus(qrcode: string): Promise<QrCodeStatusResponse> {
    return this.request<QrCodeStatusResponse>(
      "GET",
      `/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`
    );
  }

  /** Get pre-signed CDN upload params */
  async getUploadUrl(params: {
    filekey: string;
    media_type: number;
    to_user_id: string;
    rawsize: number;
    rawfilemd5: string;
    filesize: number;
    aeskey: string;
  }): Promise<GetUploadUrlResponse> {
    return this.request<GetUploadUrlResponse>(
      "POST",
      "/ilink/bot/getuploadurl",
      { ...params, no_need_thumb: true, base_info: { channel_version: "0.1.0" } }
    );
  }

  /** Get config (typing ticket etc.) */
  async getConfig(): Promise<GetConfigResponse> {
    return this.request<GetConfigResponse>(
      "POST",
      "/ilink/bot/getconfig",
      {}
    );
  }

  /** Send typing indicator */
  async sendTyping(
    toUser: string,
    contextToken: string,
    typingTicket: string
  ): Promise<void> {
    try {
      await this.request("POST", "/ilink/bot/sendtyping", {
        to_user: toUser,
        context_token: contextToken,
        typing_ticket: typingTicket,
      });
    } catch (e) {
      logger.debug("sendTyping failed (non-critical):", e);
    }
  }

  /** Static: create API client for QR login (no token needed initially) */
  static forLogin(apiBaseUrl: string): WeixinLoginApi {
    return new WeixinLoginApi(apiBaseUrl);
  }
}

/** Minimal API client for the login flow (before we have a bot token) */
export class WeixinLoginApi {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} from ${path}`);
    }
    return res.json() as Promise<T>;
  }

  async getQrCode(): Promise<QrCodeResponse> {
    return this.request<QrCodeResponse>(
      "/ilink/bot/get_bot_qrcode?bot_type=3"
    );
  }

  async getQrCodeStatus(qrcode: string): Promise<QrCodeStatusResponse> {
    return this.request<QrCodeStatusResponse>(
      `/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`
    );
  }
}
