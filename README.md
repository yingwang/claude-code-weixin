# claude-code-weixin

WeChat channel plugin for [Claude Code](https://github.com/anthropics/claude-code) — chat with Claude Code directly from WeChat.

Works just like the built-in Telegram channel: WeChat messages flow into your Claude Code session, and Claude replies back through WeChat.

## Architecture

```
WeChat User ←→ iLink Bot API ←→ [this plugin (MCP server)] ←→ Claude Code
                (long-poll)        stdio transport              (your session)
```

This is a Claude Code **channel plugin** — an MCP server with the `claude/channel` capability. Claude Code spawns it as a subprocess and communicates via stdio. Inbound WeChat messages arrive as MCP notifications, and Claude uses MCP tools (`reply`) to respond.

## Features

Working:
- Text messaging (send and receive)
- Image recognition (download, decrypt, and pass to Claude for vision)
- Multi-bot support (multiple WeChat accounts in one session)
- QR code login (scan with WeChat to authorize)
- Pairing-based access control

Not yet working:
- Outbound file/image sending (`send_file` — CDN upload format needs work)
- Voice messages
- Inbound file/video download

## Setup

### Quick install (via npm)

```bash
npx claude-channel-weixin install
npx claude-channel-weixin login
claude --dangerously-load-development-channels plugin:weixin@claude-plugins-official
```

### Manual install (from source)

```bash
git clone https://github.com/yingwang/claude-code-weixin.git
cd claude-code-weixin
npm install && npm run build
node dist/install.js install
node dist/cli.js login
claude --dangerously-load-development-channels plugin:weixin@claude-plugins-official
```

### What each step does

1. **Install** — registers the plugin in `~/.claude/plugins/installed_plugins.json`
2. **Login** — shows a QR code in terminal; scan with WeChat to authorize; bot token is auto-saved to `~/.claude/channels/weixin/.env`
3. **Start** — launches Claude Code with the WeChat channel enabled

### Chat!

Send a message from WeChat to the bot. Messages appear in your Claude Code session as `<channel source="weixin">` tags, and Claude can reply back through WeChat.

## Slash Commands

| Command | Description |
|---------|-------------|
| `/weixin:configure` | Show current config status |
| `/weixin:configure clear` | Remove bot token |
| `/weixin:access pair <code>` | Approve a pairing request |
| `/weixin:access allow <id>` | Add user to allowlist |
| `/weixin:access remove <id>` | Remove user from allowlist |
| `/weixin:access policy <mode>` | Set DM policy (pairing/allowlist/disabled) |
| `/weixin:access list` | Show allowed users |

## Configuration

Stored at `~/.claude/channels/weixin/`:

| File | Purpose |
|------|---------|
| `.env` | `WEIXIN_BOT_TOKEN=...` (chmod 600) |
| `config.json` | Channel settings (DM policy, API URL, etc.) |
| `allowlist.json` | Approved sender IDs |
| `sync-buf.dat` | Long-poll cursor (prevents duplicate messages) |

### Multi-bot support

To connect multiple WeChat accounts, add additional tokens to `.env`:

```
WEIXIN_BOT_TOKEN=first-token
WEIXIN_BOT_TOKEN_2=second-token
```

Each token gets its own long-poll monitor. All messages feed into the same Claude Code session.

## Security

- **Bot token**: Gives full access to send/receive messages as your WeChat bot. **Never share it or commit it to git.**
- **Sender allowlist**: Only paired/approved WeChat users can push messages to your Claude session
- **Pairing flow**: Unknown users get a 6-char code → you approve in terminal → they're added
- **Token storage**: Bot token stored with 600 permissions, never logged

## Development

```bash
npm install
npm run build
npm run dev          # watch mode
```

After code changes: `npm run build`, then kill the plugin process and `/reload-plugins` in Claude Code.

```bash
kill $(pgrep -f 'weixin.*server.js')
# then run /reload-plugins in Claude Code
```

## License

Apache-2.0
