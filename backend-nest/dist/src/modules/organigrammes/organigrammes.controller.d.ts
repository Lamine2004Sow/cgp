import { OrganigrammesService, type ApiOrgNode } from './organigrammes.service';
import { OrganigrammesListQueryDto } from './dto/organigrammes-list-query.dto';
import { OrganigrammeGenerateDto } from './dto/organigramme-generate.dto';
import { OrganigrammeExportQueryDto } from './dto/organigramme-export-query.dto';
import { OrganigrammeTreeQueryDto } from './dto/organigramme-tree-query.dto';
import { UpdateOrganigrammeFreezeDto } from './dto/update-organigramme-freeze.dto';
import type { CurrentUser as CurrentUserType } from '../../common/types/current-user';
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
    list(user: CurrentUserType, query: OrganigrammesListQueryDto): Promise<{
        items: OrganigrammeDto[];
    }>;
    latest(user: CurrentUserType, query: OrganigrammeTreeQueryDto): Promise<{
        organigramme: OrganigrammeDto | null;
        arbre: ApiOrgNode | null;
    }>;
    generate(user: CurrentUserType, payload: OrganigrammeGenerateDto): Promise<{
        organigramme: OrganigrammeDto;
        arbre: ApiOrgNode | null;
    }>;
    tree(user: CurrentUserType, id: string, query: OrganigrammeTreeQueryDto): Promise<{
        organigramme: OrganigrammeDto;
        arbre: ApiOrgNode | null;
    }>;
    freeze(id: string, payload: UpdateOrganigrammeFreezeDto): Promise<{
        organigramme: OrganigrammeDto;
    }>;
    export(user: CurrentUserType, id: string, query: OrganigrammeExportQueryDto): Promise<{
        fileName: string;
        mimeType: string;
        contentBase64: string;
    }>;
}
export {};
