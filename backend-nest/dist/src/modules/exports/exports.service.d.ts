import { PrismaService } from '../../common/prisma/prisma.service';
export declare class ExportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    exportResponsables(yearId?: number): Promise<{
        nom: string;
        prenom: string;
        email_institutionnel: string | null;
        role: string;
        entite: string;
        id_annee: number;
    }[]>;
}
