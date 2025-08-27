export interface S3Config {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    region: string;
    buckets: {
        uploads: string;
        exports: string;
        assets: string;
    };
    publicUrl?: string;
}

export const getS3Config = (): S3Config => {
    const config: S3Config = {
        endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
        accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
        region: process.env.S3_REGION || 'us-east-1',
        buckets: {
            uploads: process.env.S3_UPLOADS_BUCKET || 'resume-builder-uploads',
            exports: process.env.S3_EXPORTS_BUCKET || 'resume-builder-exports',
            assets: process.env.S3_ASSETS_BUCKET || 'resume-builder-assets',
        },
    };

    // In production, you might want to construct the public URL differently
    if (process.env.NODE_ENV === 'production') {
        config.publicUrl = process.env.S3_PUBLIC_URL;
    } else {
        config.publicUrl = config.endpoint;
    }

    return config;
};

export const validateS3Config = (config: S3Config): void => {
    const requiredFields = ['endpoint', 'accessKey', 'secretKey', 'region'];
    const missingFields = requiredFields.filter(field => !config[field as keyof S3Config]);

    if (missingFields.length > 0) {
        throw new Error(`Missing required S3 configuration: ${missingFields.join(', ')}`);
    }

    // Validate endpoint URL format
    try {
        new URL(config.endpoint);
    } catch {
        throw new Error('Invalid S3 endpoint URL format');
    }
};
