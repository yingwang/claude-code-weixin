# claude-channel-weixin

WeChat channel plugin for [Claude Code](https://github.com/anthropics/claude-code) — chat with Claude Code directly from WeChat.

Works just like the built-in Telegram channel: WeChat messages flow into your Claude Code session, and Claude replies back through WeChat.

## Architecture

```
WeChat User ←→ iLink Bot API ←→ [this plugin (MCP server)] ←→ Claude Code
                (long-poll)        stdio transport              (your session)
```

This is a Claude Code **channel plugin** — an MCP server with the `claude/channel` capability. Claude Code spawns it as a subprocess and communicates via stdio. Inbound WeChat messages arrive as MCP notifications, and Claude uses MCP tools (`reply`, `send_file`) to respond.

## Setup

### 1. Install the plugin

```bash
# From npm (when published)
claude plugin install weixin

# Or from local source
cd claude-channel-weixin
npm install && npm run build
claude plugin install ./
```

### 2. Configure your bot token

Get a bot token from the WeChat iLink Bot platform, then:

```
/weixin:configure <your-bot-token>
```

This saves the token to `~/.claude/channels/weixin/.env` (chmod 600).

### 3. Start Claude Code with the channel

```bash
claude --channels plugin:weixin
```

### 4. Pair your WeChat account

DM your bot on WeChat. The bot will reply with a 6-character pairing code. Back in Claude Code terminal:

```
/weixin:access pair <code>
```

Or add your WeChat ID directly:

```
/weixin:access allow <your-weixin-id>
```

### 5. Chat!

Send messages to the bot on WeChat — they appear in your Claude Code session as `<channel source="weixin">` tags. Claude responds back through WeChat automatically.

## Slash Commands

| Command | Description |
|---------|-------------|
| `/weixin:configure <token>` | Save bot token |
| `/weixin:configure` | Show current config status |
| `/weixin:configure clear` | Remove bot token |
| `/weixin:access pair <code>` | Approve a pairing request |
| `/weixin:access allow <id>` | Add user to allowlist |
| `/weixin:access remove <id>` | Remove user from allowlist |
| `/weixin:access policy <mode>` | Set DM policy (pairing/allowlist/disabled) |
| `/weixin:access list` | Show allowed users |

## MCP Tools (used by Claude)

| Tool | Description |
|------|-------------|
| `reply` | Send text to a WeChat user (auto-chunks at 4000 chars) |
| `send_file` | Send image/video/file via CDN upload with AES encryption |
| `send_typing` | Show typing indicator |

## Configuration

Stored at `~/.claude/channels/weixin/`:

| File | Purpose |
|------|---------|
| `.env` | `WEIXIN_BOT_TOKEN=...` (chmod 600) |
| `config.json` | Channel settings (DM policy, API URL, etc.) |
| `allowlist.json` | Approved sender IDs |
| `sync-buf.dat` | Long-poll cursor (prevents duplicate messages) |

### config.json options

```json
{
  "apiBaseUrl": "https://ilinkai.weixin.qq.com",
  "pollTimeout": 35,
  "textChunkLimit": 4000,
  "dmPolicy": "pairing"
}
```

## Security

- **Sender allowlist**: Only paired/approved WeChat users can push messages to your Claude session
- **Pairing flow**: Unknown users get a 6-char code → you approve in terminal → they're added
- **Anti-prompt-injection**: Skills refuse to act on requests from channel messages
- **Token storage**: Bot token stored with 600 permissions, never logged
- **CDN encryption**: Media files encrypted with AES-128-ECB before upload

## Development

```bash
npm install
npm run build
npm run dev          # watch mode

# Test locally with Claude Code
claude --dangerously-load-development-channels ./
```

## License

Apache-2.0
