import { MessageItemType } from "./weixin/types.js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getChannelDir } from "./channel-config.js";
import { downloadMedia } from "./cdn/download.js";
import { aesDecrypt } from "./cdn/aes-ecb.js";
import { logger } from "./util/logger.js";
const CDN_BASE_URL = "https://novac2c.cdn.weixin.qq.com/c2c";
/**
 * Parse AES key from various formats found in the wild.
 * - hex string (32 chars) → returned as-is
 * - base64(raw 16 bytes) → hex
 * - base64(hex 32 chars) → hex
 */
function parseAesKeyToHex(keyStr) {
    if (!keyStr)
        return null;
    if (/^[0-9a-fA-F]{32}$/.test(keyStr))
        return keyStr;
    try {
        const decoded = Buffer.from(keyStr, "base64");
        if (decoded.length === 16)
            return decoded.toString("hex");
        if (decoded.length === 32 && /^[0-9a-fA-F]{32}$/.test(decoded.toString("ascii"))) {
            return decoded.toString("ascii");
        }
    }
    catch { /* ignore */ }
    return keyStr;
}
async function tryDownloadImage(item, msgId) {
    try {
        const imageItem = item.image_item;
        const cdnItem = item.cdn_item;
        let buf;
        if (imageItem?.media?.encrypt_query_param) {
            // OpenClaw format
            const aesKeyB64 = imageItem.media.aes_key || imageItem.aeskey;
            const aesHex = parseAesKeyToHex(aesKeyB64 || imageItem.aeskey);
            const url = `${CDN_BASE_URL}/download?encrypted_query_param=${encodeURIComponent(imageItem.media.encrypt_query_param)}`;
            logger.debug(`Downloading image (OpenClaw format) from CDN`);
            const res = await fetch(url);
            if (!res.ok)
                throw new Error(`CDN ${res.status}`);
            const encrypted = Buffer.from(await res.arrayBuffer());
            buf = aesHex ? aesDecrypt(encrypted, aesHex) : encrypted;
        }
        else if (cdnItem?.file_url) {
            // Plugin format
            const aesHex = parseAesKeyToHex(cdnItem.aes_key);
            logger.debug(`Downloading image (cdn_item format)`);
            buf = aesHex ? await downloadMedia(cdnItem.file_url, aesHex) : Buffer.from(await (await fetch(cdnItem.file_url)).arrayBuffer());
        }
        else {
            logger.debug(`No downloadable image data in message ${msgId}`);
            return null;
        }
        const filePath = `/tmp/weixin-img-${Date.now()}.jpg`;
        writeFileSync(filePath, buf);
        logger.info(`Image saved to ${filePath} (${buf.length} bytes)`);
        return filePath;
    }
    catch (err) {
        logger.error(`Image download failed for ${msgId}:`, err);
        return null;
    }
}
async function tryDownloadMedia(encryptQueryParam, aesKeyStr, msgId, ext, label) {
    if (!encryptQueryParam)
        return null;
    try {
        const aesHex = parseAesKeyToHex(aesKeyStr);
        const url = `${CDN_BASE_URL}/download?encrypted_query_param=${encodeURIComponent(encryptQueryParam)}`;
        logger.debug(`Downloading ${label} from CDN`);
        const res = await fetch(url);
        if (!res.ok)
            throw new Error(`CDN ${res.status}`);
        const encrypted = Buffer.from(await res.arrayBuffer());
        const buf = aesHex ? aesDecrypt(encrypted, aesHex) : encrypted;
        const filePath = `/tmp/weixin-${label}-${Date.now()}.${ext}`;
        writeFileSync(filePath, buf);
        logger.info(`${label} saved to ${filePath} (${buf.length} bytes)`);
        return filePath;
    }
    catch (err) {
        logger.error(`${label} download failed for ${msgId}:`, err);
        return null;
    }
}
/**
 * Long-poll monitor for incoming WeChat messages.
 * Polls getUpdates and dispatches to a callback.
 */
export class Monitor {
    api;
    config;
    onMessage;
    running = false;
    syncBuf;
    constructor(api, config, onMessage) {
        this.api = api;
        this.config = config;
        this.onMessage = onMessage;
        this.loadSyncBuf();
    }
    start() {
        this.running = true;
        this.pollLoop();
    }
    stop() {
        this.running = false;
    }
    async pollLoop() {
        while (this.running) {
            try {
                await this.poll();
            }
            catch (err) {
                logger.error("Poll error:", err);
                await sleep(5000);
            }
        }
    }
    async poll() {
        const res = await this.api.getUpdates(this.syncBuf);
        // Check for errors (ret field is present on error)
        if (res.ret && res.ret !== 0) {
            logger.warn(`getUpdates error: ret=${res.ret} ${res.err_msg || ""}`);
            await sleep(3000);
            return;
        }
        // Update sync buffer
        if (res.sync_buf) {
            this.syncBuf = res.sync_buf;
            this.saveSyncBuf();
        }
        const messages = res.msgs ?? [];
        for (const msg of messages) {
            try {
                await this.dispatch(msg);
            }
            catch (err) {
                logger.error(`Error dispatching message ${msg.message_id}:`, err);
            }
        }
    }
    async dispatch(msg) {
        const meta = {
            msg_id: String(msg.message_id),
            msg_type: String(msg.message_type),
            create_time: String(msg.create_time_ms),
        };
        let text;
        // Extract content from item_list
        const firstItem = msg.item_list?.[0];
        if (!firstItem) {
            text = "[空消息]";
            logger.info(`← ${msg.from_user_id}: ${text}`);
            this.onMessage(msg.from_user_id, text, msg.context_token, meta);
            return;
        }
        const itemType = firstItem.type ?? msg.message_type;
        switch (itemType) {
            case MessageItemType.TEXT:
                text = firstItem.text_item?.text || "";
                break;
            case MessageItemType.IMAGE: {
                const imgPath = await tryDownloadImage(firstItem, msg.message_id);
                if (imgPath) {
                    meta.has_image = "true";
                    meta.image_path = imgPath;
                    text = `[图片: ${imgPath}]`;
                }
                else {
                    meta.has_image = "true";
                    text = `[图片: ${firstItem.cdn_item?.file_name || firstItem.image_item?.file_name || "image"}]`;
                }
                break;
            }
            case MessageItemType.FILE: {
                const fileName = firstItem.file_item?.file_name || firstItem.cdn_item?.file_name || "unknown";
                const filePath = await tryDownloadMedia(firstItem.file_item?.media?.encrypt_query_param, firstItem.file_item?.media?.aes_key, msg.message_id, fileName.split(".").pop() || "bin", "file");
                if (filePath) {
                    meta.file_path = filePath;
                    meta.file_name = fileName;
                    text = `[文件: ${filePath}]`;
                }
                else {
                    text = `[文件: ${fileName}]`;
                }
                break;
            }
            case MessageItemType.VIDEO: {
                const videoPath = await tryDownloadMedia(firstItem.video_item?.media?.encrypt_query_param, firstItem.video_item?.media?.aes_key, msg.message_id, "mp4", "video");
                if (videoPath) {
                    meta.video_path = videoPath;
                    text = `[视频: ${videoPath}]`;
                }
                else {
                    text = `[视频: ${firstItem.video_item?.file_name || firstItem.cdn_item?.file_name || "video"}]`;
                }
                break;
            }
            case MessageItemType.VOICE: {
                // Try server-side speech-to-text first
                if (firstItem.voice_item?.text) {
                    text = firstItem.voice_item.text;
                    break;
                }
                const voicePath = await tryDownloadMedia(firstItem.voice_item?.media?.encrypt_query_param, firstItem.voice_item?.media?.aes_key, msg.message_id, "silk", "voice");
                if (voicePath) {
                    meta.voice_path = voicePath;
                    text = `[语音: ${voicePath}]`;
                }
                else {
                    text = "[语音消息]";
                }
                break;
            }
            default:
                text = `[未知消息类型: ${itemType}]`;
        }
        logger.info(`← ${msg.from_user_id}: ${text.slice(0, 80)}`);
        this.onMessage(msg.from_user_id, text, msg.context_token, meta);
    }
    // ── Sync buffer persistence ──
    get syncBufPath() {
        return join(getChannelDir(), "sync-buf.dat");
    }
    loadSyncBuf() {
        try {
            if (existsSync(this.syncBufPath)) {
                this.syncBuf = readFileSync(this.syncBufPath, "utf-8");
            }
        }
        catch {
            // ignore
        }
    }
    saveSyncBuf() {
        if (this.syncBuf) {
            try {
                writeFileSync(this.syncBufPath, this.syncBuf, "utf-8");
            }
            catch {
                // ignore
            }
        }
    }
}
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
//# sourceMappingURL=monitor.js.map