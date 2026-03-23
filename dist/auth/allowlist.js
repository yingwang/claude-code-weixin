import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getChannelDir } from "../channel-config.js";
/**
 * Manages the sender allowlist for the WeChat channel.
 * Only users on the allowlist can push messages to Claude Code.
 */
export class AllowlistManager {
    allowed;
    config;
    constructor(config) {
        this.config = config;
        this.allowed = new Set(config.allowedSenders);
        this.load();
    }
    isAllowed(senderId) {
        if (this.config.dmPolicy === "disabled")
            return false;
        return this.allowed.has(senderId);
    }
    add(senderId) {
        this.allowed.add(senderId);
        this.save();
    }
    remove(senderId) {
        this.allowed.delete(senderId);
        this.save();
    }
    list() {
        return [...this.allowed];
    }
    get filePath() {
        return join(getChannelDir(), "allowlist.json");
    }
    load() {
        if (existsSync(this.filePath)) {
            try {
                const data = JSON.parse(readFileSync(this.filePath, "utf-8"));
                if (Array.isArray(data)) {
                    for (const id of data)
                        this.allowed.add(id);
                }
            }
            catch {
                // ignore
            }
        }
    }
    save() {
        writeFileSync(this.filePath, JSON.stringify([...this.allowed], null, 2), "utf-8");
    }
}
//# sourceMappingURL=allowlist.js.map