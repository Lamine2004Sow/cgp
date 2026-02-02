import type { Request } from 'express';
import { OrganigrammesService, type ApiOrgNode } from './organigrammes.service';
import { OrganigrammesListQueryDto } from './dto/organigrammes-list-query.dto';
import { OrganigrammeGenerateDto } from './dto/organigramme-generate.dto';
type OrganigrammeDto = {
    id_organigramme: number;
    id_annee: number;
    id_entite_racine: number;
    generated_by: number;
    generated_at: string;
    est_fige: boolean;
    export_path?: string | null;
    export_format?: string;
    visibility_scope?: string | null;
};
export declare class OrganigrammesController {
    private readonly organigrammesService;
    constructor(organigrammesService: OrganigrammesService);
    list(query: OrganigrammesListQueryDto): Promise<{
        items: OrganigrammeDto[];
    }>;
    latest(query: OrganigrammesListQueryDto): Promise<{
        organigramme: OrganigrammeDto | null;
        arbre: ApiOrgNode | null;
    }>;
    generate(request: Request, payload: OrganigrammeGenerateDto): Promise<{
        organigramme: OrganigrammeDto;
        arbre: ApiOrgNode | null;
    }>;
    tree(id: string): Promise<{
        organigramme: OrganigrammeDto;
        arbre: ApiOrgNode | null;
    }>;
    freeze(id: string): Promise<{
        organigramme: OrganigrammeDto;
    }>;
}
export {};
