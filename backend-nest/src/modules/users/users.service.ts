import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizePagination, type PageResult } from '../../common/utils/pagination';
import type { UsersListQueryDto } from './dto/users-list-query.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

const SORT_FIELDS: Record<string, Prisma.utilisateurOrderByWithRelationInput> = {
  login: { login: 'asc' },
  nom: { nom: 'asc' },
  prenom: { prenom: 'asc' },
};

export interface UserRoleRow {
  role: string;
  entite: string;
  id_entite: number;
  id_annee: number;
  niveau_hierarchique: number;
}

export interface UserListItem {
  id_user: number;
  login: string;
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  telephone: string | null;
  bureau: string | null;
  roles: UserRoleRow[];
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UsersListQueryDto): Promise<PageResult<UserListItem>> {
    const { page, pageSize, skip } = normalizePagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const yearFilter = query.yearId ? BigInt(query.yearId) : undefined;
    const { where, orderBy } = this.buildQuery(query, yearFilter);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.utilisateur.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          affectation: {
            where: yearFilter ? { id_annee: yearFilter } : undefined,
            include: { role: true, entite_structure: true },
          },
        },
      }),
      this.prisma.utilisateur.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toUserListItem(item)),
      page,
      pageSize,
      total,
    };
  }

  async findOne(id: string): Promise<UserListItem | null> {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      return null;
    }

    const user = await this.prisma.utilisateur.findUnique({
      where: { id_user: parsedId },
      include: {
        affectation: {
          include: { role: true, entite_structure: true },
        },
      },
    });

    return user ? this.toUserListItem(user) : null;
  }

  async create(payload: CreateUserDto): Promise<UserListItem> {
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.utilisateur.create({
        data: {
          login: payload.login,
          nom: payload.nom,
          prenom: payload.prenom,
          email_institutionnel: payload.email_institutionnel ?? null,
          telephone: payload.telephone ?? null,
          bureau: payload.bureau ?? null,
        },
      });

      if (payload.affectations?.length) {
        await tx.affectation.createMany({
          data: payload.affectations.map((affectation) => ({
            id_user: user.id_user,
            id_role: affectation.id_role,
            id_entite: BigInt(affectation.id_entite),
            id_annee: BigInt(affectation.id_annee),
            date_debut: new Date(affectation.date_debut),
            date_fin: affectation.date_fin ? new Date(affectation.date_fin) : null,
          })),
        });
      }

      return user;
    });

    const full = await this.findOne(String(created.id_user));
    if (!full) {
      throw new NotFoundException('User not found after creation');
    }
    return full;
  }

  async update(id: string, payload: UpdateUserDto): Promise<UserListItem> {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('User not found');
    }

    await this.prisma.utilisateur.update({
      where: { id_user: parsedId },
      data: {
        nom: payload.nom,
        prenom: payload.prenom,
        email_institutionnel: payload.email_institutionnel,
        telephone: payload.telephone,
        bureau: payload.bureau,
      },
    });

    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('User not found');
    }

    await this.prisma.utilisateur.delete({ where: { id_user: parsedId } });
  }

  private toUserListItem(user: {
    id_user: bigint;
    login: string;
    nom: string;
    prenom: string;
    email_institutionnel: string | null;
    telephone: string | null;
    bureau: string | null;
    affectation: Array<{
      id_role: string;
      id_entite: bigint;
      id_annee: bigint;
      role: { niveau_hierarchique: number } | null;
      entite_structure: { nom: string } | null;
    }>;
  }): UserListItem {
    return {
      id_user: Number(user.id_user),
      login: user.login,
      nom: user.nom,
      prenom: user.prenom,
      email_institutionnel: user.email_institutionnel,
      telephone: user.telephone,
      bureau: user.bureau,
      roles: (user.affectation || []).map((affectation) => ({
        role: affectation.id_role,
        entite: affectation.entite_structure?.nom ?? `Entite ${affectation.id_entite}`,
        id_entite: Number(affectation.id_entite),
        id_annee: Number(affectation.id_annee),
        niveau_hierarchique: affectation.role?.niveau_hierarchique ?? 0,
      })),
    };
  }

  private buildQuery(
    query: UsersListQueryDto,
    yearFilter?: bigint,
  ): {
    where: Prisma.utilisateurWhereInput;
    orderBy: Prisma.utilisateurOrderByWithRelationInput;
  } {
    const filters = query.filters?.trim();

    const baseWhere: Prisma.utilisateurWhereInput = filters
      ? {
          OR: [
            { login: { contains: filters, mode: 'insensitive' } },
            { nom: { contains: filters, mode: 'insensitive' } },
            { prenom: { contains: filters, mode: 'insensitive' } },
          ],
        }
      : {};

    const where: Prisma.utilisateurWhereInput = yearFilter
      ? {
          AND: [
            baseWhere,
            {
              affectation: {
                some: {
                  id_annee: yearFilter,
                },
              },
            },
          ],
        }
      : baseWhere;

    const orderBy = this.parseSort(query.sort);

    return { where, orderBy };
  }

  private parseSort(sort?: string): Prisma.utilisateurOrderByWithRelationInput {
    if (!sort) {
      return { nom: 'asc' };
    }

    const [field, direction] = sort.split(':');
    const normalizedDirection = direction === 'desc' ? 'desc' : 'asc';

    if (field && SORT_FIELDS[field]) {
      return { [field]: normalizedDirection } as Prisma.utilisateurOrderByWithRelationInput;
    }

    return { nom: 'asc' };
  }
}
