export interface NatsConfig {
    servers: string[];
    tls: {
        enabled: boolean;
        ca?: string;
        cert?: string;
        key?: string;
        rejectUnauthorized?: boolean;
    };
    user?: string;
    password?: string;
    token?: string;
    jetstream: {
        enabled: boolean;
        maxMemory?: string;
        maxFile?: string;
    };
    connection: {
        name?: string;
        timeout?: number;
        pingInterval?: number;
        maxPingOut?: number;
        maxReconnectAttempts?: number;
        reconnectDelayHandler?: () => number;
    };
}

export const getNatsConfig = (): NatsConfig => {
    const config: NatsConfig = {
        servers: (process.env.NATS_SERVERS || 'nats://localhost:4222').split(','),
        tls: {
            enabled: process.env.NATS_TLS_ENABLED === 'true' || process.env.NODE_ENV === 'production',
            ca: process.env.NATS_TLS_CA,
            cert: process.env.NATS_TLS_CERT,
            key: process.env.NATS_TLS_KEY,
            rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
        user: process.env.NATS_USER,
        password: process.env.NATS_PASSWORD,
        token: process.env.NATS_TOKEN,
        jetstream: {
            enabled: process.env.NATS_JETSTREAM_ENABLED !== 'false',
            maxMemory: process.env.NATS_JETSTREAM_MAX_MEMORY || '1GB',
            maxFile: process.env.NATS_JETSTREAM_MAX_FILE || '10GB',
        },
        connection: {
            name: process.env.NATS_CONNECTION_NAME || 'ai-resume-builder',
            timeout: parseInt(process.env.NATS_TIMEOUT || '30000'),
            pingInterval: parseInt(process.env.NATS_PING_INTERVAL || '30000'),
            maxPingOut: parseInt(process.env.NATS_MAX_PING_OUT || '2'),
            maxReconnectAttempts: parseInt(process.env.NATS_MAX_RECONNECT_ATTEMPTS || '-1'),
        },
    };

    return config;
};

export const validateNatsConfig = (config: NatsConfig): void => {
    if (!config.servers || config.servers.length === 0) {
        throw new Error('At least one NATS server must be configured');
    }

    if (config.tls.enabled) {
        if (!config.tls.ca) {
            throw new Error('NATS_TLS_CA is required when TLS is enabled');
        }
    }

    // Validate server URLs
    config.servers.forEach(server => {
        try {
            new URL(server);
        } catch {
            throw new Error(`Invalid NATS server URL: ${server}`);
        }
    });
};
