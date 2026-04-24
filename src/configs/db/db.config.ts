import mongoose from "mongoose";
import { logger } from "../../utils/logger.util";
import { console_util } from "../../utils/console.util";

const connectDB = async (): Promise<void> => {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        throw new Error("MONGO_URI is not defined in environment variables");
    }

    try {
        await mongoose.connect(uri, {
            autoIndex: process.env.NODE_ENV !== "production",
        });

        logger.info("MongoDB", "Connected successfully", { host: mongoose.connection.host });
        console_util.db("MongoDB", "Connected successfully", { host: mongoose.connection.host });

        mongoose.connection.on("error", (err) => {
            logger.error("MongoDB", "Connection error", { message: err.message, stack: err.stack });
            console_util.error("MongoDB", "Connection error", { message: err.message });
        });

        mongoose.connection.on("disconnected", () => {
            logger.warn("MongoDB", "Disconnected");
            console_util.warn("MongoDB", "Disconnected");
        });
    } catch (error) {
        logger.error("MongoDB", "Initial connection failed", { error });
        console_util.error("MongoDB", "Initial connection failed", { error });
        process.exit(1);
    }
};

export default connectDB;