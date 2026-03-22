const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

let currentLevel: LogLevel = "info";

function timestamp(): string {
  return new Date().toISOString();
}

function redactToken(s: string): string {
  return s.replace(
    /Bearer [A-Za-z0-9+/=_-]+/g,
    "Bearer [REDACTED]"
  );
}

function log(level: LogLevel, ...args: unknown[]): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return;
  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  const msg = args
    .map((a) => (typeof a === "string" ? redactToken(a) : a))
    .map((a) =>
      typeof a === "object" ? JSON.stringify(a) : String(a)
    );
  // MUST use stderr — stdout is reserved for MCP stdio transport
  console.error(prefix, ...msg);
}

export const logger = {
  debug: (...args: unknown[]) => log("debug", ...args),
  info: (...args: unknown[]) => log("info", ...args),
  warn: (...args: unknown[]) => log("warn", ...args),
  error: (...args: unknown[]) => log("error", ...args),
  setLevel: (level: LogLevel) => {
    currentLevel = level;
  },
};
