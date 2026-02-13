import { CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export declare class ScopeGuard implements CanActivate {
    private readonly prisma;
    constructor(prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractEntiteIds;
    private walkBodyForEntiteIds;
    private addNormalized;
    private isDescendantOfUserScope;
}
