import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { ZodError } from 'zod';

export interface ProblemDetails {
    type: string;
    title: string;
    status: number;
    detail?: string;
    instance?: string;
    errors?: Record<string, string[]>;
    timestamp: string;
}

@Catch()
export class ProblemDetailsExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(ProblemDetailsExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let problem: ProblemDetails;

        if (exception instanceof HttpException) {
            problem = this.handleHttpException(exception, request);
        } else if (exception instanceof ZodError) {
            problem = this.handleZodError(exception, request);
        } else if (exception instanceof QueryFailedError) {
            problem = this.handleQueryFailedError(exception, request);
        } else if (exception instanceof EntityNotFoundError) {
            problem = this.handleEntityNotFoundError(exception, request);
        } else {
            problem = this.handleUnknownError(exception, request);
        }

        this.logger.error(
            `HTTP ${problem.status} Error: ${problem.title}`,
            exception instanceof Error ? exception.stack : String(exception),
        );

        response.status(problem.status).json(problem);
    }

    private handleHttpException(exception: HttpException, request: Request): ProblemDetails {
        const status = exception.getStatus();
        const response = exception.getResponse();

        const problem: ProblemDetails = {
            type: `https://httpstatuses.com/${status}`,
            title: this.getTitleForStatus(status),
            status,
            timestamp: new Date().toISOString(),
            instance: (request as any).url,
        };

        if (typeof response === 'string') {
            problem.detail = response;
        } else if (typeof response === 'object' && response !== null) {
            const responseObj = response as any;
            if (responseObj.message) {
                if (Array.isArray(responseObj.message)) {
                    problem.errors = { general: responseObj.message };
                } else {
                    problem.detail = responseObj.message;
                }
            }
            if (responseObj.errors) {
                problem.errors = responseObj.errors;
            }
        }

        return problem;
    }

    private handleZodError(exception: ZodError, request: Request): ProblemDetails {
        const errors: Record<string, string[]> = {};

        exception.errors.forEach((error) => {
            const path = error.path.join('.');
            if (!errors[path]) {
                errors[path] = [];
            }
            errors[path].push(error.message);
        });

        return {
            type: 'https://tools.ietf.org/html/rfc7807',
            title: 'Validation Error',
            status: HttpStatus.BAD_REQUEST,
            detail: 'Request validation failed',
            instance: (request as any).url,
            errors,
            timestamp: new Date().toISOString(),
        };
    }

    private handleQueryFailedError(exception: QueryFailedError, request: Request): ProblemDetails {
        // Don't expose internal database errors in production
        const isDevelopment = process.env.NODE_ENV !== 'production';

        return {
            type: 'https://httpstatuses.com/400',
            title: 'Database Error',
            status: HttpStatus.BAD_REQUEST,
            detail: isDevelopment ? exception.message : 'A database error occurred',
            instance: (request as any).url,
            timestamp: new Date().toISOString(),
        };
    }

    private handleEntityNotFoundError(exception: EntityNotFoundError, request: Request): ProblemDetails {
        return {
            type: 'https://httpstatuses.com/404',
            title: 'Resource Not Found',
            status: HttpStatus.NOT_FOUND,
            detail: 'The requested resource was not found',
            instance: (request as any).url,
            timestamp: new Date().toISOString(),
        };
    }

    private handleUnknownError(exception: unknown, request: Request): ProblemDetails {
        const isDevelopment = process.env.NODE_ENV !== 'production';
        const error = exception as Error;

        return {
            type: 'https://httpstatuses.com/500',
            title: 'Internal Server Error',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            detail: isDevelopment ? error.message : 'An unexpected error occurred',
            instance: (request as any).url,
            timestamp: new Date().toISOString(),
        };
    }

    private getTitleForStatus(status: number): string {
        const statusTitles: Record<number, string> = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            409: 'Conflict',
            422: 'Unprocessable Entity',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
        };

        return statusTitles[status] || 'HTTP Error';
    }
}
