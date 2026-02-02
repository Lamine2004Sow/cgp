import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';

@Injectable()
export class DelegationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const items = await this.prisma.delegation.findMany({
      orderBy: { date_debut: 'desc' },
      include: {
        utilisateur_delegation_delegant_idToutilisateur: true,
        utilisateur_delegation_delegataire_idToutilisateur: true,
        entite_structure: true,
      },
    });

    return items.map((item) => this.mapDelegation(item));
  }

  async create(delegantId: string, payload: CreateDelegationDto) {
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

  async revoke(id: string) {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('Delegation not found');
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
    utilisateur_delegation_delegant_idToutilisateur?: { nom: string } | null;
    utilisateur_delegation_delegataire_idToutilisateur?: { nom: string } | null;
    entite_structure?: { nom: string } | null;
  }) {
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
      delegant_nom: item.utilisateur_delegation_delegant_idToutilisateur?.nom ?? null,
      delegataire_nom: item.utilisateur_delegation_delegataire_idToutilisateur?.nom ?? null,
      entite_nom: item.entite_structure?.nom ?? null,
    };
  }
}
