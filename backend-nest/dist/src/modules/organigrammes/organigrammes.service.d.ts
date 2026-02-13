import { PrismaService } from '../../common/prisma/prisma.service';
import type { CurrentUser } from '../../common/types/current-user';
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
    list(user: CurrentUser, yearId?: number): Promise<{
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
    latest(user: CurrentUser, yearId: number): Promise<{
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
    getTreeById(user: CurrentUser, id: string): Promise<{
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
    generate(user: CurrentUser, yearId: number, rootId: number): Promise<{
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
    export(user: CurrentUser, id: string, format: string): Promise<{
        fileName: string;
        mimeType: string;
        contentBase64: string;
    }>;
    private buildTree;
    private mapOrganigramme;
    private toCsv;
    private toPdf;
    private isServicesCentraux;
    private canAccessEntiteInYear;
}
