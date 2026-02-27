import { AffectationsService } from './affectations.service';
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
        };
    }>;
    remove(id: string): Promise<void>;
}
