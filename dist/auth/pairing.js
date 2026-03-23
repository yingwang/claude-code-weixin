import { randomBytes } from "node:crypto";
const CODE_TTL_MS = 60 * 60 * 1000; // 1 hour
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
export class PairingManager {
    pending = new Map();
    /** Generate a pairing code for a sender */
    generateCode(senderId) {
        // Remove any existing code for this sender
        this.cleanupSender(senderId);
        const code = randomBytes(3).toString("hex"); // 6-char hex
        this.pending.set(code, {
            senderId,
            code,
            createdAt: Date.now(),
        });
        return code;
    }
    /** Validate a pairing code, returns senderId if valid */
    validateCode(code) {
        this.cleanup();
        const entry = this.pending.get(code);
        if (!entry)
            return null;
        this.pending.delete(code);
        return entry.senderId;
    }
    /** Deny/reject a pairing code */
    denyCode(code) {
        return this.pending.delete(code);
    }
    /** List all pending pairing requests */
    listPending() {
        this.cleanup();
        return [...this.pending.values()].map((p) => ({
            code: p.code,
            senderId: p.senderId,
            age: `${Math.round((Date.now() - p.createdAt) / 60_000)}m`,
        }));
    }
    cleanupSender(senderId) {
        for (const [code, entry] of this.pending) {
            if (entry.senderId === senderId) {
                this.pending.delete(code);
            }
        }
    }
    cleanup() {
        const now = Date.now();
        for (const [code, entry] of this.pending) {
            if (now - entry.createdAt > CODE_TTL_MS) {
                this.pending.delete(code);
            }
        }
    }
}
//# sourceMappingURL=pairing.js.map