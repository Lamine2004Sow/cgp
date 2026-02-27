import { Injectable } from '@nestjs/common';
import type { Prisma, entite_type } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizePagination } from '../../common/utils/pagination';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async responsables(query: SearchQueryDto) {
    const { page, pageSize, skip } = normalizePagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.affectationWhereInput = {
      ...(query.yearId ? { id_annee: BigInt(query.yearId) } : {}),
      ...(query.roleId ? { id_role: query.roleId } : {}),
      ...(query.q
        ? {
            OR: [
              { utilisateur: { nom: { contains: query.q, mode: 'insensitive' as const } } },
              { utilisateur: { prenom: { contains: query.q, mode: 'insensitive' as const } } },
              {
                utilisateur: {
                  email_institutionnel: { contains: query.q, mode: 'insensitive' as const },
                },
              },
              { entite_structure: { nom: { contains: query.q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.affectation.findMany({
        where,
        include: {
          utilisateur: true,
          role: true,
          entite_structure: true,
        },
        orderBy: [{ id_annee: 'desc' }, { id_affectation: 'asc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.affectation.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id_affectation: Number(item.id_affectation),
        id_user: Number(item.id_user),
        nom: item.utilisateur.nom,
        prenom: item.utilisateur.prenom,
        email_institutionnel: item.utilisateur.email_institutionnel,
        role_id: item.id_role,
        role_label: item.role?.libelle ?? item.id_role,
        id_entite: Number(item.id_entite),
        entite_nom: item.entite_structure?.nom ?? null,
        type_entite: item.entite_structure?.type_entite ?? null,
        id_annee: Number(item.id_annee),
      })),
      page,
      pageSize,
      total,
    };
  }

  async formations(query: SearchQueryDto) {
    const { page, pageSize, skip } = normalizePagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const formationTypes: entite_type[] = ['MENTION', 'PARCOURS', 'NIVEAU'];
    const where: Prisma.entite_structureWhereInput = {
      ...(query.yearId ? { id_annee: BigInt(query.yearId) } : {}),
      type_entite: { in: formationTypes },
      ...(query.q ? { nom: { contains: query.q, mode: 'insensitive' as const } } : {}),
    };

    const [entites, total] = await this.prisma.$transaction([
      this.prisma.entite_structure.findMany({
        where,
        include: {
          affectation: {
            include: {
              utilisateur: true,
              role: true,
            },
          },
        },
        orderBy: [{ type_entite: 'asc' }, { nom: 'asc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.entite_structure.count({ where }),
    ]);

    return {
      items: entites.map((entite) => ({
        id_entite: Number(entite.id_entite),
        id_annee: Number(entite.id_annee),
        type_entite: entite.type_entite,
        nom: entite.nom,
        tel_service: entite.tel_service,
        bureau_service: entite.bureau_service,
        responsables: entite.affectation.map((affectation) => ({
          id_user: Number(affectation.id_user),
          nom: affectation.utilisateur.nom,
          prenom: affectation.utilisateur.prenom,
          role_id: affectation.id_role,
          role_label: affectation.role?.libelle ?? affectation.id_role,
        })),
      })),
      page,
      pageSize,
      total,
    };
  }

  async structures(query: SearchQueryDto) {
    const { page, pageSize, skip } = normalizePagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const typedEntite = this.toEntiteType(query.typeEntite);
    const where: Prisma.entite_structureWhereInput = {
      ...(query.yearId ? { id_annee: BigInt(query.yearId) } : {}),
      ...(typedEntite ? { type_entite: typedEntite } : {}),
      ...(query.q ? { nom: { contains: query.q, mode: 'insensitive' as const } } : {}),
    };

    const [entites, total] = await this.prisma.$transaction([
      this.prisma.entite_structure.findMany({
        where,
        orderBy: [{ type_entite: 'asc' }, { nom: 'asc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.entite_structure.count({ where }),
    ]);

    return {
      items: entites.map((entite) => ({
        id_entite: Number(entite.id_entite),
        id_annee: Number(entite.id_annee),
        id_entite_parent: entite.id_entite_parent ? Number(entite.id_entite_parent) : null,
        type_entite: entite.type_entite,
        nom: entite.nom,
        tel_service: entite.tel_service,
        bureau_service: entite.bureau_service,
      })),
      page,
      pageSize,
      total,
    };
  }

  async secretariats(query: SearchQueryDto) {
    const { page, pageSize, skip } = normalizePagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const where: Prisma.entite_structureWhereInput = {
      ...(query.yearId ? { id_annee: BigInt(query.yearId) } : {}),
      ...(query.q ? { nom: { contains: query.q, mode: 'insensitive' as const } } : {}),
      OR: [{ tel_service: { not: null } }, { bureau_service: { not: null } }],
    };

    const [entites, total] = await this.prisma.$transaction([
      this.prisma.entite_structure.findMany({
        where,
        orderBy: [{ type_entite: 'asc' }, { nom: 'asc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.entite_structure.count({ where }),
    ]);

    return {
      items: entites.map((entite) => ({
        id_entite: Number(entite.id_entite),
        id_annee: Number(entite.id_annee),
        type_entite: entite.type_entite,
        nom: entite.nom,
        tel_service: entite.tel_service,
        bureau_service: entite.bureau_service,
      })),
      page,
      pageSize,
      total,
    };
  }

  private toEntiteType(value?: string): entite_type | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.toUpperCase();
    if (
      normalized === 'COMPOSANTE' ||
      normalized === 'DEPARTEMENT' ||
      normalized === 'MENTION' ||
      normalized === 'PARCOURS' ||
      normalized === 'NIVEAU'
    ) {
      return normalized;
    }

    return undefined;
  }
}
