#!/usr/bin/env node

/**
 * One-command installer for claude-code-weixin.
 *
 * Usage:
 *   npx claude-channel-weixin install    Register plugin with Claude Code
 *   npx claude-channel-weixin uninstall  Remove plugin registration
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { loginFlow } from "./auth/login.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");

const PLUGINS_DIR = join(homedir(), ".claude", "plugins");
const PLUGINS_FILE = join(PLUGINS_DIR, "installed_plugins.json");
const PLUGIN_KEY = "weixin@claude-plugins-official";

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

function loadPluginsFile(): PluginsFile {
  if (existsSync(PLUGINS_FILE)) {
    try {
      return JSON.parse(readFileSync(PLUGINS_FILE, "utf-8"));
    } catch {
      // corrupted file, start fresh
    }
  }
  return { version: 2, plugins: {} };
}

function savePluginsFile(data: PluginsFile): void {
  if (!existsSync(PLUGINS_DIR)) {
    mkdirSync(PLUGINS_DIR, { recursive: true });
  }
  writeFileSync(PLUGINS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function install(): void {
  const data = loadPluginsFile();
  const now = new Date().toISOString();

  const entry: PluginEntry = {
    scope: "user",
    installPath: PLUGIN_ROOT,
    version: "0.1.0",
    installedAt: now,
    lastUpdated: now,
  };

  // Check if already installed
  const existing = data.plugins[PLUGIN_KEY];
  if (existing?.some((e) => e.installPath === PLUGIN_ROOT)) {
    console.log("Plugin already registered at:", PLUGIN_ROOT);
    console.log("To re-register, run: npx claude-channel-weixin uninstall && npx claude-channel-weixin install");
    return;
  }

  // Add or replace
  data.plugins[PLUGIN_KEY] = [entry];
  savePluginsFile(data);

  console.log("\n  WeChat channel plugin registered successfully!\n");
  console.log("  Plugin path:", PLUGIN_ROOT);
  console.log("\n  Next steps:");
  console.log("  1. Login:  node " + join(PLUGIN_ROOT, "dist/cli.js") + " login");
  console.log("  2. Start:  claude --dangerously-load-development-channels plugin:weixin@claude-plugins-official");
  console.log("");
}

function uninstall(): void {
  const data = loadPluginsFile();
  if (data.plugins[PLUGIN_KEY]) {
    delete data.plugins[PLUGIN_KEY];
    savePluginsFile(data);
    console.log("Plugin unregistered.");
  } else {
    console.log("Plugin was not registered.");
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
