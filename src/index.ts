import "dotenv/config";
import app from "./app";
import connectDB from "./configs/db/db.config";
import { logger } from "./utils/logger.util";
import { console_util } from "./utils/console.util";

const PORT = process.env.PORT ? parseInt(process.env.PORT.split(':').pop() || '5000') : 5000;

const startServer = async (): Promise<void> => {
    try {
        console_util.server("Server", "Starting server initialization");
        logger.info("Server", "Environment variables loaded", {
            PORT: PORT,
            RAW_PORT: process.env.PORT,
            NODE_ENV: process.env.NODE_ENV,
            API_BASE_URL: process.env.API_BASE_URL,
            hasMongoURI: !!process.env.MONGO_URI,
            hasSpotifyClientId: !!process.env.SPOTIFY_CLIENT_ID,
            hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        });

        console_util.db("Database", "Attempting MongoDB connection");
        await connectDB();
        console_util.success("Database", "MongoDB connected successfully");
        logger.info("Database", "MongoDB connection successful");

        const routes: any[] = [];

        if (app._router && app._router.stack) {
            // @ts-ignore
            app._router.stack.forEach((middleware: any) => {
                if (middleware.route) {
                    const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
                    routes.push({
                        path: middleware.route.path,
                        methods: methods
                    });
                    console_util.verbose("Routes", `${methods} ${middleware.route.path}`);
                } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
                    middleware.handle.stack.forEach((handler: any) => {
                        if (handler.route) {
                            const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
                            let basePath = '';

                            if (middleware.regexp) {
                                basePath = middleware.regexp.source
                                    .replace(/\\\//g, '/')
                                    .replace(/\^/g, '')
                                    .replace(/\?\(\?=\\\/\|\$\)\/i/g, '')
                                    .replace(/\?\(\?=\\\/\|\$\)/g, '')
                                    .replace(/\\/g, '');
                            }

                            const fullPath = basePath + handler.route.path;
                            routes.push({
                                path: fullPath,
                                methods: methods
                            });
                            console_util.verbose("Routes", `${methods} ${fullPath}`);
                        }
                    });
                }
            });
            console_util.divider();
            logger.info("Server", `Total routes registered: ${routes.length}`);
        } else {
            logger.warn("Server", "No routes registered yet");
            console_util.divider();
        }

        console_util.server("Server", `Attempting to bind server to 127.0.0.1:${PORT}`);

        const server = app.listen(PORT, () => {
            console_util.success("Server", "Server successfully started");
            logger.info("Server", "Server started successfully", { port: PORT });

            console_util.verbose("Server", `Running on port ${PORT}`);
        });

        server.on('error', (error: any) => {
            logger.error("Server", "Server error occurred", { error: error.message, code: error.code });
            console_util.error("Server", `Server error: ${error.message}`);

            if (error.code === 'EADDRINUSE') {
                logger.error("Server", `Port ${PORT} is already in use`);
                console_util.error("Server", `Port ${PORT} is already in use`);
            } else if (error.code === 'EACCES') {
                logger.error("Server", `Permission denied to bind to port ${PORT}`);
                console_util.error("Server", `Permission denied to bind to port ${PORT}`);
            }
            process.exit(1);
        });

        const shutdown = (signal: string) => {
            logger.info("Server", `${signal} received. Shutting down gracefully`, { signal });
            console_util.warn("Server", `${signal} received. Shutting down gracefully`);

            server.close(() => {
                logger.info("Server", "HTTP server closed successfully");
                console_util.success("Server", "HTTP server closed");
                process.exit(0);
            });

            setTimeout(() => {
                logger.error("Server", "Could not close connections in time, forcefully shutting down");
                console_util.error("Server", "Forced shutdown due to timeout");
                process.exit(1);
            }, 10000);
        };

        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));

        process.on("unhandledRejection", (reason: unknown, promise: Promise<any>) => {
            logger.error("Server", "Unhandled promise rejection", { reason, promise });
            console_util.error("Server", "Unhandled promise rejection");
            server.close(() => process.exit(1));
        });

        process.on("uncaughtException", (error: Error) => {
            logger.error("Server", "Uncaught exception", { error: error.message, stack: error.stack });
            console_util.error("Server", "Uncaught exception");
            server.close(() => process.exit(1));
        });

    } catch (error) {
        logger.error("Server", "Failed to start server", { error });
        console_util.error("Server", "Failed to start server");
        process.exit(1);
    }
};

startServer().catch((error) => {
    logger.error("Server", "Fatal error during startup", { error });
    console_util.error("Server", "Fatal error during startup");
    process.exit(1);
});