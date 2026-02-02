import { PrismaService } from '../../common/prisma/prisma.service';
export interface ApiResponsable {
    nom: string;
    prenom: string;
    email_institutionnel: string | null;
    id_role: string;
}
export interface ApiOrgNode {
    id_entite: number;
    nom: string;
    type_entite: string;
    children?: ApiOrgNode[];
    responsables?: ApiResponsable[];
}
export declare class OrganigrammesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(yearId?: number): Promise<{
        id_organigramme: number;
        id_annee: number;
        id_entite_racine: number;
        generated_by: number;
        generated_at: string;
        est_fige: boolean;
        export_path: string | null;
        export_format: string;
        visibility_scope: string | null;
    }[]>;
    latest(yearId: number): Promise<{
        organigramme: {
            id_organigramme: number;
            id_annee: number;
            id_entite_racine: number;
            generated_by: number;
            generated_at: string;
            est_fige: boolean;
            export_path: string | null;
            export_format: string;
            visibility_scope: string | null;
        } | null;
        arbre: ApiOrgNode | null;
    }>;
    getTreeById(id: string): Promise<{
        organigramme: {
            id_organigramme: number;
            id_annee: number;
            id_entite_racine: number;
            generated_by: number;
            generated_at: string;
            est_fige: boolean;
            export_path: string | null;
            export_format: string;
            visibility_scope: string | null;
        };
        arbre: ApiOrgNode | null;
    }>;
    generate(yearId: number, rootId: number, userId: string): Promise<{
        organigramme: {
            id_organigramme: number;
            id_annee: number;
            id_entite_racine: number;
            generated_by: number;
            generated_at: string;
            est_fige: boolean;
            export_path: string | null;
            export_format: string;
            visibility_scope: string | null;
        };
        arbre: ApiOrgNode | null;
    }>;
    freeze(id: string): Promise<{
        organigramme: {
            id_organigramme: number;
            id_annee: number;
            id_entite_racine: number;
            generated_by: number;
            generated_at: string;
            est_fige: boolean;
            export_path: string | null;
            export_format: string;
            visibility_scope: string | null;
        };
    }>;
    private buildTree;
    private mapOrganigramme;
}
