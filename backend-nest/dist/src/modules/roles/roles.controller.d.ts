import type { CurrentUser as CurrentUserType } from '../../common/types/current-user';
import { RolesService } from './roles.service';
import { RoleRequestsQueryDto } from './dto/role-requests-query.dto';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';
import { UpdateRoleRequestDto } from './dto/update-role-request.dto';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
    listRequests(user: CurrentUserType, query: RoleRequestsQueryDto): Promise<{
        items: {
            id_demande_role: number;
            id_user_createur: number;
            id_user_validateur: number | null;
            role_propose: string;
            description: string | null;
            justificatif: string | null;
            statut: import("@prisma/client").$Enums.demande_statut;
            date_creation: string;
            date_decision: string | null;
            createur_nom: string;
            createur_prenom: string;
            validateur_nom: string | null;
            validateur_prenom: string | null;
        }[];
    }>;
    createRequest(user: CurrentUserType, payload: CreateRoleRequestDto): Promise<{
        request: {
            id_demande_role: number;
            id_user_createur: number;
            id_user_validateur: null;
            role_propose: string;
            description: string | null;
            justificatif: string | null;
            statut: import("@prisma/client").$Enums.demande_statut;
            date_creation: string;
            date_decision: string | null;
        };
    }>;
    reviewRequest(user: CurrentUserType, id: string, payload: UpdateRoleRequestDto): Promise<{
        request: {
            id_demande_role: number;
            id_user_createur: number;
            id_user_validateur: number | null;
            role_propose: string;
            description: string | null;
            justificatif: string | null;
            statut: import("@prisma/client").$Enums.demande_statut;
            date_creation: string;
            date_decision: string | null;
        };
    }>;
    list(): Promise<{
        items: import("./dto/role-response.dto").RoleResponseDto[];
    }>;
}
