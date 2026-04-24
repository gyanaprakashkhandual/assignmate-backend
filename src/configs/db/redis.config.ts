import Redis from "ioredis";
import { logger } from "../../utils/logger.util";
import { console_util } from "../../utils/console.util";

const redis = new Redis({
    host: process.env.REDIS_HOST!,
    port: Number(process.env.REDIS_PORT!),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB ?? 0),
    retryStrategy: (times) => Math.min(times * 50, 2000),
    lazyConnect: true,
});

redis.on("connect", () => {
    logger.info("Redis", "Connected successfully");
    console_util.db("Redis", "Connected successfully");
});

redis.on("error", (err) => {
    logger.error("Redis", "Connection error", { message: err.message, stack: err.stack });
    console_util.error("Redis", "Connection error", { message: err.message });
});

async function set(key: string, value: unknown, ttlSeconds?: number) {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
        await redis.set(key, serialized, "EX", ttlSeconds);
    } else {
        await redis.set(key, serialized);
    }
}

async function get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
}

async function del(...keys: string[]) {
    return redis.del(...keys);
}

async function exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
}

async function expire(key: string, ttlSeconds: number) {
    return redis.expire(key, ttlSeconds);
}

async function ttl(key: string) {
    return redis.ttl(key);
}

async function incr(key: string) {
    return redis.incr(key);
}

async function incrBy(key: string, value: number) {
    return redis.incrby(key, value);
}

async function hset(key: string, field: string, value: unknown) {
    return redis.hset(key, field, JSON.stringify(value));
}

async function hget<T>(key: string, field: string): Promise<T | null> {
    const data = await redis.hget(key, field);
    if (!data) return null;
    return JSON.parse(data) as T;
}

async function hgetall<T extends Record<string, unknown>>(
    key: string
): Promise<T | null> {
    const data = await redis.hgetall(key);
    if (!data || Object.keys(data).length === 0) return null;
    return Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, JSON.parse(v)])
    ) as T;
}

async function hdel(key: string, ...fields: string[]) {
    return redis.hdel(key, ...fields);
}

async function lpush(key: string, ...values: unknown[]) {
    return redis.lpush(key, ...values.map((v) => JSON.stringify(v)));
}

async function rpush(key: string, ...values: unknown[]) {
    return redis.rpush(key, ...values.map((v) => JSON.stringify(v)));
}

async function lrange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const data = await redis.lrange(key, start, stop);
    return data.map((item) => JSON.parse(item) as T);
}

async function llen(key: string) {
    return redis.llen(key);
}

async function sadd(key: string, ...members: string[]) {
    return redis.sadd(key, ...members);
}

async function sismember(key: string, member: string): Promise<boolean> {
    const result = await redis.sismember(key, member);
    return result === 1;
}

async function smembers(key: string) {
    return redis.smembers(key);
}

async function srem(key: string, ...members: string[]) {
    return redis.srem(key, ...members);
}

async function flushdb() {
    return redis.flushdb();
}

async function keys(pattern: string) {
    return redis.keys(pattern);
}

async function cacheOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number
): Promise<T> {
    const cached = await get<T>(key);
    if (cached !== null) return cached;
    const fresh = await fetcher();
    await set(key, fresh, ttlSeconds);
    return fresh;
}

async function rateLimitCheck(
    identifier: string,
    limit: number,
    windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = `ratelimit:${identifier}`;
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, windowSeconds);
    const resetIn = await redis.ttl(key);
    return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetIn,
    };
}

export {
    redis,
    set,
    get,
    del,
    exists,
    expire,
    ttl,
    incr,
    incrBy,
    hset,
    hget,
    hgetall,
    hdel,
    lpush,
    rpush,
    lrange,
    llen,
    sadd,
    sismember,
    smembers,
    srem,
    flushdb,
    keys,
    cacheOrFetch,
    rateLimitCheck,
};