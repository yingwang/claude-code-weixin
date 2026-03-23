#!/usr/bin/env node

/**
 * One-command installer for claude-code-weixin.
 *
 * Usage:
 *   npx claude-channel-weixin install    Register plugin with Claude Code
 *   npx claude-channel-weixin uninstall  Remove plugin registration
 *   npx claude-channel-weixin login      Login via WeChat QR code
 */

import { execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loginFlow } from "./auth/login.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");
const MARKETPLACE_NAME = "claude-channel-weixin";
const PLUGIN_REF = `weixin@${MARKETPLACE_NAME}`;

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (err: any) {
    return err.stderr?.toString() || err.stdout?.toString() || String(err);
  }
}

function findClaude(): string {
  // Try common locations
  for (const cmd of ["claude", `${process.env.HOME}/.claude/bin/claude`]) {
    try {
      execSync(`${cmd} --version`, { stdio: "pipe" });
      return cmd;
    } catch {}
  }
  throw new Error("Claude Code CLI not found. Install it first: https://github.com/anthropics/claude-code");
}

function install(): void {
  console.log("\n  Installing WeChat channel plugin...\n");

  const claude = findClaude();

  // Step 1: Add marketplace
  console.log("  Adding marketplace...");
  const addResult = run(`${claude} plugin marketplace add ${PLUGIN_ROOT}`);
  if (addResult.includes("error") || addResult.includes("Error")) {
    // Try with GitHub URL as fallback
    console.log("  Trying GitHub URL...");
    run(`${claude} plugin marketplace add yingwang/claude-code-weixin`);
  }

  // Step 2: Install plugin
  console.log("  Installing plugin...");
  const installResult = run(`${claude} plugin install ${PLUGIN_REF}`);

  console.log("\n  WeChat channel plugin installed!\n");
  console.log("  Plugin path:", PLUGIN_ROOT);
  console.log("\n  Next steps:");
  console.log(`  1. Login:  npx claude-channel-weixin login`);
  console.log(`  2. Start:  claude --dangerously-load-development-channels plugin:${PLUGIN_REF}`);
  console.log("");
}

function uninstall(): void {
  try {
    const claude = findClaude();
    run(`${claude} plugin uninstall ${PLUGIN_REF}`);
    run(`${claude} plugin marketplace remove ${MARKETPLACE_NAME}`);
    console.log("Plugin and marketplace removed.");
  } catch (err) {
    console.error("Uninstall failed:", err instanceof Error ? err.message : err);
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
  npx claude-channel-weixin install      Register plugin with Claude Code
  npx claude-channel-weixin uninstall    Remove plugin registration
  npx claude-channel-weixin login        Login via WeChat QR code
`);
}
