import { PrismaService } from '../../common/prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';
export declare class SearchService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private parseEntiteIds;
    responsables(query: SearchQueryDto): Promise<{
        items: {
            id_affectation: number;
            id_user: number;
            nom: string;
            prenom: string;
            email_institutionnel: string | null;
            role_id: string;
            role_label: string;
            id_entite: number;
            entite_nom: string;
            type_entite: import("@prisma/client").$Enums.entite_type;
            id_annee: number;
        }[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    formations(query: SearchQueryDto): Promise<{
        items: {
            id_entite: number;
            id_annee: number;
            type_entite: import("@prisma/client").$Enums.entite_type;
            nom: string;
            tel_service: string | null;
            bureau_service: string | null;
            responsables: {
                id_user: number;
                nom: string;
                prenom: string;
                role_id: string;
                role_label: string;
            }[];
        }[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    structures(query: SearchQueryDto): Promise<{
        items: {
            id_entite: number;
            id_annee: number;
            id_entite_parent: number | null;
            type_entite: import("@prisma/client").$Enums.entite_type;
            nom: string;
            tel_service: string | null;
            bureau_service: string | null;
            code_composante: string | null;
            code_interne: string | null;
        }[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    secretariats(query: SearchQueryDto): Promise<{
        items: {
            id_entite: number;
            id_annee: number;
            type_entite: import("@prisma/client").$Enums.entite_type;
            nom: string;
            tel_service: string | null;
            bureau_service: string | null;
        }[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    private toEntiteType;
}
