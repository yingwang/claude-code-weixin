/**
 * Interactive QR code login flow.
 * 1. Fetch QR code URL from iLink API (bot_type=3)
 * 2. Display QR code in terminal
 * 3. Poll for scan status until confirmed or timeout
 * 4. Save bot_token to ~/.claude/channels/weixin/.env
 */
export declare function loginFlow(apiBaseUrl?: string): Promise<string>;
