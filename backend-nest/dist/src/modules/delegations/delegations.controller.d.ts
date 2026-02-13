import type { CurrentUser as CurrentUserType } from '../../common/types/current-user';
import { DelegationsService } from './delegations.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import { DelegationsListQueryDto } from './dto/delegations-list-query.dto';
export declare class DelegationsController {
    private readonly delegationsService;
    constructor(delegationsService: DelegationsService);
    list(user: CurrentUserType, query: DelegationsListQueryDto): Promise<{
        items: {
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
        }[];
    }>;
    create(user: CurrentUserType, payload: CreateDelegationDto): Promise<{
        delegation: {
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
        };
    }>;
    export(user: CurrentUserType, query: DelegationsListQueryDto): Promise<{
        csv: string;
    }>;
    revoke(user: CurrentUserType, id: string): Promise<{
        delegation: {
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
        };
    }>;
}
