import { PrismaService } from '../common/prisma/prisma.service';
import type { CurrentUser } from '../common/types/current-user';
export declare class AuthService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    buildCurrentUserByLogin(login: string): Promise<CurrentUser | null>;
    private mapAffectation;
}
