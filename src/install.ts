#!/usr/bin/env node

/**
 * Installer for claude-code-weixin.
 *
 * Copies plugin files into Claude Code's plugin cache and registers it,
 * mirroring how official marketplace plugins are installed.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { loginFlow } from "./auth/login.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_SRC = resolve(__dirname, "..");

const MARKETPLACE = "claude-channel-weixin";
const PLUGIN_NAME = "weixin";
const VERSION = "0.2.4";
const PLUGIN_KEY = `${PLUGIN_NAME}@${MARKETPLACE}`;

const CLAUDE_DIR = join(homedir(), ".claude");
const PLUGINS_DIR = join(CLAUDE_DIR, "plugins");
const CACHE_DIR = join(PLUGINS_DIR, "cache", MARKETPLACE, PLUGIN_NAME, VERSION);
const MARKETPLACE_DIR = join(PLUGINS_DIR, "marketplaces", MARKETPLACE);
const PLUGINS_FILE = join(PLUGINS_DIR, "installed_plugins.json");

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

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
    try { return JSON.parse(readFileSync(PLUGINS_FILE, "utf-8")); } catch {}
  }
  return { version: 2, plugins: {} };
}

function install(): void {
  console.log("\n  Installing WeChat channel plugin for Claude Code...\n");

  // Step 1: Copy plugin files to cache (same structure as official plugins)
  console.log("  Copying plugin files to cache...");
  ensureDir(CACHE_DIR);
  for (const item of ["dist", "skills", ".claude-plugin", ".mcp.json", "package.json", "node_modules"]) {
    const src = join(PLUGIN_SRC, item);
    const dst = join(CACHE_DIR, item);
    if (existsSync(src)) {
      try {
        if (existsSync(dst)) rmSync(dst, { recursive: true });
        cpSync(src, dst, { recursive: true });
      } catch (err) {
        console.error(`  Warning: failed to copy ${item}:`, err);
      }
    }
  }

  // Step 2: Create marketplace entry
  console.log("  Registering marketplace...");
  ensureDir(join(MARKETPLACE_DIR, ".claude-plugin"));
  writeFileSync(
    join(MARKETPLACE_DIR, ".claude-plugin", "marketplace.json"),
    JSON.stringify({
      "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
      name: MARKETPLACE,
      description: "WeChat channel plugin for Claude Code",
      plugins: [{
        name: PLUGIN_NAME,
        description: "WeChat messaging bridge with built-in access control.",
        source: { source: "local", path: CACHE_DIR },
      }],
    }, null, 2),
    "utf-8"
  );

  // Step 3: Register in installed_plugins.json
  console.log("  Registering plugin...");
  const data = loadPluginsFile();
  const now = new Date().toISOString();
  // Clean up old entries
  delete data.plugins["weixin@claude-plugins-official"];
  data.plugins[PLUGIN_KEY] = [{
    scope: "user",
    installPath: CACHE_DIR,
    version: VERSION,
    installedAt: now,
    lastUpdated: now,
  }];
  ensureDir(PLUGINS_DIR);
  writeFileSync(PLUGINS_FILE, JSON.stringify(data, null, 2), "utf-8");

  console.log("\n  WeChat channel plugin installed!\n");
  console.log("  Cache path:", CACHE_DIR);
  console.log("\n  Next steps:");
  console.log("  1. Login:    claude-channel-weixin login");
  console.log(`  2. Start:    claude --dangerously-load-development-channels plugin:${PLUGIN_KEY}`);
  console.log("");
}

function uninstall(): void {
  // Remove cache
  if (existsSync(CACHE_DIR)) {
    try { rmSync(CACHE_DIR, { recursive: true }); } catch {}
  }
  // Remove marketplace
  if (existsSync(MARKETPLACE_DIR)) {
    try { rmSync(MARKETPLACE_DIR, { recursive: true }); } catch {}
  }
  // Remove from installed_plugins.json
  const data = loadPluginsFile();
  delete data.plugins[PLUGIN_KEY];
  delete data.plugins["weixin@claude-plugins-official"];
  writeFileSync(PLUGINS_FILE, JSON.stringify(data, null, 2), "utf-8");
  console.log("Plugin uninstalled.");
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
  claude-channel-weixin install      Register plugin with Claude Code
  claude-channel-weixin uninstall    Remove plugin registration
  claude-channel-weixin login        Login via WeChat QR code
`);
}
