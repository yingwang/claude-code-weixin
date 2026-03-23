#!/usr/bin/env node

/**
 * One-command installer for claude-code-weixin.
 *
 * Usage:
 *   npx claude-channel-weixin install    Register plugin with Claude Code
 *   npx claude-channel-weixin uninstall  Remove plugin registration
 *   npx claude-channel-weixin login      Login via WeChat QR code
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { loginFlow } from "./auth/login.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");
const MARKETPLACE_NAME = "claude-channel-weixin";
const PLUGIN_KEY = `weixin@${MARKETPLACE_NAME}`;

const CLAUDE_DIR = join(homedir(), ".claude");
const PLUGINS_DIR = join(CLAUDE_DIR, "plugins");
const PLUGINS_FILE = join(PLUGINS_DIR, "installed_plugins.json");
const MARKETPLACE_DIR = join(PLUGINS_DIR, "marketplaces", MARKETPLACE_NAME);

interface PluginEntry {
  scope: string;
  installPath: string;
  version: string;
  installedAt?: string;
  lastUpdated?: string;
}

interface PluginsFile {
  version: number;
  plugins: Record<string, PluginEntry[]>;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadPluginsFile(): PluginsFile {
  if (existsSync(PLUGINS_FILE)) {
    try {
      return JSON.parse(readFileSync(PLUGINS_FILE, "utf-8"));
    } catch {}
  }
  return { version: 2, plugins: {} };
}

function savePluginsFile(data: PluginsFile): void {
  ensureDir(PLUGINS_DIR);
  writeFileSync(PLUGINS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function install(): void {
  console.log("\n  Installing WeChat channel plugin...\n");

  // Step 1: Register marketplace — copy .claude-plugin as marketplace definition
  console.log("  Registering marketplace...");
  ensureDir(join(MARKETPLACE_DIR, ".claude-plugin"));

  // Create marketplace definition
  const marketplaceDef = {
    name: MARKETPLACE_NAME,
    description: "WeChat channel plugin for Claude Code",
    plugins: [
      {
        name: "weixin",
        description: "WeChat channel for Claude Code — messaging bridge with built-in access control.",
        source: PLUGIN_ROOT,
      },
    ],
  };
  writeFileSync(
    join(MARKETPLACE_DIR, ".claude-plugin", "marketplace.json"),
    JSON.stringify(marketplaceDef, null, 2),
    "utf-8"
  );

  // Step 2: Register plugin in installed_plugins.json
  console.log("  Registering plugin...");
  const data = loadPluginsFile();
  const now = new Date().toISOString();

  // Remove old key if exists (from previous install with different marketplace name)
  delete data.plugins["weixin@claude-plugins-official"];

  data.plugins[PLUGIN_KEY] = [
    {
      scope: "user",
      installPath: PLUGIN_ROOT,
      version: "0.2.3",
      installedAt: now,
      lastUpdated: now,
    },
  ];
  savePluginsFile(data);

  console.log("\n  WeChat channel plugin installed!\n");
  console.log("  Plugin path:", PLUGIN_ROOT);
  console.log("\n  Next steps:");
  console.log("  1. Login:  npx claude-channel-weixin login");
  console.log(`  2. Start:  claude --dangerously-load-development-channels plugin:${PLUGIN_KEY}`);
  console.log("");
}

function uninstall(): void {
  // Remove from installed_plugins.json
  const data = loadPluginsFile();
  delete data.plugins[PLUGIN_KEY];
  delete data.plugins["weixin@claude-plugins-official"];
  savePluginsFile(data);

  // Remove marketplace directory
  if (existsSync(MARKETPLACE_DIR)) {
    try { rmSync(MARKETPLACE_DIR, { recursive: true }); } catch {}
  }

  console.log("Plugin and marketplace removed.");
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
