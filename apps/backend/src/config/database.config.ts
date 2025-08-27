import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as entities from '../entities';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
        type: 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'resume_builder',
        ssl: isProduction ? { rejectUnauthorized: false } : false,
        synchronize: !isProduction, // Auto-sync schema in development
        dropSchema: false,
        logging: !isProduction,
        entities: Object.values(entities),
        migrations: ['dist/migrations/*{.ts,.js}'],
        migrationsRun: isProduction,
        cli: {
            migrationsDir: 'src/migrations',
        },
        extra: {
            max: 20, // Maximum number of connections
            min: 2, // Minimum number of connections
            idleTimeoutMillis: 30000,
            acquireTimeoutMillis: 60000,
        },
    };
};
