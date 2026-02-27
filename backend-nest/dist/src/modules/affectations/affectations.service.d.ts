import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAffectationDto } from './dto/create-affectation.dto';
import { UpdateAffectationDto } from './dto/update-affectation.dto';
export declare class AffectationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(payload: CreateAffectationDto): Promise<{
        id_affectation: number;
        id_user: number;
        id_role: string;
        id_entite: number;
        id_annee: number;
        date_debut: string;
        date_fin: string | null;
    }>;
    findOne(id: string): Promise<{
        id_affectation: number;
        id_user: number;
        id_role: string;
        id_entite: number;
        id_annee: number;
        date_debut: string;
        date_fin: string | null;
    }>;
    update(id: string, payload: UpdateAffectationDto): Promise<{
        id_affectation: number;
        id_user: number;
        id_role: string;
        id_entite: number;
        id_annee: number;
        date_debut: string;
        date_fin: string | null;
    }>;
    remove(id: string): Promise<void>;
}
