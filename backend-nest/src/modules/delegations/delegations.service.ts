import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import type { CurrentUser } from '../../common/types/current-user';
import { ROLE_IDS } from '../../auth/roles.constants';
import { DelegationsListQueryDto } from './dto/delegations-list-query.dto';

@Injectable()
export class DelegationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUser, query?: DelegationsListQueryDto) {
    const isCentral = this.isServicesCentraux(user);
    const where = {
      ...(isCentral
        ? {}
        : {
            OR: [
              { delegant_id: BigInt(user.userId) },
              { delegataire_id: BigInt(user.userId) },
            ],
          }),
      ...(query?.statut ? { statut: query.statut as any } : {}),
      ...(query?.entiteId ? { id_entite: BigInt(query.entiteId) } : {}),
    };

    const items = await this.prisma.delegation.findMany({
      where,
      orderBy: { date_debut: 'desc' },
      include: {
        utilisateur_delegation_delegant_idToutilisateur: true,
        utilisateur_delegation_delegataire_idToutilisateur: true,
        entite_structure: true,
      },
    });

    // Auto-expiration: marquer les délégations dont date_fin est passée
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const toExpire = items.filter(
      (item) => item.statut === 'ACTIVE' && item.date_fin && item.date_fin < today,
    );
    if (toExpire.length > 0) {
      await this.prisma.delegation.updateMany({
        where: { id_delegation: { in: toExpire.map((i) => i.id_delegation) } },
        data: { statut: 'EXPIREE' },
      });
      toExpire.forEach((item) => { (item as any).statut = 'EXPIREE'; });
    }

    return items.map((item) => this.mapDelegation(item));
  }

  async create(delegantId: string, payload: CreateDelegationDto, user?: CurrentUser) {
    if (String(payload.delegataire_id) === delegantId) {
      throw new BadRequestException('delegataire_id must differ from delegant');
    }

    // Vérifier que le délégant a bien une affectation sur l'entité cible
    if (user && !this.isServicesCentraux(user)) {
      const hasEntiteAccess = await this.prisma.affectation.findFirst({
        where: {
          id_user: BigInt(delegantId),
          id_entite: BigInt(payload.id_entite),
        },
      });
      if (!hasEntiteAccess) {
        throw new ForbiddenException(
          "Vous n'avez pas d'affectation sur cette entité et ne pouvez pas y déléguer des droits",
        );
      }
    }

    const created = await this.prisma.delegation.create({
      data: {
        delegant_id: BigInt(delegantId),
        delegataire_id: BigInt(payload.delegataire_id),
        id_entite: BigInt(payload.id_entite),
        id_role: payload.id_role ?? null,
        type_droit: payload.type_droit,
        date_debut: new Date(payload.date_debut),
        date_fin: payload.date_fin ? new Date(payload.date_fin) : null,
      },
    });

    return this.mapDelegation(await this.prisma.delegation.findUnique({
      where: { id_delegation: created.id_delegation },
      include: {
        utilisateur_delegation_delegant_idToutilisateur: true,
        utilisateur_delegation_delegataire_idToutilisateur: true,
        entite_structure: true,
      },
    }) ?? created);
  }

  async revoke(user: CurrentUser, id: string) {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('Delegation not found');
    }

    const delegation = await this.prisma.delegation.findUnique({
      where: { id_delegation: parsedId },
    });
    if (!delegation) {
      throw new NotFoundException('Delegation not found');
    }

    if (
      !this.isServicesCentraux(user) &&
      String(delegation.delegant_id) !== user.userId
    ) {
      throw new ForbiddenException('Only delegant can revoke this delegation');
    }

    const updated = await this.prisma.delegation.update({
      where: { id_delegation: parsedId },
      data: {
        statut: 'ANNULEE',
        date_fin: new Date(),
      },
    });

    return this.mapDelegation(await this.prisma.delegation.findUnique({
      where: { id_delegation: updated.id_delegation },
      include: {
        utilisateur_delegation_delegant_idToutilisateur: true,
        utilisateur_delegation_delegataire_idToutilisateur: true,
        entite_structure: true,
      },
    }) ?? updated);
  }

  async exportCsv(user: CurrentUser, query?: DelegationsListQueryDto): Promise<string> {
    const items = await this.list(user, query);
    const header = [
      'id_delegation',
      'delegant_nom',
      'delegataire_nom',
      'entite_nom',
      'type_droit',
      'date_debut',
      'date_fin',
      'statut',
    ].join(',');

    const body = items
      .map((item) =>
        [
          item.id_delegation,
          item.delegant_nom ?? '',
          item.delegataire_nom ?? '',
          item.entite_nom ?? '',
          item.type_droit ?? '',
          item.date_debut,
          item.date_fin ?? '',
          item.statut,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    return `${header}\n${body}`;
  }

  private mapDelegation(item: {
    id_delegation: bigint;
    delegant_id: bigint;
    delegataire_id: bigint;
    id_entite: bigint;
    id_role: string | null;
    type_droit: string | null;
    date_debut: Date;
    date_fin: Date | null;
    statut: string;
    utilisateur_delegation_delegant_idToutilisateur?: { nom: string; prenom: string } | null;
    utilisateur_delegation_delegataire_idToutilisateur?: { nom: string; prenom: string } | null;
    entite_structure?: { nom: string } | null;
  }) {
    const delegant = item.utilisateur_delegation_delegant_idToutilisateur;
    const delegataire = item.utilisateur_delegation_delegataire_idToutilisateur;
    return {
      id_delegation: Number(item.id_delegation),
      delegant_id: Number(item.delegant_id),
      delegataire_id: Number(item.delegataire_id),
      id_entite: Number(item.id_entite),
      id_role: item.id_role,
      type_droit: item.type_droit,
      date_debut: item.date_debut.toISOString().slice(0, 10),
      date_fin: item.date_fin ? item.date_fin.toISOString().slice(0, 10) : null,
      statut: item.statut,
      delegant_nom: delegant ? `${delegant.prenom} ${delegant.nom}` : null,
      delegataire_nom: delegataire ? `${delegataire.prenom} ${delegataire.nom}` : null,
      entite_nom: item.entite_structure?.nom ?? null,
    };
  }

  private isServicesCentraux(user: CurrentUser): boolean {
    return user.affectations.some(
      (affectation) => affectation.roleId === ROLE_IDS.SERVICES_CENTRAUX,
    );
  }
}
