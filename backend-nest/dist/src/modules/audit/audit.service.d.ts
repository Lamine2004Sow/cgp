import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditListQueryDto } from './dto/audit-list-query.dto';
interface AuditLogInput {
    userId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    oldValue?: string;
    newValue?: string;
}
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(input: AuditLogInput): Promise<void>;
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
    exportCsv(query: AuditListQueryDto): Promise<string>;
    private buildWhere;
}
export {};
