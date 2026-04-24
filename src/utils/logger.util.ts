import fs from "fs";
import path from "path";

export type LogLevel = "info" | "warn" | "error" | "debug" | "verbose";

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    context: string;
    message: string;
    meta?: unknown;
}

const LOG_DIR = path.resolve(process.cwd(), "logs");

const ensureLogDir = (): void => {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
};

const formatTimestamp = (): string => new Date().toISOString();

const buildEntry = (
    level: LogLevel,
    context: string,
    message: string,
    meta?: unknown
): LogEntry => ({
    timestamp: formatTimestamp(),
    level,
    context,
    message,
    ...(meta !== undefined && { meta }),
});

const writeToFile = (filename: string, entry: LogEntry): void => {
    ensureLogDir();
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(path.join(LOG_DIR, filename), line, "utf8");
};

const persistEntry = (entry: LogEntry): void => {
    const date = new Date().toISOString().split("T")[0];
    writeToFile(`app-${date}.log`, entry);
    if (entry.level === "error") {
        writeToFile(`error-${date}.log`, entry);
    }
};

export const logger = {
    info: (context: string, message: string, meta?: unknown): void => {
        const entry = buildEntry("info", context, message, meta);
        persistEntry(entry);
    },

    warn: (context: string, message: string, meta?: unknown): void => {
        const entry = buildEntry("warn", context, message, meta);
        persistEntry(entry);
    },

    error: (context: string, message: string, meta?: unknown): void => {
        const entry = buildEntry("error", context, message, meta);
        persistEntry(entry);
    },

    debug: (context: string, message: string, meta?: unknown): void => {
        if (process.env.NODE_ENV === "production") return;
        const entry = buildEntry("debug", context, message, meta);
        persistEntry(entry);
    },

    verbose: (context: string, message: string, meta?: unknown): void => {
        if (process.env.NODE_ENV === "production") return;
        const entry = buildEntry("verbose", context, message, meta);
        persistEntry(entry);
    },
};