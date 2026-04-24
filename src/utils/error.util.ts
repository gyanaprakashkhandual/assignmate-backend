import { Request, Response, NextFunction } from "express";
import { logger } from "./logger.util";
import { console_util } from "./console.util";

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly context: string;
    public readonly meta?: unknown;

    constructor(
        message: string,
        statusCode: number = 500,
        context: string = "App",
        isOperational: boolean = true,
        meta?: unknown
    ) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.context = context;
        this.meta = meta;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = "Resource", meta?: unknown) {
        super(`${resource} not found`, 404, "NotFoundError", true, meta);
        this.name = "NotFoundError";
    }
}

export class ValidationError extends AppError {
    constructor(message: string, meta?: unknown) {
        super(message, 422, "ValidationError", true, meta);
        this.name = "ValidationError";
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = "Unauthorized", meta?: unknown) {
        super(message, 401, "UnauthorizedError", true, meta);
        this.name = "UnauthorizedError";
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = "Forbidden", meta?: unknown) {
        super(message, 403, "ForbiddenError", true, meta);
        this.name = "ForbiddenError";
    }
}

export class ConflictError extends AppError {
    constructor(message: string, meta?: unknown) {
        super(message, 409, "ConflictError", true, meta);
        this.name = "ConflictError";
    }
}

export class InternalError extends AppError {
    constructor(message: string = "Internal server error", meta?: unknown) {
        super(message, 500, "InternalError", false, meta);
        this.name = "InternalError";
    }
}

const isMongooseDuplicateKeyError = (err: unknown): boolean => {
    return (
        typeof err === "object" &&
        err !== null &&
        (err as { code?: number }).code === 11000
    );
};

const isMongooseCastError = (err: unknown): boolean => {
    return (
        typeof err === "object" &&
        err !== null &&
        (err as { name?: string }).name === "CastError"
    );
};

const isMongooseValidationError = (err: unknown): boolean => {
    return (
        typeof err === "object" &&
        err !== null &&
        (err as { name?: string }).name === "ValidationError"
    );
};

export const normalizeError = (err: unknown): AppError => {
    if (err instanceof AppError) return err;

    if (isMongooseDuplicateKeyError(err)) {
        return new ConflictError("Duplicate key error", err);
    }

    if (isMongooseCastError(err)) {
        return new ValidationError("Invalid ID format", err);
    }

    if (isMongooseValidationError(err)) {
        const e = err as { message: string };
        return new ValidationError(e.message, err);
    }

    if (err instanceof Error) {
        return new InternalError(err.message, { stack: err.stack });
    }

    return new InternalError("An unexpected error occurred", err);
};

export const globalErrorHandler = (
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const normalized = normalizeError(err);

    logger.error(normalized.context, normalized.message, {
        statusCode: normalized.statusCode,
        method: req.method,
        url: req.originalUrl,
        meta: normalized.meta,
        stack: normalized.stack,
    });

    console_util.error(
        normalized.context,
        `[${normalized.statusCode}] ${normalized.message}`
    );

    res.status(normalized.statusCode).json({
        success: false,
        statusCode: normalized.statusCode,
        message: normalized.message,
        ...(process.env.NODE_ENV !== "production" && {
            stack: normalized.stack,
        }),
    });
};

export const catchAsync =
    (
        fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
    ) =>
        (req: Request, res: Response, next: NextFunction): void => {
            fn(req, res, next).catch(next);
        };