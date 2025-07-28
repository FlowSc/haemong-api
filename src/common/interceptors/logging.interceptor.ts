import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly winstonLogger: WinstonLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url, body, query, params, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = request.ip || request.connection.remoteAddress;

    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Add request ID to response headers for tracking
    response.setHeader('X-Request-ID', requestId);

    const logData = {
      context: 'HTTP',
      method,
      url,
      userAgent,
      ip,
      requestId,
      body: this.sanitizeRequestBody(body),
      query,
      params,
    };

    this.winstonLogger.info(`Incoming Request: ${method} ${url}`, logData);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          const statusCode = response.statusCode;

          this.winstonLogger.info(
            `Outgoing Response: ${method} ${url} - ${statusCode} - ${responseTime}ms`,
            {
              ...logData,
              statusCode,
              responseTime,
              responseSize: JSON.stringify(data).length,
            },
          );

          this.logger.log(`${method} ${url} ${statusCode} ${responseTime}ms`);
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;

          this.winstonLogger.error(
            `Request Error: ${method} ${url} - ${responseTime}ms`,
            {
              ...logData,
              responseTime,
              error: error.message,
              stack: error.stack,
            },
          );
        },
      }),
    );
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return body;

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
    ];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
