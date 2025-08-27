import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ProblemDetailsExceptionFilter } from './common/filters/problem-details.filter';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
    });

    // Global validation pipe with Zod support
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
        new ZodValidationPipe(),
    );

    // Global exception filter for Problem+JSON responses
    app.useGlobalFilters(new ProblemDetailsExceptionFilter());

    // Swagger/OpenAPI configuration
    const config = new DocumentBuilder()
        .setTitle('AI-Powered Resume Builder API')
        .setDescription('API for AI-powered resume and cover letter generation')
        .setVersion('1.0')
        .addTag('organizations')
        .addTag('users')
        .addTag('projects')
        .addTag('jobs')
        .addTag('resumes')
        .addTag('variants')
        .addTag('cover-letters')
        .addTag('exports')
        .addTag('assets')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'Enter JWT token',
                in: 'header',
            },
            'JWT-auth',
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
    });

    // Enable trust proxy for proper IP forwarding
    app.set('trust proxy', 1);

    // Global prefix for all routes
    app.setGlobalPrefix('api/v1');

    const port = process.env.PORT || 3001;
    await app.listen(port);

    console.log(`🚀 Application is running on: http://localhost:${port}`);
    console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}

bootstrap();
