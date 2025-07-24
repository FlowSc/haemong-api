import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | object;
  error?: string;
  stack?: string;
  requestId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly winstonLogger: WinstonLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;

    let status: number;
    let message: string | object;
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
      } else {
        message = exceptionResponse;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal Server Error';
      error = exception.name;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unknown error occurred';
      error = 'UnknownError';
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp,
      path,
      method,
      message,
      error,
      requestId,
    };

    // Add stack trace in development
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    // Log the error with Winston
    const logLevel = status >= 500 ? 'error' : 'warn';
    const logMessage = `${method} ${path} - ${status} - ${
      exception instanceof Error ? exception.message : 'Unknown error'
    }`;

    this.winstonLogger.log(logLevel, logMessage, {
      context: 'GlobalExceptionFilter',
      statusCode: status,
      path,
      method,
      requestId,
      userAgent: request.get('user-agent'),
      ip: request.ip,
      stack: exception instanceof Error ? exception.stack : undefined,
      body: this.sanitizeRequestBody(request.body),
      query: request.query,
      params: request.params,
    });

    // Also log with NestJS logger for console output
    if (status >= 500) {
      this.logger.error(
        `${method} ${path} - ${status} - ${
          exception instanceof Error ? exception.message : 'Unknown error'
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${method} ${path} - ${status} - ${message}`);
    }

    response.status(status).json(errorResponse);
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return body;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}