#!/usr/bin/env node
/**
 * Claude Code WeChat Channel Plugin
 *
 * An MCP server with the `claude/channel` capability.
 * Claude Code spawns this as a subprocess via stdio transport.
 *
 * Flow:
 *   WeChat User → iLink Bot API → (long-poll) → this server → MCP notification → Claude Code
 *   Claude Code → MCP tool call (reply) → this server → iLink Bot API → WeChat User
 */
export {};
