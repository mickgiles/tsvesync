/**
 * Logger module for VeSync library
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

export interface Logger {
    debug: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    setLevel?: (level: LogLevel) => void;
    getLevel?: () => LogLevel | undefined;
}

class DefaultLogger implements Logger {
    private currentLevel: LogLevel = LogLevel.INFO;

    setLevel(level: LogLevel): void {
        this.currentLevel = level;
    }

    getLevel(): LogLevel | undefined {
        return this.currentLevel;
    }

    debug(message: string, ...args: any[]): void {
        if (this.currentLevel <= LogLevel.DEBUG) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.currentLevel <= LogLevel.INFO) {
            console.info(`[INFO] ${message}`, ...args);
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.currentLevel <= LogLevel.WARN) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    }

    error(message: string, ...args: any[]): void {
        if (this.currentLevel <= LogLevel.ERROR) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
}

// Default logger implementation
const defaultLogger: Logger = new DefaultLogger();

// Current logger instance
let currentLogger: Logger = defaultLogger;

/**
 * Set a custom logger implementation
 * @param customLogger - Custom logger implementation
 */
export function setLogger(customLogger: Logger): void {
    currentLogger = customLogger;
}

/**
 * Reset to default logger
 */
export function resetLogger(): void {
    currentLogger = defaultLogger;
}

/**
 * Get the current logger instance
 */
export function getLogger(): Logger {
    return currentLogger;
}

/**
 * Set the log level (only works with default logger)
 * @param level - The log level to set
 */
export function setLogLevel(level: LogLevel): void {
    if (currentLogger === defaultLogger) {
        (currentLogger as DefaultLogger).setLevel(level);
    }
}

/**
 * Get the current log level (only works with default logger)
 * @returns The current log level or undefined if using custom logger
 */
export function getLogLevel(): LogLevel | undefined {
    if (currentLogger === defaultLogger) {
        return (currentLogger as DefaultLogger).getLevel();
    }
    return undefined;
}

// Export the logger interface for use throughout the application
export const logger: Logger = {
    debug: (message: string, ...args: any[]) => currentLogger.debug(message, ...args),
    info: (message: string, ...args: any[]) => currentLogger.info(message, ...args),
    warn: (message: string, ...args: any[]) => currentLogger.warn(message, ...args),
    error: (message: string, ...args: any[]) => currentLogger.error(message, ...args),
    setLevel: (level: LogLevel) => setLogLevel(level),
    getLevel: () => getLogLevel()
}; 