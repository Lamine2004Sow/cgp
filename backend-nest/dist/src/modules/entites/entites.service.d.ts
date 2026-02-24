import { PrismaService } from '../../common/prisma/prisma.service';
import type { UpdateEntiteDto } from './dto/update-entite.dto';
export type EntiteListItem = {
    id_entite: number;
    id_annee: number;
    id_entite_parent: number | null;
    type_entite: string;
    nom: string;
    tel_service: string | null;
    bureau_service: string | null;
};
export type AffectationPerson = {
    id_user: number;
    nom: string;
    prenom: string;
    email_institutionnel: string | null;
    telephone: string | null;
    bureau: string | null;
    id_role: string;
    role_libelle: string;
    is_responsable: boolean;
};
export type EntiteDetail = EntiteListItem & {
    site_web?: string | null;
    code_interne?: string | null;
    type_diplome?: string | null;
    code_parcours?: string | null;
    libelle_court?: string | null;
    responsables: AffectationPerson[];
    secretariat: AffectationPerson[];
    nombre_sous_responsables: number;
    nombre_delegations: number;
    nombre_signalements: number;
};
export declare class EntitesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private mapItem;
    list(yearId?: number): Promise<EntiteListItem[]>;
    private getDescendantEntiteIds;
    findOne(id: number): Promise<EntiteDetail | null>;
    update(id: number, dto: UpdateEntiteDto): Promise<EntiteDetail>;
}
