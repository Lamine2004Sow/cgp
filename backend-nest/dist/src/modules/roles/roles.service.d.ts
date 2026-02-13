import { PrismaService } from '../../common/prisma/prisma.service';
import type { RoleResponseDto } from './dto/role-response.dto';
import type { CurrentUser } from '../../common/types/current-user';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';
import { UpdateRoleRequestDto } from './dto/update-role-request.dto';
export declare class RolesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<RoleResponseDto[]>;
    private toRoleResponse;
    listRequests(user: CurrentUser, statut?: string): Promise<{
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
    }[]>;
    createRequest(user: CurrentUser, payload: CreateRoleRequestDto): Promise<{
        id_demande_role: number;
        id_user_createur: number;
        id_user_validateur: null;
        role_propose: string;
        description: string | null;
        justificatif: string | null;
        statut: import("@prisma/client").$Enums.demande_statut;
        date_creation: string;
        date_decision: string | null;
    }>;
    reviewRequest(user: CurrentUser, id: string, payload: UpdateRoleRequestDto): Promise<{
        id_demande_role: number;
        id_user_createur: number;
        id_user_validateur: number | null;
        role_propose: string;
        description: string | null;
        justificatif: string | null;
        statut: import("@prisma/client").$Enums.demande_statut;
        date_creation: string;
        date_decision: string | null;
    }>;
    private isServicesCentraux;
    private findCreatorComposante;
    private slugify;
}
