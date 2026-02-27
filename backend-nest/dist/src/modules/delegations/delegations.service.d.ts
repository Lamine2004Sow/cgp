import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import type { CurrentUser } from '../../common/types/current-user';
import { DelegationsListQueryDto } from './dto/delegations-list-query.dto';
export declare class DelegationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(user: CurrentUser, query?: DelegationsListQueryDto): Promise<{
        id_delegation: number;
        delegant_id: number;
        delegataire_id: number;
        id_entite: number;
        id_role: string | null;
        type_droit: string | null;
        date_debut: string;
        date_fin: string | null;
        statut: string;
        delegant_nom: string | null;
        delegataire_nom: string | null;
        entite_nom: string | null;
    }[]>;
    create(delegantId: string, payload: CreateDelegationDto, user?: CurrentUser): Promise<{
        id_delegation: number;
        delegant_id: number;
        delegataire_id: number;
        id_entite: number;
        id_role: string | null;
        type_droit: string | null;
        date_debut: string;
        date_fin: string | null;
        statut: string;
        delegant_nom: string | null;
        delegataire_nom: string | null;
        entite_nom: string | null;
    }>;
    revoke(user: CurrentUser, id: string): Promise<{
        id_delegation: number;
        delegant_id: number;
        delegataire_id: number;
        id_entite: number;
        id_role: string | null;
        type_droit: string | null;
        date_debut: string;
        date_fin: string | null;
        statut: string;
        delegant_nom: string | null;
        delegataire_nom: string | null;
        entite_nom: string | null;
    }>;
    exportCsv(user: CurrentUser, query?: DelegationsListQueryDto): Promise<string>;
    private mapDelegation;
    private isServicesCentraux;
}
