import { PrismaService } from '../../common/prisma/prisma.service';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getStats(yearId?: number): Promise<{
        yearId: number;
        yearLabel: string;
        formations: number;
        responsables: number;
        departements: number;
        composantes: number;
    }>;
    private resolveYear;
}
