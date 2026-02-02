import { AnneesService } from './annees.service';
import { YearsListQueryDto } from './dto/years-list-query.dto';
import { CloneYearDto } from './dto/clone-year.dto';
export declare class AnneesController {
    private readonly anneesService;
    constructor(anneesService: AnneesService);
    list(query: YearsListQueryDto): Promise<{
        items: {
            id_annee: number;
            libelle: string;
            date_debut: string;
            date_fin: string;
            statut: import("@prisma/client").$Enums.annee_statut;
            id_annee_source: number | null;
        }[];
    }>;
    clone(id: string, payload: CloneYearDto): Promise<{
        year: {
            id_annee: number;
            libelle: string;
            date_debut: string;
            date_fin: string;
            statut: import("@prisma/client").$Enums.annee_statut;
            id_annee_source: number | null;
        };
    }>;
}
