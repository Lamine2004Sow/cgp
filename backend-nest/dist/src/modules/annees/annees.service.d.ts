import { PrismaService } from '../../common/prisma/prisma.service';
import type { CurrentUser } from '../../common/types/current-user';
import { StandardWorkbookService } from '../exports/standard-workbook.service';
import { CloneYearDto } from './dto/clone-year.dto';
export declare class AnneesService {
    private readonly prisma;
    private readonly standardWorkbookService;
    constructor(prisma: PrismaService, standardWorkbookService: StandardWorkbookService);
    findOne(id: string): Promise<{
        id_annee: number;
        libelle: string;
        date_debut: string;
        date_fin: string;
        statut: string;
        id_annee_source: number | null;
    }>;
    list(statut?: string): Promise<{
        id_annee: number;
        libelle: string;
        date_debut: string;
        date_fin: string;
        statut: string;
        id_annee_source: number | null;
    }[]>;
    listForUser(user: CurrentUser, statut?: string): Promise<{
        id_annee: number;
        libelle: string;
        date_debut: string;
        date_fin: string;
        statut: string;
        id_annee_source: number | null;
    }[]>;
    cloneYear(sourceId: string, payload: CloneYearDto): Promise<{
        id_annee: number;
        libelle: string;
        date_debut: string;
        date_fin: string;
        statut: string;
        id_annee_source: number | null;
    }>;
    updateStatus(id: string, statut: string): Promise<{
        id_annee: number;
        libelle: string;
        date_debut: string;
        date_fin: string;
        statut: string;
        id_annee_source: number | null;
    }>;
    deleteYear(id: string): Promise<{
        year: {
            id_annee: number;
            libelle: string;
            date_debut: string;
            date_fin: string;
            statut: string;
            id_annee_source: number | null;
        };
        backup: {
            fileName: string;
            mimeType: string;
            contentBase64: string;
        };
    }>;
    private collectCloneScope;
    private cloneEntiteSubtype;
    private ensureYearLabelAvailable;
    private parseYearId;
    private parseOptionalYearId;
    private mapYear;
    private isServicesCentraux;
    private findCurrentYear;
}
