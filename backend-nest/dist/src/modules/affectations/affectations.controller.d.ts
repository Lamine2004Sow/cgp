import { AffectationsService } from './affectations.service';
import { CreateAffectationDto } from './dto/create-affectation.dto';
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
}
