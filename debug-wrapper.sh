#!/bin/bash
# Logs all MCP protocol traffic between Claude Code and the WeChat server
exec > >(tee -a /tmp/weixin-stdout.log) 2>/tmp/weixin-stderr.log
exec 0< <(tee -a /tmp/weixin-stdin.log)
exec node "$(dirname "$0")/dist/server.js"
