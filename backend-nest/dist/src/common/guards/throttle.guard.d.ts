import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class ThrottleGuard implements CanActivate {
    private readonly store;
    private readonly DEFAULT_LIMIT;
    private readonly DEFAULT_TTL_MS;
    private readonly STRICT_LIMIT;
    private readonly STRICT_PATHS;
    canActivate(context: ExecutionContext): boolean;
    private cleanup;
}
