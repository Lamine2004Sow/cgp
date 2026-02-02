import { EntitesService } from './entites.service';
import { EntitesListQueryDto } from './dto/entites-list-query.dto';
export declare class EntitesController {
    private readonly entitesService;
    constructor(entitesService: EntitesService);
    list(query: EntitesListQueryDto): Promise<{
        items: {
            id_entite: number;
            id_annee: number;
            id_entite_parent: number | null;
            type_entite: import("@prisma/client").$Enums.entite_type;
            nom: string;
            tel_service: string | null;
            bureau_service: string | null;
        }[];
    }>;
}
