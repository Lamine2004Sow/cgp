import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { UpdateEntiteDto } from './dto/update-entite.dto';

export type EntiteListItem = {
  id_entite: number;
  id_annee: number;
  id_entite_parent: number | null;
  type_entite: string;
  nom: string;
  tel_service: string | null;
  bureau_service: string | null;
};

/** Rôle considéré comme "responsable" (direction, responsable de formation, etc.) */
const RESPONSABLE_ROLE_IDS = new Set([
  'directeur-composante',
  'directeur-administratif',
  'directeur-administratif-adjoint',
  'directeur-departement',
  'directeur-mention',
  'directeur-specialite',
  'responsable-formation',
  'responsable-annee',
]);

export type AffectationPerson = {
  id_user: number;
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  telephone: string | null;
  bureau: string | null;
  id_role: string;
  role_libelle: string;
  is_responsable: boolean;
};

export type EntiteDetail = EntiteListItem & {
  site_web?: string | null;
  code_interne?: string | null;
  type_diplome?: string | null;
  code_parcours?: string | null;
  libelle_court?: string | null;
  /** Responsables (direction, responsable de formation, etc.) */
  responsables: AffectationPerson[];
  /** Secrétariat et autres affectations sur cette entité */
  secretariat: AffectationPerson[];
  nombre_sous_responsables: number;
  nombre_delegations: number;
  nombre_signalements: number;
};

@Injectable()
export class EntitesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapItem(item: {
    id_entite: bigint;
    id_annee: bigint;
    id_entite_parent: bigint | null;
    type_entite: string;
    nom: string;
    tel_service: string | null;
    bureau_service: string | null;
    composante?: { site_web: string | null } | null;
    departement?: { code_interne: string | null } | null;
    mention?: { type_diplome: string | null } | null;
    parcours?: { code_parcours: string | null } | null;
    niveau?: { libelle_court: string | null } | null;
  }): EntiteDetail {
    const base: EntiteListItem = {
      id_entite: Number(item.id_entite),
      id_annee: Number(item.id_annee),
      id_entite_parent: item.id_entite_parent ? Number(item.id_entite_parent) : null,
      type_entite: item.type_entite,
      nom: item.nom,
      tel_service: item.tel_service,
      bureau_service: item.bureau_service,
    };
    const detail: EntiteDetail = { ...base };
    if (item.composante) detail.site_web = item.composante.site_web;
    if (item.departement) detail.code_interne = item.departement.code_interne;
    if (item.mention) detail.type_diplome = item.mention.type_diplome;
    if (item.parcours) detail.code_parcours = item.parcours.code_parcours;
    if (item.niveau) detail.libelle_court = item.niveau.libelle_court;
    return detail;
  }

  async list(yearId?: number): Promise<EntiteListItem[]> {
    const items = await this.prisma.entite_structure.findMany({
      where: yearId ? { id_annee: BigInt(yearId) } : undefined,
      orderBy: { id_entite: 'asc' },
    });
    return items.map((item) => ({
      id_entite: Number(item.id_entite),
      id_annee: Number(item.id_annee),
      id_entite_parent: item.id_entite_parent ? Number(item.id_entite_parent) : null,
      type_entite: item.type_entite,
      nom: item.nom,
      tel_service: item.tel_service,
      bureau_service: item.bureau_service,
    }));
  }

  /** Retourne l'ensemble des id_entite descendants (récursif) pour une entité donnée, dans la même année */
  private async getDescendantEntiteIds(idEntite: number, idAnnee: number): Promise<Set<number>> {
    const all = await this.prisma.entite_structure.findMany({
      where: { id_annee: BigInt(idAnnee) },
      select: { id_entite: true, id_entite_parent: true },
    });
    const byParent = new Map<number | null, number[]>();
    for (const e of all) {
      const parent = e.id_entite_parent != null ? Number(e.id_entite_parent) : null;
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent)!.push(Number(e.id_entite));
    }
    const out = new Set<number>();
    const stack = [idEntite];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const children = byParent.get(current) ?? [];
      for (const c of children) {
        if (!out.has(c)) {
          out.add(c);
          stack.push(c);
        }
      }
    }
    return out;
  }

  async findOne(id: number): Promise<EntiteDetail | null> {
    const item = await this.prisma.entite_structure.findUnique({
      where: { id_entite: BigInt(id) },
      include: {
        composante: true,
        departement: true,
        mention: true,
        parcours: true,
        niveau: true,
      },
    });
    if (!item) return null;

    const idAnnee = Number(item.id_annee);
    const idEntite = Number(item.id_entite);

    const [affectations, delegationCount, signalementCount, descendantIds] = await Promise.all([
      this.prisma.affectation.findMany({
        where: { id_entite: BigInt(id), id_annee: BigInt(idAnnee) },
        include: {
          utilisateur: true,
          role: true,
        },
      }),
      this.prisma.delegation.count({ where: { id_entite: BigInt(id) } }),
      this.prisma.signalement.count({ where: { id_entite_cible: BigInt(id) } }),
      this.getDescendantEntiteIds(idEntite, idAnnee),
    ]);

    const descendantIdBigInts = [...descendantIds].map((n) => BigInt(n));
    const sousResponsablesCount =
      descendantIdBigInts.length === 0
        ? 0
        : await this.prisma.affectation.count({
            where: {
              id_entite: { in: descendantIdBigInts },
              id_annee: BigInt(idAnnee),
              id_role: { in: [...RESPONSABLE_ROLE_IDS] },
            },
          });

    const mapPerson = (a: (typeof affectations)[0]): AffectationPerson => ({
      id_user: Number(a.id_user),
      nom: a.utilisateur.nom,
      prenom: a.utilisateur.prenom,
      email_institutionnel: a.utilisateur.email_institutionnel,
      telephone: a.utilisateur.telephone,
      bureau: a.utilisateur.bureau,
      id_role: a.id_role,
      role_libelle: a.role?.libelle ?? a.id_role,
      is_responsable: RESPONSABLE_ROLE_IDS.has(a.id_role),
    });

    const allPeople = affectations.map(mapPerson);
    const responsables = allPeople.filter((p) => p.is_responsable);
    const secretariat = allPeople.filter((p) => !p.is_responsable);

    const detail = this.mapItem(item);
    return {
      ...detail,
      responsables,
      secretariat,
      nombre_sous_responsables: sousResponsablesCount,
      nombre_delegations: delegationCount,
      nombre_signalements: signalementCount,
    };
  }

  async update(id: number, dto: UpdateEntiteDto): Promise<EntiteDetail> {
    const existing = await this.prisma.entite_structure.findUnique({
      where: { id_entite: BigInt(id) },
      include: {
        composante: true,
        departement: true,
        mention: true,
        parcours: true,
        niveau: true,
      },
    });
    if (!existing) throw new NotFoundException('Entité introuvable');

    await this.prisma.$transaction(async (tx) => {
      if (
        dto.nom !== undefined ||
        dto.tel_service !== undefined ||
        dto.bureau_service !== undefined
      ) {
        await tx.entite_structure.update({
          where: { id_entite: BigInt(id) },
          data: {
            ...(dto.nom !== undefined && { nom: dto.nom }),
            ...(dto.tel_service !== undefined && { tel_service: dto.tel_service }),
            ...(dto.bureau_service !== undefined && { bureau_service: dto.bureau_service }),
          },
        });
      }
      if (dto.site_web !== undefined && existing.composante) {
        await tx.composante.update({
          where: { id_entite: BigInt(id) },
          data: { site_web: dto.site_web },
        });
      }
      if (dto.code_interne !== undefined && existing.departement) {
        await tx.departement.update({
          where: { id_entite: BigInt(id) },
          data: { code_interne: dto.code_interne },
        });
      }
      if (dto.type_diplome !== undefined && existing.mention) {
        await tx.mention.update({
          where: { id_entite: BigInt(id) },
          data: { type_diplome: dto.type_diplome },
        });
      }
      if (dto.code_parcours !== undefined && existing.parcours) {
        await tx.parcours.update({
          where: { id_entite: BigInt(id) },
          data: { code_parcours: dto.code_parcours },
        });
      }
      if (dto.libelle_court !== undefined && existing.niveau) {
        await tx.niveau.update({
          where: { id_entite: BigInt(id) },
          data: { libelle_court: dto.libelle_court },
        });
      }
    });

    const updated = await this.findOne(id);
    if (!updated) throw new NotFoundException('Entité introuvable');
    return updated;
  }
}
