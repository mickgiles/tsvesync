/**
 * Logger utility for TSVeSync
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4
}

export class Logger {
    private static instance: Logger;
    private currentLevel: LogLevel = LogLevel.INFO;

    private constructor() {}

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    setLevel(level: LogLevel): void {
        this.currentLevel = level;
    }

    getLevel(): LogLevel {
        return this.currentLevel;
    }

    debug(message: string, ...args: any[]): void {
        if (this.currentLevel <= LogLevel.DEBUG) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.currentLevel <= LogLevel.INFO) {
            console.log(`[INFO] ${message}`, ...args);
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

// Export singleton instance
export const logger = Logger.getInstance(); 