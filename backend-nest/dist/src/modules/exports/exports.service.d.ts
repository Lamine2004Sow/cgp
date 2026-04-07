import { PrismaService } from '../../common/prisma/prisma.service';
import { StandardWorkbookService } from './standard-workbook.service';
export declare class ExportsService {
    private readonly prisma;
    private readonly standardWorkbookService;
    constructor(prisma: PrismaService, standardWorkbookService: StandardWorkbookService);
    exportResponsables(params: {
        yearId?: number;
        entiteId?: number;
        roleId?: string;
    }): Promise<{
        nom: string;
        prenom: string;
        email_institutionnel: string | null;
        role: string;
        entite: string;
        id_annee: number;
    }[]>;
    exportWorkbook(params: {
        yearId: number;
        entiteId?: number;
        template?: boolean;
    }): Promise<{
        fileName: string;
        mimeType: string;
        contentBase64: string;
    }>;
}
