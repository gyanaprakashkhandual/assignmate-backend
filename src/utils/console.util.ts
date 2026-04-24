type Color = keyof typeof COLORS;

const COLORS = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    bgRed: "\x1b[41m",
    bgYellow: "\x1b[43m",
    bgGreen: "\x1b[42m",
    bgBlue: "\x1b[44m",
    bgMagenta: "\x1b[45m",
    bgCyan: "\x1b[46m",
} as const;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const colorize = (color: Color, text: string): string => {
    if (IS_PRODUCTION) return text;
    return `${COLORS[color]}${text}${COLORS.reset}`;
};

const timestamp = (): string =>
    colorize("dim", `[${new Date().toISOString()}]`);

const label = (tag: string, color: Color): string =>
    colorize(color, `[${tag.toUpperCase()}]`);

const context_tag = (ctx: string): string =>
    colorize("cyan", `[${ctx}]`);

const formatMessage = (
    tag: string,
    tagColor: Color,
    ctx: string,
    message: string,
    meta?: unknown
): string => {
    const parts = [
        timestamp(),
        label(tag, tagColor),
        context_tag(ctx),
        message,
    ];

    if (meta !== undefined) {
        const metaStr =
            typeof meta === "object"
                ? JSON.stringify(meta, null, 2)
                : String(meta);
        parts.push(colorize("dim", metaStr));
    }

    return parts.join(" ");
};

export const console_util = {
    info: (context: string, message: string, meta?: unknown): void => {
        console.log(formatMessage("info", "green", context, message, meta));
    },

    warn: (context: string, message: string, meta?: unknown): void => {
        console.warn(formatMessage("warn", "yellow", context, message, meta));
    },

    error: (context: string, message: string, meta?: unknown): void => {
        console.error(formatMessage("error", "red", context, message, meta));
    },

    debug: (context: string, message: string, meta?: unknown): void => {
        if (IS_PRODUCTION) return;
        console.debug(formatMessage("debug", "magenta", context, message, meta));
    },

    verbose: (context: string, message: string, meta?: unknown): void => {
        if (IS_PRODUCTION) return;
        console.log(formatMessage("verbose", "blue", context, message, meta));
    },

    success: (context: string, message: string, meta?: unknown): void => {
        console.log(formatMessage("success", "bgGreen", context, message, meta));
    },

    db: (context: string, message: string, meta?: unknown): void => {
        console.log(formatMessage("db", "bgCyan", context, message, meta));
    },

    server: (context: string, message: string, meta?: unknown): void => {
        console.log(formatMessage("server", "bgBlue", context, message, meta));
    },

    table: (context: string, data: object[]): void => {
        console.log(
            `${timestamp()} ${label("table", "cyan")} ${context_tag(context)}`
        );
        console.table(data);
    },

    divider: (label_text?: string): void => {
        if (IS_PRODUCTION) return;
        const line = "─".repeat(60);
        const output = label_text
            ? `${colorize("dim", line)} ${colorize("bold", label_text)} ${colorize("dim", line)}`
            : colorize("dim", line);
        console.log(output);
    },
};