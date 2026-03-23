#!/usr/bin/env node

/**
 * Installer for claude-code-weixin.
 *
 * Usage:
 *   npx claude-channel-weixin install    Install plugin into Claude Code
 *   npx claude-channel-weixin uninstall  Remove plugin
 *   npx claude-channel-weixin login      Login via WeChat QR code
 */

import { execSync } from "node:child_process";
import { loginFlow } from "./auth/login.js";

const GITHUB_URL = "https://github.com/yingwang/claude-code-weixin.git";
const MARKETPLACE = "claude-channel-weixin";
const PLUGIN_REF = `weixin@${MARKETPLACE}`;

function findClaude(): string {
  for (const cmd of ["claude", `${process.env.HOME}/.claude/bin/claude`, "/usr/local/bin/claude"]) {
    try {
      execSync(`${cmd} --version`, { stdio: "pipe" });
      return cmd;
    } catch {}
  }
  throw new Error("Claude Code CLI not found. Install it first: https://docs.anthropic.com/en/docs/claude-code/getting-started");
}

function run(cmd: string): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
    return { ok: true, output };
  } catch (err: any) {
    const output = (err.stdout?.toString() || "") + (err.stderr?.toString() || "");
    return { ok: false, output };
  }
}

function install(): void {
  console.log("\n  Installing WeChat channel plugin for Claude Code...\n");

  const claude = findClaude();

  // Step 1: Add marketplace
  console.log("  Adding marketplace...");
  const add = run(`${claude} plugin marketplace add ${GITHUB_URL}`);
  if (!add.ok && !add.output.includes("already")) {
    console.error("  Failed to add marketplace:", add.output);
    process.exit(1);
  }

  // Step 2: Install plugin
  console.log("  Installing plugin...");
  const inst = run(`${claude} plugin install ${PLUGIN_REF}`);
  if (!inst.ok && !inst.output.includes("already")) {
    console.error("  Failed to install plugin:", inst.output);
    process.exit(1);
  }

  console.log("\n  WeChat channel plugin installed!\n");
  console.log("  Next steps:");
  console.log("  1. Login:  npx claude-channel-weixin login");
  console.log(`  2. Start:  claude --dangerously-load-development-channels plugin:${PLUGIN_REF}`);
  console.log("");
}

function uninstall(): void {
  try {
    const claude = findClaude();
    run(`${claude} plugin uninstall ${PLUGIN_REF}`);
    run(`${claude} plugin marketplace remove ${MARKETPLACE}`);
    console.log("Plugin and marketplace removed.");
  } catch (err) {
    console.error("Uninstall error:", err instanceof Error ? err.message : err);
  }
}

const command = process.argv[2];

switch (command) {
  case "install":
    install();
    break;
  case "uninstall":
    uninstall();
    break;
  case "login":
    loginFlow().then(() => {
      console.log("Login successful! Run /reload-plugins in Claude Code to apply.");
    }).catch((err) => {
      console.error("Login failed:", err instanceof Error ? err.message : err);
      process.exit(1);
    });
    break;
  default:
    console.log(`
claude-channel-weixin — WeChat channel plugin for Claude Code

Usage:
  npx claude-channel-weixin install      Install plugin into Claude Code
  npx claude-channel-weixin uninstall    Remove plugin
  npx claude-channel-weixin login        Login via WeChat QR code
`);
}
