import { SignalementsService } from './signalements.service';
import { SignalementsListQueryDto } from './dto/signalements-list-query.dto';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { UpdateSignalementDto } from './dto/update-signalement.dto';
import type { CurrentUser as CurrentUserType } from '../../common/types/current-user';
export declare class SignalementsController {
    private readonly signalementsService;
    constructor(signalementsService: SignalementsService);
    list(user: CurrentUserType, query: SignalementsListQueryDto): Promise<{
        items: {
            id_signalement: number;
            auteur_id: number;
            traitant_id: number | null;
            cloture_par_id: number | null;
            id_entite_cible: number | null;
            description: string;
            statut: import("@prisma/client").$Enums.signalement_statut;
            date_creation: string;
            date_prise_en_charge: string | null;
            date_traitement: string | null;
            commentaire_prise_en_charge: string | null;
            commentaire_cloture: string | null;
            auteur_nom: string;
            auteur_prenom: string;
            traitant_nom: string | null;
            traitant_prenom: string | null;
            cloture_nom: string | null;
            cloture_prenom: string | null;
        }[];
    }>;
    create(user: CurrentUserType, payload: CreateSignalementDto): Promise<{
        signalement: {
            id_signalement: number;
            auteur_id: number;
            traitant_id: number | null;
            cloture_par_id: number | null;
            id_entite_cible: number | null;
            description: string;
            statut: string;
            date_creation: string;
            date_prise_en_charge: string | null;
            date_traitement: string | null;
            commentaire_prise_en_charge: string | null;
            commentaire_cloture: string | null;
        };
    }>;
    update(user: CurrentUserType, id: string, payload: UpdateSignalementDto): Promise<{
        signalement: {
            id_signalement: number;
            auteur_id: number;
            traitant_id: number | null;
            cloture_par_id: number | null;
            id_entite_cible: number | null;
            description: string;
            statut: string;
            date_creation: string;
            date_prise_en_charge: string | null;
            date_traitement: string | null;
            commentaire_prise_en_charge: string | null;
            commentaire_cloture: string | null;
        };
    }>;
}
