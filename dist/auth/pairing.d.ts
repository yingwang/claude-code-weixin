/**
 * Manages pairing codes for authorizing new WeChat senders.
 *
 * Flow:
 * 1. Unknown user DMs the bot
 * 2. Bot replies with a 6-char hex pairing code
 * 3. User tells the Claude Code operator the code
 * 4. Operator runs `/weixin:access pair <code>` in terminal
 * 5. Sender is added to allowlist
 */
export declare class PairingManager {
    private pending;
    /** Generate a pairing code for a sender */
    generateCode(senderId: string): string;
    /** Validate a pairing code, returns senderId if valid */
    validateCode(code: string): string | null;
    /** Deny/reject a pairing code */
    denyCode(code: string): boolean;
    /** List all pending pairing requests */
    listPending(): Array<{
        code: string;
        senderId: string;
        age: string;
    }>;
    private cleanupSender;
    private cleanup;
}
