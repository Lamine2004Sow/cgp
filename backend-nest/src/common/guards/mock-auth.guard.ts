import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class MockAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authMode = this.configService.get<string>('AUTH_MODE', 'mock');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (request.path?.endsWith('/health')) {
      return true;
    }

    if (authMode !== 'mock') {
      return true;
    }

    if (nodeEnv !== 'development') {
      throw new ForbiddenException('Mock auth is disabled outside development.');
    }

    const login = request.header('x-user-login');
    if (!login) {
      throw new UnauthorizedException('Missing x-user-login header.');
    }

    const currentUser = await this.authService.buildCurrentUserByLogin(login);
    if (!currentUser) {
      throw new UnauthorizedException('Unknown user login.');
    }

    request.user = currentUser;
    return true;
  }
}
