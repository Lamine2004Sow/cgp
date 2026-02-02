import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponseShape {
  message?: string | string[];
  error?: string;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const payload = exception.getResponse();
    const normalized = this.normalizePayload(payload);

    response.status(status).json({
      statusCode: status,
      error: normalized.error ?? exception.name,
      message: normalized.message ?? 'Unexpected error',
      details: normalized.details,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private normalizePayload(payload: unknown): {
    message?: string | string[];
    error?: string;
    details?: unknown;
  } {
    if (typeof payload === 'string') {
      return { message: payload };
    }

    if (payload && typeof payload === 'object') {
      const data = payload as ErrorResponseShape & { details?: unknown };
      return {
        message: data.message,
        error: data.error,
        details: data.details,
      };
    }

    return {};
  }
}
