import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getChannelDir, type ChannelConfig } from "../channel-config.js";

/**
 * Manages the sender allowlist for the WeChat channel.
 * Only users on the allowlist can push messages to Claude Code.
 */
export class AllowlistManager {
  private allowed: Set<string>;
  private config: ChannelConfig;

  constructor(config: ChannelConfig) {
    this.config = config;
    this.allowed = new Set(config.allowedSenders);
    this.load();
  }

  isAllowed(senderId: string): boolean {
    if (this.config.dmPolicy === "disabled") return false;
    this.load(); // re-read file on each check (file may be updated by /weixin:access skill)
    return this.allowed.has(senderId);
  }

  add(senderId: string): void {
    this.allowed.add(senderId);
    this.save();
  }

  remove(senderId: string): void {
    this.allowed.delete(senderId);
    this.save();
  }

  list(): string[] {
    return [...this.allowed];
  }

  private get filePath(): string {
    return join(getChannelDir(), "allowlist.json");
  }

  private load(): void {
    if (existsSync(this.filePath)) {
      try {
        const data = JSON.parse(readFileSync(this.filePath, "utf-8"));
        if (Array.isArray(data)) {
          for (const id of data) this.allowed.add(id);
        }
      } catch {
        // ignore
      }
    }
  }

  private save(): void {
    writeFileSync(
      this.filePath,
      JSON.stringify([...this.allowed], null, 2),
      "utf-8"
    );
  }
}
