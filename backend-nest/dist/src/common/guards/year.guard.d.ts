import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class YearGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
