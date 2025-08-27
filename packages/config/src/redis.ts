export interface RedisConfig {
    host: string;
    port: number;
    tlsPort: number;
    password?: string;
    tls: {
        enabled: boolean;
        ca?: string;
        cert?: string;
        key?: string;
        rejectUnauthorized?: boolean;
    };
    database?: number;
    keyPrefix?: string;
}

export const getRedisConfig = (): RedisConfig => {
    const config: RedisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        tlsPort: parseInt(process.env.REDIS_TLS_PORT || '6380'),
        password: process.env.REDIS_PASSWORD,
        tls: {
            enabled: process.env.REDIS_TLS_ENABLED === 'true' || process.env.NODE_ENV === 'production',
            ca: process.env.REDIS_TLS_CA,
            cert: process.env.REDIS_TLS_CERT,
            key: process.env.REDIS_TLS_KEY,
            rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
        database: parseInt(process.env.REDIS_DATABASE || '0'),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'resume-builder:',
    };

    return config;
};

export const validateRedisConfig = (config: RedisConfig): void => {
    if (config.tls.enabled) {
        if (!config.tls.ca) {
            throw new Error('REDIS_TLS_CA is required when TLS is enabled');
        }
    }

    if (config.password && config.password.length < 8) {
        console.warn('Redis password is shorter than 8 characters. Consider using a stronger password.');
    }
};
