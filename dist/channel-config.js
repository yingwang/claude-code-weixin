import { readFileSync, existsSync, mkdirSync, writeFileSync, chmodSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
const DEFAULTS = {
    apiBaseUrl: "https://ilinkai.weixin.qq.com",
    pollTimeout: 35,
    textChunkLimit: 4000,
    dmPolicy: "pairing",
    allowedSenders: [],
    allowedGroups: [],
};
/** Channel config directory: ~/.claude/channels/weixin/ */
export function getChannelDir() {
    const dir = join(homedir(), ".claude", "channels", "weixin");
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return dir;
}
function getEnvPath() {
    return join(getChannelDir(), ".env");
}
function getConfigPath() {
    return join(getChannelDir(), "config.json");
}
/**
 * Load channel config from:
 *   ~/.claude/channels/weixin/.env (bot token)
 *   ~/.claude/channels/weixin/config.json (settings)
 */
export function loadChannelConfig() {
    const envPath = getEnvPath();
    const configPath = getConfigPath();
    let botToken = "";
    const botTokens = [];
    // Read .env for bot token(s) — supports WEIXIN_BOT_TOKEN, WEIXIN_BOT_TOKEN_2, etc.
    if (existsSync(envPath)) {
        const env = readFileSync(envPath, "utf-8");
        for (const line of env.split("\n")) {
            const match = line.match(/^WEIXIN_BOT_TOKEN(?:_\d+)?=(.+)$/);
            if (match) {
                const t = match[1].trim();
                if (t)
                    botTokens.push(t);
            }
        }
        if (botTokens.length > 0)
            botToken = botTokens[0];
    }
    // Also check environment variable
    if (!botToken && process.env.WEIXIN_BOT_TOKEN) {
        botToken = process.env.WEIXIN_BOT_TOKEN;
        botTokens.push(botToken);
    }
    // Read config.json for other settings
    let settings = {};
    if (existsSync(configPath)) {
        try {
            settings = JSON.parse(readFileSync(configPath, "utf-8"));
        }
        catch (err) {
            console.error(`[WARN] Failed to parse ${configPath}:`, err);
        }
    }
    return {
        ...DEFAULTS,
        ...settings,
        botToken,
        botTokens: botTokens.length > 0 ? botTokens : (botToken ? [botToken] : []),
    };
}
/** Clear the sync buffer when token changes to avoid stale cursor issues */
function clearSyncBufIfTokenChanged(newToken) {
    const dir = getChannelDir();
    const syncBufPath = join(dir, "sync-buf.dat");
    const tokenHashPath = join(dir, ".token-hash");
    const newHash = newToken.slice(0, 16);
    let oldHash = "";
    try {
        if (existsSync(tokenHashPath)) {
            oldHash = readFileSync(tokenHashPath, "utf-8").trim();
        }
    }
    catch { }
    if (oldHash && oldHash !== newHash) {
        try {
            if (existsSync(syncBufPath)) {
                unlinkSync(syncBufPath);
            }
        }
        catch { }
    }
    try {
        writeFileSync(tokenHashPath, newHash, "utf-8");
    }
    catch { }
}
/** Save the bot token to .env with restricted permissions */
export function saveBotToken(token) {
    clearSyncBufIfTokenChanged(token);
    const envPath = getEnvPath();
    // Ensure dir exists
    getChannelDir();
    writeFileSync(envPath, `WEIXIN_BOT_TOKEN=${token}\n`, "utf-8");
    chmodSync(envPath, 0o600);
}
/** Save channel settings (not the token) */
export function saveChannelSettings(settings) {
    const configPath = getConfigPath();
    let existing = {};
    if (existsSync(configPath)) {
        try {
            existing = JSON.parse(readFileSync(configPath, "utf-8"));
        }
        catch {
            // ignore
        }
    }
    const merged = { ...existing, ...settings };
    writeFileSync(configPath, JSON.stringify(merged, null, 2), "utf-8");
}
//# sourceMappingURL=channel-config.js.map