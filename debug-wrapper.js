#!/usr/bin/env node
/**
 * Debug wrapper: logs all MCP stdin/stdout traffic, then spawns the real server.
 */
import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG = '/tmp/weixin-protocol.log';

function log(dir, data) {
  const ts = new Date().toISOString();
  const str = data.toString().trim();
  if (str) appendFileSync(LOG, `[${ts}] ${dir}: ${str}\n`);
}

appendFileSync(LOG, `\n=== NEW SESSION ${new Date().toISOString()} ===\n`);

const child = spawn('node', [join(__dirname, 'dist/server.js')], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

// Claude Code → server (stdin)
process.stdin.on('data', (chunk) => {
  log('CC→SRV', chunk);
  child.stdin.write(chunk);
});
process.stdin.on('end', () => child.stdin.end());

// server → Claude Code (stdout)
child.stdout.on('data', (chunk) => {
  log('SRV→CC', chunk);
  process.stdout.write(chunk);
});

// server stderr → our stderr + log
child.stderr.on('data', (chunk) => {
  log('STDERR', chunk);
  process.stderr.write(chunk);
});

child.on('exit', (code) => {
  log('EXIT', `code=${code}`);
  process.exit(code ?? 1);
});
