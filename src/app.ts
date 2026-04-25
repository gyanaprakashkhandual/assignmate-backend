import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import "./configs/integration/passport.config";
import { logger } from "./utils/logger.util";
import { console_util } from "./utils/console.util";
import { globalErrorHandler } from "./utils/error.util";

/* Core Imports (Router) */
import authRouter from "./routes/core/user.route";
import profileRouter from "./routes/core/profile.route";

const app: Application = express();

app.use(helmet());

const ALLOWED_ORIGINS = [
    process.env.CLIENT_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
].filter(Boolean) as string[];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || ALLOWED_ORIGINS.includes(origin)) {
                callback(null, true);
            } else {
                const error = new Error(`CORS blocked: ${origin}`);
                logger.warn("CORS", `CORS blocked for origin: ${origin}`);
                callback(error);
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many auth attempts, please try again later" },
});


app.get("/health", (_req: Request, res: Response) => {
    console_util.success("Server", "Health check passed");
    res.status(200).json({ success: true, message: "Server is healthy" });
});

/* Core Routes */
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);

app.use((_req: Request, res: Response) => {
    logger.warn("Server", "Route not found", { path: _req.path, method: _req.method });
    console_util.warn("Server", "Route not found");
    res.status(404).json({ success: false, message: "Route not found" });
});

app.use(globalErrorHandler);

export default app;