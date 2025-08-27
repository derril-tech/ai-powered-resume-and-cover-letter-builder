import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const getThrottlerConfig = (): ThrottlerModuleOptions => {
    return {
        ttl: parseInt(process.env.THROTTLE_TTL || '60'), // 60 seconds
        limit: parseInt(process.env.THROTTLE_LIMIT || '100'), // 100 requests per ttl
    };
};
