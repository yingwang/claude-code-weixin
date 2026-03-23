declare const LOG_LEVELS: {
    readonly debug: 0;
    readonly info: 1;
    readonly warn: 2;
    readonly error: 3;
};
type LogLevel = keyof typeof LOG_LEVELS;
export declare const logger: {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    setLevel: (level: LogLevel) => void;
};
export {};
