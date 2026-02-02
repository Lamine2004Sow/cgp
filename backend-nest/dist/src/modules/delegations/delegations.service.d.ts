import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';
export declare class DelegationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(): Promise<{
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
    create(delegantId: string, payload: CreateDelegationDto): Promise<{
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
    revoke(id: string): Promise<{
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
    private mapDelegation;
}
