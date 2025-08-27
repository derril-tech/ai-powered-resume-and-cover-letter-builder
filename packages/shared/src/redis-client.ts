import { createClient, RedisClientType } from 'redis';
import { getRedisConfig, validateRedisConfig } from '@ai-resume-builder/config';

export interface RedisClientOptions {
    keyPrefix?: string;
    enableReadyCheck?: boolean;
}

export class RedisService {
    private client: RedisClientType;
    private config: ReturnType<typeof getRedisConfig>;
    private isConnected: boolean = false;

    constructor(options: RedisClientOptions = {}) {
        this.config = getRedisConfig();
        validateRedisConfig(this.config);

        const clientConfig: any = {
            host: this.config.host,
            port: this.config.tls.enabled ? this.config.tlsPort : this.config.port,
            password: this.config.password,
            database: this.config.database,
            keyPrefix: options.keyPrefix || this.config.keyPrefix,
            enableReadyCheck: options.enableReadyCheck !== false,
        };

        if (this.config.tls.enabled) {
            clientConfig.tls = {
                ca: this.config.tls.ca,
                cert: this.config.tls.cert,
                key: this.config.tls.key,
                rejectUnauthorized: this.config.tls.rejectUnauthorized,
            };
        }

        this.client = createClient(clientConfig);

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.client.on('connect', () => {
            console.log('✅ Connected to Redis');
            this.isConnected = true;
        });

        this.client.on('error', (error) => {
            console.error('❌ Redis connection error:', error);
            this.isConnected = false;
        });

        this.client.on('end', () => {
            console.log('🔌 Redis connection ended');
            this.isConnected = false;
        });
    }

    async connect(): Promise<void> {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }

    async disconnect(): Promise<void> {
        if (this.isConnected) {
            await this.client.disconnect();
        }
    }

    async ping(): Promise<string> {
        await this.connect();
        return await this.client.ping();
    }

    // Key operations
    async set(key: string, value: string, ttl?: number): Promise<void> {
        await this.connect();
        if (ttl) {
            await this.client.setEx(key, ttl, value);
        } else {
            await this.client.set(key, value);
        }
    }

    async get(key: string): Promise<string | null> {
        await this.connect();
        return await this.client.get(key);
    }

    async del(key: string): Promise<number> {
        await this.connect();
        return await this.client.del(key);
    }

    async exists(key: string): Promise<number> {
        await this.connect();
        return await this.client.exists(key);
    }

    async expire(key: string, ttl: number): Promise<number> {
        await this.connect();
        return await this.client.expire(key, ttl);
    }

    async ttl(key: string): Promise<number> {
        await this.connect();
        return await this.client.ttl(key);
    }

    // Hash operations
    async hset(key: string, field: string, value: string): Promise<number> {
        await this.connect();
        return await this.client.hSet(key, field, value);
    }

    async hget(key: string, field: string): Promise<string | undefined> {
        await this.connect();
        return await this.client.hGet(key, field);
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        await this.connect();
        return await this.client.hGetAll(key);
    }

    async hdel(key: string, fields: string[]): Promise<number> {
        await this.connect();
        return await this.client.hDel(key, fields);
    }

    // List operations
    async lpush(key: string, values: string[]): Promise<number> {
        await this.connect();
        return await this.client.lPush(key, values);
    }

    async rpush(key: string, values: string[]): Promise<number> {
        await this.connect();
        return await this.client.rPush(key, values);
    }

    async lpop(key: string): Promise<string | null> {
        await this.connect();
        return await this.client.lPop(key);
    }

    async rpop(key: string): Promise<string | null> {
        await this.connect();
        return await this.client.rPop(key);
    }

    async llen(key: string): Promise<number> {
        await this.connect();
        return await this.client.lLen(key);
    }

    // Set operations
    async sadd(key: string, members: string[]): Promise<number> {
        await this.connect();
        return await this.client.sAdd(key, members);
    }

    async srem(key: string, members: string[]): Promise<number> {
        await this.connect();
        return await this.client.sRem(key, members);
    }

    async smembers(key: string): Promise<string[]> {
        await this.connect();
        return await this.client.sMembers(key);
    }

    async scard(key: string): Promise<number> {
        await this.connect();
        return await this.client.sCard(key);
    }

    // Utility methods
    async keys(pattern: string): Promise<string[]> {
        await this.connect();
        return await this.client.keys(pattern);
    }

    async flushdb(): Promise<void> {
        await this.connect();
        await this.client.flushDb();
    }

    async flushall(): Promise<void> {
        await this.connect();
        await this.client.flushAll();
    }

    // Transaction support
    async multi(): Promise<any> {
        await this.connect();
        return this.client.multi();
    }

    // Pub/Sub support
    async publish(channel: string, message: string): Promise<number> {
        await this.connect();
        return await this.client.publish(channel, message);
    }

    async subscribe(channel: string, callback: (message: string, channel: string) => void): Promise<void> {
        await this.connect();
        await this.client.subscribe(channel, callback);
    }

    async unsubscribe(channel?: string): Promise<void> {
        await this.connect();
        if (channel) {
            await this.client.unsubscribe(channel);
        } else {
            await this.client.unsubscribe();
        }
    }

    get isReady(): boolean {
        return this.isConnected;
    }

    get rawClient(): RedisClientType {
        return this.client;
    }
}

// Export singleton instance
export const redisService = new RedisService();
