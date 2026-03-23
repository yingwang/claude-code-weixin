#!/usr/bin/env node
/**
 * CLI for WeChat channel plugin — mainly used for login.
 *
 * Usage:
 *   claude-channel-weixin login     Login via WeChat QR code
 *   claude-channel-weixin status    Show current status
 */
import { parseArgs } from "node:util";
import { loginFlow } from "./auth/login.js";
import { loadChannelConfig, getChannelDir } from "./channel-config.js";
import { logger } from "./util/logger.js";
const HELP = `
claude-channel-weixin - WeChat channel plugin for Claude Code

Usage:
  claude-channel-weixin login      Login via WeChat QR code
  claude-channel-weixin status     Show current status
  claude-channel-weixin help       Show this help

Options:
  --debug                          Enable debug logging
`;
async function main() {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: {
            debug: { type: "boolean", default: false },
            help: { type: "boolean", short: "h", default: false },
        },
    });
    if (values.debug) {
        logger.setLevel("debug");
    }
    const command = positionals[0] || "help";
    switch (command) {
        case "login":
            await cmdLogin();
            break;
        case "status":
            cmdStatus();
            break;
        case "help":
        default:
            console.log(HELP);
            break;
    }
}
async function cmdLogin() {
    try {
        await loginFlow();
        console.log(`配置已保存至: ${getChannelDir()}`);
        console.log('重启 Claude Code 或运行 /reload-plugins 使配置生效');
    }
    catch (err) {
        console.error("登录失败:", err instanceof Error ? err.message : err);
        process.exit(1);
    }
}
function cmdStatus() {
    try {
        const config = loadChannelConfig();
        if (config.botToken) {
            console.log("状态: 已配置");
            console.log(`配置目录: ${getChannelDir()}`);
            console.log(`API 地址: ${config.apiBaseUrl}`);
            console.log(`Bot Token: ${config.botToken.slice(0, 8)}...`);
            console.log(`DM Policy: ${config.dmPolicy}`);
        }
        else {
            console.log("状态: 未登录");
            console.log('运行 "claude-channel-weixin login" 开始登录');
        }
    }
    catch {
        console.log("状态: 未配置");
        console.log('运行 "claude-channel-weixin login" 开始登录');
    }
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map