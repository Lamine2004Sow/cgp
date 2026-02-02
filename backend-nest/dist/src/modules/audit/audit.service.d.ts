import { PrismaService } from '../../common/prisma/prisma.service';
interface AuditLogInput {
    userId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    oldValue?: string;
    newValue?: string;
}
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(input: AuditLogInput): Promise<void>;
}
export {};
