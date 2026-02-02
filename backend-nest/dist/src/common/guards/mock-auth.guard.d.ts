import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../auth/auth.service';
export declare class MockAuthGuard implements CanActivate {
    private readonly authService;
    private readonly configService;
    constructor(authService: AuthService, configService: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
