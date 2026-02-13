import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { UpdateSignalementDto } from './dto/update-signalement.dto';
import type { CurrentUser } from '../../common/types/current-user';
import { ROLE_IDS } from '../../auth/roles.constants';

@Injectable()
export class SignalementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUser, statut?: string) {
    const isCentral = this.isServicesCentraux(user);
    const isManager = this.isManager(user);
    const userId = BigInt(user.userId);

    const entiteScope = isCentral
      ? []
      : isManager
        ? await this.expandUserEntiteScope(user)
        : [];

    const where = {
      ...(statut ? { statut: statut as any } : {}),
      ...(isCentral
        ? {}
        : isManager
          ? {
              OR: [
                { auteur_id: userId },
                {
                  id_entite_cible: {
                    in: entiteScope.map((id) => BigInt(id)),
                  },
                },
              ],
            }
          : { auteur_id: userId }),
    };

    const items = await this.prisma.signalement.findMany({
      where,
      orderBy: { date_creation: 'desc' },
      include: {
        utilisateur_signalement_auteur_idToutilisateur: true,
        utilisateur_signalement_traitant_idToutilisateur: true,
        utilisateur_signalement_cloture_par_idToutilisateur: true,
      },
    });

    return items.map((item) => ({
      id_signalement: Number(item.id_signalement),
      auteur_id: Number(item.auteur_id),
      traitant_id: item.traitant_id ? Number(item.traitant_id) : null,
      cloture_par_id: item.cloture_par_id ? Number(item.cloture_par_id) : null,
      id_entite_cible: item.id_entite_cible ? Number(item.id_entite_cible) : null,
      description: item.description,
      statut: item.statut,
      date_creation: item.date_creation.toISOString(),
      date_prise_en_charge: item.date_prise_en_charge?.toISOString() ?? null,
      date_traitement: item.date_traitement?.toISOString() ?? null,
      commentaire_prise_en_charge: item.commentaire_prise_en_charge ?? null,
      commentaire_cloture: item.commentaire_cloture ?? null,
      auteur_nom: item.utilisateur_signalement_auteur_idToutilisateur?.nom ?? null,
      auteur_prenom: item.utilisateur_signalement_auteur_idToutilisateur?.prenom ?? null,
      traitant_nom: item.utilisateur_signalement_traitant_idToutilisateur?.nom ?? null,
      traitant_prenom: item.utilisateur_signalement_traitant_idToutilisateur?.prenom ?? null,
      cloture_nom: item.utilisateur_signalement_cloture_par_idToutilisateur?.nom ?? null,
      cloture_prenom: item.utilisateur_signalement_cloture_par_idToutilisateur?.prenom ?? null,
    }));
  }

  async create(userId: string, payload: CreateSignalementDto) {
    const created = await this.prisma.signalement.create({
      data: {
        auteur_id: BigInt(userId),
        id_entite_cible: payload.id_entite_cible ? BigInt(payload.id_entite_cible) : null,
        description: payload.description,
        statut: 'OUVERT',
      },
    });

    return this.mapSignalement(created);
  }

  async update(id: string, user: CurrentUser, payload: UpdateSignalementDto) {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('Signalement not found');
    }

    const existing = await this.prisma.signalement.findUnique({
      where: { id_signalement: parsedId },
    });
    if (!existing) {
      throw new NotFoundException('Signalement not found');
    }

    const isCentral = this.isServicesCentraux(user);
    const isManager = this.isManager(user);
    const userId = BigInt(user.userId);

    if (!isCentral && isManager && existing.id_entite_cible) {
      const entiteScope = await this.expandUserEntiteScope(user);
      if (!entiteScope.includes(String(existing.id_entite_cible))) {
        throw new ForbiddenException('Signalement out of scope');
      }
    }

    if (!isCentral && !isManager && existing.auteur_id !== userId) {
      throw new ForbiddenException('You can only update your own signalements');
    }

    const data: Record<string, any> = {};

    if (payload.statut) {
      if (!isCentral && !isManager) {
        throw new ForbiddenException('Only managers can change statut');
      }
      data.statut = payload.statut;
    }

    if (payload.statut === 'EN_COURS') {
      data.traitant_id = userId;
      data.date_prise_en_charge = new Date();
      data.commentaire_prise_en_charge = payload.commentaire ?? null;
    }

    if (payload.statut === 'CLOTURE') {
      if (!payload.commentaire?.trim()) {
        throw new BadRequestException('commentaire is required when closing');
      }
      data.cloture_par_id = userId;
      data.date_traitement = new Date();
      data.commentaire_cloture = payload.commentaire.trim();
    }

    const updated = await this.prisma.signalement.update({
      where: { id_signalement: parsedId },
      data,
    });

    return this.mapSignalement(updated);
  }

  private mapSignalement(item: {
    id_signalement: bigint;
    auteur_id: bigint;
    traitant_id: bigint | null;
    cloture_par_id: bigint | null;
    id_entite_cible: bigint | null;
    description: string;
    statut: string;
    date_creation: Date;
    date_prise_en_charge: Date | null;
    date_traitement: Date | null;
    commentaire_prise_en_charge: string | null;
    commentaire_cloture: string | null;
  }) {
    return {
      id_signalement: Number(item.id_signalement),
      auteur_id: Number(item.auteur_id),
      traitant_id: item.traitant_id ? Number(item.traitant_id) : null,
      cloture_par_id: item.cloture_par_id ? Number(item.cloture_par_id) : null,
      id_entite_cible: item.id_entite_cible ? Number(item.id_entite_cible) : null,
      description: item.description,
      statut: item.statut,
      date_creation: item.date_creation.toISOString(),
      date_prise_en_charge: item.date_prise_en_charge?.toISOString() ?? null,
      date_traitement: item.date_traitement?.toISOString() ?? null,
      commentaire_prise_en_charge: item.commentaire_prise_en_charge ?? null,
      commentaire_cloture: item.commentaire_cloture ?? null,
    };
  }

  private isServicesCentraux(user: CurrentUser): boolean {
    return user.affectations.some(
      (affectation) => affectation.roleId === ROLE_IDS.SERVICES_CENTRAUX,
    );
  }

  private isManager(user: CurrentUser): boolean {
    const managerRoles = new Set<string>([
      ROLE_IDS.DIRECTEUR_COMPOSANTE,
      ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
      ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
    ]);
    return user.affectations.some((affectation) =>
      managerRoles.has(affectation.roleId),
    );
  }

  private async expandUserEntiteScope(user: CurrentUser): Promise<string[]> {
    const yearIds = Array.from(
      new Set(user.affectations.map((affectation) => affectation.anneeId)),
    );
    const seeds = new Set(user.affectations.map((affectation) => affectation.entiteId));
    if (yearIds.length === 0 || seeds.size === 0) {
      return [];
    }

    const entites = await this.prisma.entite_structure.findMany({
      where: {
        id_annee: {
          in: yearIds.map((yearId) => BigInt(yearId)),
        },
      },
      select: {
        id_entite: true,
        id_entite_parent: true,
      },
    });

    const parentById = new Map<string, string | null>();
    for (const entite of entites) {
      parentById.set(
        String(entite.id_entite),
        entite.id_entite_parent ? String(entite.id_entite_parent) : null,
      );
    }

    const scope = new Set<string>();
    for (const entite of entites) {
      const entiteId = String(entite.id_entite);
      if (this.isInSeedTree(entiteId, seeds, parentById)) {
        scope.add(entiteId);
      }
    }

    return Array.from(scope);
  }

  private isInSeedTree(
    entiteId: string,
    seeds: Set<string>,
    parentById: Map<string, string | null>,
  ): boolean {
    if (seeds.has(entiteId)) {
      return true;
    }
    let current = parentById.get(entiteId) ?? null;
    for (let depth = 0; depth < 32 && current; depth += 1) {
      if (seeds.has(current)) {
        return true;
      }
      current = parentById.get(current) ?? null;
    }
    return false;
  }
}
