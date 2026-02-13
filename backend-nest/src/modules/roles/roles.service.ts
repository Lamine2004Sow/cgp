import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RoleResponseDto } from './dto/role-response.dto';
import type { role } from '@prisma/client';
import { ROLE_IDS } from '../../auth/roles.constants';
import type { CurrentUser } from '../../common/types/current-user';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';
import { UpdateRoleRequestDto } from './dto/update-role-request.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { niveau_hierarchique: 'asc' },
    });

    return roles.map((item) => this.toRoleResponse(item));
  }

  private toRoleResponse(item: role): RoleResponseDto {
    return {
      id: item.id_role,
      libelle: item.libelle,
      description: item.description,
      niveauHierarchique: item.niveau_hierarchique,
      isGlobal: item.is_global,
      idComposante: item.id_composante ? String(item.id_composante) : null,
    };
  }

  async listRequests(user: CurrentUser, statut?: string) {
    const where = {
      ...(this.isServicesCentraux(user)
        ? {}
        : { id_user_createur: BigInt(user.userId) }),
      ...(statut ? { statut: statut as any } : {}),
    };

    const items = await this.prisma.demande_role.findMany({
      where,
      orderBy: { date_creation: 'desc' },
      include: {
        utilisateur_demande_role_id_user_createurToutilisateur: true,
        utilisateur_demande_role_id_user_validateurToutilisateur: true,
      },
    });

    return items.map((item) => ({
      id_demande_role: Number(item.id_demande_role),
      id_user_createur: Number(item.id_user_createur),
      id_user_validateur: item.id_user_validateur
        ? Number(item.id_user_validateur)
        : null,
      role_propose: item.role_propose,
      description: item.description,
      justificatif: item.justificatif,
      statut: item.statut,
      date_creation: item.date_creation.toISOString(),
      date_decision: item.date_decision?.toISOString() ?? null,
      createur_nom:
        item.utilisateur_demande_role_id_user_createurToutilisateur?.nom ?? null,
      createur_prenom:
        item.utilisateur_demande_role_id_user_createurToutilisateur?.prenom ?? null,
      validateur_nom:
        item.utilisateur_demande_role_id_user_validateurToutilisateur?.nom ?? null,
      validateur_prenom:
        item.utilisateur_demande_role_id_user_validateurToutilisateur?.prenom ?? null,
    }));
  }

  async createRequest(user: CurrentUser, payload: CreateRoleRequestDto) {
    const roleName = payload.role_propose.trim();
    if (!roleName) {
      throw new BadRequestException('role_propose is required');
    }

    const created = await this.prisma.demande_role.create({
      data: {
        id_user_createur: BigInt(user.userId),
        role_propose: roleName,
        description: payload.description?.trim() || null,
        justificatif: payload.justificatif?.trim() || null,
        statut: 'EN_ATTENTE',
      },
    });

    return {
      id_demande_role: Number(created.id_demande_role),
      id_user_createur: Number(created.id_user_createur),
      id_user_validateur: null,
      role_propose: created.role_propose,
      description: created.description,
      justificatif: created.justificatif,
      statut: created.statut,
      date_creation: created.date_creation.toISOString(),
      date_decision: created.date_decision?.toISOString() ?? null,
    };
  }

  async reviewRequest(user: CurrentUser, id: string, payload: UpdateRoleRequestDto) {
    if (!this.isServicesCentraux(user)) {
      throw new ForbiddenException('Only services centraux can review role requests');
    }

    if (payload.statut !== 'VALIDEE' && payload.statut !== 'REFUSEE') {
      throw new BadRequestException('Invalid statut');
    }

    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('Role request not found');
    }

    const request = await this.prisma.demande_role.findUnique({
      where: { id_demande_role: parsedId },
    });

    if (!request) {
      throw new NotFoundException('Role request not found');
    }

    const updated = await this.prisma.demande_role.update({
      where: { id_demande_role: parsedId },
      data: {
        statut: payload.statut as any,
        id_user_validateur: BigInt(user.userId),
        date_decision: new Date(),
      },
    });

    if (payload.statut === 'VALIDEE') {
      const roleId = (payload.role_id?.trim() || this.slugify(request.role_propose)).slice(
        0,
        64,
      );
      if (!roleId) {
        throw new BadRequestException('role_id is required to validate a request');
      }

      const composanteId =
        payload.id_composante || (await this.findCreatorComposante(request.id_user_createur));

      await this.prisma.role.upsert({
        where: { id_role: roleId },
        update: {
          libelle: payload.libelle?.trim() || request.role_propose,
          description: request.description,
          niveau_hierarchique: payload.niveau_hierarchique ?? 50,
          is_global: false,
          id_composante: composanteId ? BigInt(composanteId) : null,
        },
        create: {
          id_role: roleId,
          libelle: payload.libelle?.trim() || request.role_propose,
          description: request.description,
          niveau_hierarchique: payload.niveau_hierarchique ?? 50,
          is_global: false,
          id_composante: composanteId ? BigInt(composanteId) : null,
        },
      });
    }

    return {
      id_demande_role: Number(updated.id_demande_role),
      id_user_createur: Number(updated.id_user_createur),
      id_user_validateur: updated.id_user_validateur
        ? Number(updated.id_user_validateur)
        : null,
      role_propose: updated.role_propose,
      description: updated.description,
      justificatif: updated.justificatif,
      statut: updated.statut,
      date_creation: updated.date_creation.toISOString(),
      date_decision: updated.date_decision?.toISOString() ?? null,
    };
  }

  private isServicesCentraux(user: CurrentUser): boolean {
    return user.affectations.some(
      (affectation) => affectation.roleId === ROLE_IDS.SERVICES_CENTRAUX,
    );
  }

  private async findCreatorComposante(userId: bigint): Promise<number | null> {
    const affectation = await this.prisma.affectation.findFirst({
      where: {
        id_user: userId,
        entite_structure: { type_entite: 'COMPOSANTE' },
      },
      select: { id_entite: true },
      orderBy: { id_affectation: 'asc' },
    });

    return affectation ? Number(affectation.id_entite) : null;
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
