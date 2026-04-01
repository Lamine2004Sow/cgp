import { AffectationsService, UpsertContactDto } from './affectations.service';
import { CreateAffectationDto } from './dto/create-affectation.dto';
import { UpdateAffectationDto } from './dto/update-affectation.dto';
export declare class AffectationsController {
    private readonly affectationsService;
    constructor(affectationsService: AffectationsService);
    create(payload: CreateAffectationDto): Promise<{
        affectation: {
            id_affectation: number;
            id_user: number;
            id_role: string;
            id_entite: number;
            id_annee: number;
            date_debut: string;
            date_fin: string | null;
            id_affectation_n_plus_1: number | null;
            superviseur: {
                id_affectation: number;
                id_role: string;
                nom: string | null;
                prenom: string | null;
            } | null;
        };
    }>;
    findOne(id: string): Promise<{
        affectation: {
            id_affectation: number;
            id_user: number;
            id_role: string;
            id_entite: number;
            id_annee: number;
            date_debut: string;
            date_fin: string | null;
            id_affectation_n_plus_1: number | null;
            superviseur: {
                id_affectation: number;
                id_role: string;
                nom: string | null;
                prenom: string | null;
            } | null;
        };
    }>;
    update(id: string, payload: UpdateAffectationDto): Promise<{
        affectation: {
            id_affectation: number;
            id_user: number;
            id_role: string;
            id_entite: number;
            id_annee: number;
            date_debut: string;
            date_fin: string | null;
            id_affectation_n_plus_1: number | null;
            superviseur: {
                id_affectation: number;
                id_role: string;
                nom: string | null;
                prenom: string | null;
            } | null;
        };
    }>;
    upsertContact(id: string, payload: UpsertContactDto): Promise<{
        contact: {
            id_contact_role: number;
            id_affectation: number;
            email_fonctionnelle: string | null;
            telephone: string | null;
            bureau: string | null;
        };
    }>;
    remove(id: string): Promise<void>;
}
