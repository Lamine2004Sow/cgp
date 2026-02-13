import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportResponsablesDto } from './dto/import-responsables.dto';
export declare class ImportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    importResponsables(payload: ImportResponsablesDto): Promise<{
        imported_rows: number;
        created_users: number;
        created_affectations: number;
    }>;
    private upsertUser;
}
