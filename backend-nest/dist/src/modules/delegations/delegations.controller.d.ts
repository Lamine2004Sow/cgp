import type { Request } from 'express';
import { DelegationsService } from './delegations.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';
export declare class DelegationsController {
    private readonly delegationsService;
    constructor(delegationsService: DelegationsService);
    list(): Promise<{
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
    create(request: Request, payload: CreateDelegationDto): Promise<{
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
    revoke(id: string): Promise<{
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
