import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const NODE_ENV = process.env.NODE_ENV ?? "development";

const envFileMap: Record<string, string> = {
    development: ".env.local",
    staging: ".env.staging",
    production: ".env.production",
};

const envFile = envFileMap[NODE_ENV] ?? ".env.local";
const envFilePath = path.resolve(process.cwd(), envFile);

if (!fs.existsSync(envFilePath)) {
    throw new Error(`Env file not found: ${envFilePath} (NODE_ENV=${NODE_ENV})`);
}

dotenv.config({ path: envFilePath });

const requireEnv = (key: string): string => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

const config = {
    env: NODE_ENV,

    server: {
        port: parseInt(process.env.PORT ?? "5000", 10),
        host: process.env.HOST ?? "0.0.0.0",
        apiPrefix: process.env.API_PREFIX ?? "/api",
        corsOrigin: process.env.CORS_ORIGIN ?? "*",
    },

    db: {
        uri: requireEnv("MONGO_URI"),
        name: process.env.MONGO_DB_NAME,
        poolSize: parseInt(process.env.MONGO_POOL_SIZE ?? "10", 10),
    },

    jwt: {
        secret: requireEnv("JWT_SECRET"),
        expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
        refreshSecret: requireEnv("JWT_REFRESH_SECRET"),
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "30d",
    },

    bcrypt: {
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? "12", 10),
    },

    flags: {
        isDevelopment: NODE_ENV === "development",
        isStaging: NODE_ENV === "staging",
        isProduction: NODE_ENV === "production",
    },
} as const;

export type AppConfig = typeof config;
export default config;