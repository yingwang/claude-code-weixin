#!/usr/bin/env node

/**
 * Installer for claude-code-weixin.
 *
 * Copies plugin files into a local marketplace structure that
 * Claude Code can discover, matching how official plugins work.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { loginFlow } from "./auth/login.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_SRC = resolve(__dirname, "..");
const VERSION = JSON.parse(readFileSync(join(PLUGIN_SRC, "package.json"), "utf-8")).version;

const MARKETPLACE = "claude-channel-weixin";
const PLUGIN_NAME = "weixin";
const PLUGIN_KEY = `${PLUGIN_NAME}@${MARKETPLACE}`;

const PLUGINS_DIR = join(homedir(), ".claude", "plugins");
const MARKETPLACE_DIR = join(PLUGINS_DIR, "marketplaces", MARKETPLACE);
const PLUGIN_DIR = join(MARKETPLACE_DIR, "external_plugins", PLUGIN_NAME);
const CACHE_DIR = join(PLUGINS_DIR, "cache", MARKETPLACE, PLUGIN_NAME, VERSION);
const PLUGINS_FILE = join(PLUGINS_DIR, "installed_plugins.json");

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

interface PluginsFile {
  version: number;
  plugins: Record<string, { scope: string; installPath: string; version: string; installedAt?: string; lastUpdated?: string }[]>;
}

function loadPluginsFile(): PluginsFile {
  if (existsSync(PLUGINS_FILE)) {
    try { return JSON.parse(readFileSync(PLUGINS_FILE, "utf-8")); } catch {}
  }
  return { version: 2, plugins: {} };
}

const COPY_ITEMS = ["dist", "skills", ".claude-plugin", ".mcp.json", "package.json", "node_modules"];

function copyPluginFiles(dest: string): void {
  ensureDir(dest);
  for (const item of COPY_ITEMS) {
    const src = join(PLUGIN_SRC, item);
    const dst = join(dest, item);
    if (existsSync(src)) {
      try {
        if (existsSync(dst)) rmSync(dst, { recursive: true });
        cpSync(src, dst, { recursive: true });
      } catch (err) {
        console.error(`  Warning: failed to copy ${item}:`, err);
      }
    }
  }
}

function install(): void {
  console.log("\n  Installing WeChat channel plugin for Claude Code...\n");

  // Step 1: Copy plugin into marketplace/external_plugins/weixin/
  // (this is how Claude Code discovers plugins within a marketplace)
  console.log("  Setting up marketplace...");
  copyPluginFiles(PLUGIN_DIR);

  // Create marketplace.json
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
        category: "productivity",
        source: "./external_plugins/weixin",
      }],
    }, null, 2),
    "utf-8"
  );

  // Step 2: Copy to cache (where Claude Code loads from at runtime)
  console.log("  Copying to plugin cache...");
  copyPluginFiles(CACHE_DIR);

  // Step 3: Register in installed_plugins.json
  console.log("  Registering plugin...");
  const data = loadPluginsFile();
  const now = new Date().toISOString();
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
  console.log("  Version:", VERSION);
  console.log("\n  Next steps:");
  console.log("  1. Login:  claude-channel-weixin login");
  console.log(`  2. Start:  claude --dangerously-load-development-channels plugin:${PLUGIN_KEY}`);
  console.log("");
}

function uninstall(): void {
  for (const dir of [PLUGIN_DIR, CACHE_DIR, MARKETPLACE_DIR]) {
    if (existsSync(dir)) {
      try { rmSync(dir, { recursive: true }); } catch {}
    }
  }
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
