const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
let currentLevel = "info";
function timestamp() {
    return new Date().toISOString();
}
function redactToken(s) {
    return s.replace(/Bearer [A-Za-z0-9+/=_-]+/g, "Bearer [REDACTED]");
}
function log(level, ...args) {
    if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel])
        return;
    const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
    const msg = args
        .map((a) => (typeof a === "string" ? redactToken(a) : a))
        .map((a) => typeof a === "object" ? JSON.stringify(a) : String(a));
    // MUST use stderr — stdout is reserved for MCP stdio transport
    console.error(prefix, ...msg);
}
export const logger = {
    debug: (...args) => log("debug", ...args),
    info: (...args) => log("info", ...args),
    warn: (...args) => log("warn", ...args),
    error: (...args) => log("error", ...args),
    setLevel: (level) => {
        currentLevel = level;
    },
};
//# sourceMappingURL=logger.js.map