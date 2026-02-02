import { PrismaService } from '../../common/prisma/prisma.service';
import { CloneYearDto } from './dto/clone-year.dto';
export declare class AnneesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(statut?: string): Promise<{
        id_annee: number;
        libelle: string;
        date_debut: string;
        date_fin: string;
        statut: import("@prisma/client").$Enums.annee_statut;
        id_annee_source: number | null;
    }[]>;
    cloneYear(sourceId: string, payload: CloneYearDto): Promise<{
        id_annee: number;
        libelle: string;
        date_debut: string;
        date_fin: string;
        statut: import("@prisma/client").$Enums.annee_statut;
        id_annee_source: number | null;
    }>;
}
