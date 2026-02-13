import { AuditService } from './audit.service';
import { AuditListQueryDto } from './dto/audit-list-query.dto';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    list(query: AuditListQueryDto): Promise<{
        items: {
            id_log: number;
            id_user_auteur: number;
            horodatage: string;
            type_action: string;
            cible_type: string;
            cible_id: string | null;
            ancienne_valeur: string | null;
            nouvelle_valeur: string | null;
            auteur_login: string;
            auteur_nom: string;
            auteur_prenom: string;
        }[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    export(query: AuditListQueryDto): Promise<{
        csv: string;
    }>;
}
