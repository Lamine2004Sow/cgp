import { PrismaService } from '../../common/prisma/prisma.service';
import type { CurrentUser } from '../../common/types/current-user';
export interface ApiResponsable {
    id_user?: number;
    id_affectation?: number;
    nom: string;
    prenom: string;
    email_institutionnel: string | null;
    id_role: string;
    role_label?: string | null;
    id_entite?: number;
    entite_nom?: string | null;
}
export interface ApiOrgNode {
    id_node: string;
    kind: 'structure' | 'personne';
    id_entite: number | null;
    id_user?: number | null;
    nom: string;
    type_entite: string | null;
    role_label?: string | null;
    structure_nom?: string | null;
    email_institutionnel?: string | null;
    hierarchy_level?: number | null;
    children?: ApiOrgNode[];
    responsables?: ApiResponsable[];
}
interface BuildTreeOptions {
    view?: string;
    q?: string;
    roleId?: string;
    entiteIds?: string;
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
    latest(user: CurrentUser, yearId: number, options?: BuildTreeOptions): Promise<{
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
    getTreeById(user: CurrentUser, id: string, options?: BuildTreeOptions): Promise<{
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
    export(user: CurrentUser, id: string, format: string, options?: BuildTreeOptions): Promise<{
        fileName: string;
        mimeType: string;
        contentBase64: string;
    }>;
    private normalizeViewMode;
    private parseNumericId;
    private parseEntiteIds;
    private matchesPeopleFilter;
    private sortTreeChildren;
    private prunePeopleTree;
    private collectDescendantEntiteIds;
    private buildAffiliationLabel;
    private buildTree;
    private mapOrganigramme;
    private toCsv;
    private buildLayout;
    private escapeXml;
    private getNodeFill;
    private getNodeText;
    private toSvg;
    private toPdf;
    private isServicesCentraux;
    private canAccessEntiteInYear;
}
export {};
