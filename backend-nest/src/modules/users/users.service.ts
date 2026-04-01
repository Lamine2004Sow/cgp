import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizePagination, type PageResult } from '../../common/utils/pagination';
import type { UsersListQueryDto } from './dto/users-list-query.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { CurrentUser } from '../../common/types/current-user';
import { ROLE_IDS } from '../../auth/roles.constants';

const SORT_FIELDS: Record<string, Prisma.utilisateurOrderByWithRelationInput> = {
  login: { login: 'asc' },
  nom: { nom: 'asc' },
  prenom: { prenom: 'asc' },
};

export interface UserRoleRow {
  id_affectation: number;
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

  async findAll(
    query: UsersListQueryDto,
    currentUser: CurrentUser,
  ): Promise<PageResult<UserListItem>> {
    const { page, pageSize, skip } = normalizePagination({
      page: query.page,
      pageSize: query.pageSize,
    });

    const yearFilter = query.yearId ? BigInt(query.yearId) : undefined;
    const { where, orderBy } = this.buildQuery(query, yearFilter);
    const scopedWhere = await this.applyListScope(where, currentUser, query.yearId);

    if (!scopedWhere) {
      return {
        items: [],
        page,
        pageSize,
        total: 0,
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.utilisateur.findMany({
        where: scopedWhere,
        orderBy,
        skip,
        take: pageSize,
        include: {
          affectation: {
            where: yearFilter ? { id_annee: yearFilter } : undefined,
            include: {
              role: { select: { niveau_hierarchique: true } },
              entite_structure: { select: { nom: true } },
            },
          },
        },
      }),
      this.prisma.utilisateur.count({ where: scopedWhere }),
    ]);

    return {
      items: items.map((item) => this.toUserListItem(item)),
      page,
      pageSize,
      total,
    };
  }

  async findOne(id: string, currentUser?: CurrentUser): Promise<UserListItem | null> {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      return null;
    }

    const user = await this.prisma.utilisateur.findFirst({
      where: { id_user: parsedId, statut: 'ACTIF' },
      include: {
        affectation: {
          include: {
            role: { select: { niveau_hierarchique: true } },
            entite_structure: { select: { nom: true } },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    if (!currentUser || this.isPrivilegedReader(currentUser)) {
      return this.toUserListItem(user);
    }

    if (currentUser.userId === String(user.id_user)) {
      return this.toUserListItem(user);
    }

    const targetYearIds = Array.from(
      new Set((user.affectation || []).map((affectation) => String(affectation.id_annee))),
    );
    const scope = await this.expandUserEntiteScope(currentUser, targetYearIds);
    if (scope.size === 0) {
      return null;
    }

    const canAccess = (user.affectation || []).some(
      (affectation) =>
        scope.has(String(affectation.id_entite)) &&
        targetYearIds.includes(String(affectation.id_annee)),
    );
    if (!canAccess) {
      return null;
    }

    return this.toUserListItem(user);
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
        ...(payload.nom !== undefined ? { nom: payload.nom } : {}),
        ...(payload.prenom !== undefined ? { prenom: payload.prenom } : {}),
        ...(payload.email_institutionnel !== undefined ? { email_institutionnel: payload.email_institutionnel } : {}),
        ...(payload.telephone !== undefined ? { telephone: payload.telephone } : {}),
        ...(payload.bureau !== undefined ? { bureau: payload.bureau } : {}),
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

    const user = await this.prisma.utilisateur.findUnique({
      where: { id_user: parsedId, statut: 'ACTIF' },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.utilisateur.update({
      where: { id_user: parsedId },
      data: { statut: 'INACTIF' },
    });
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
      id_affectation: bigint;
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
        id_affectation: Number(affectation.id_affectation),
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

    const baseWhere: Prisma.utilisateurWhereInput = {
      statut: 'ACTIF',
      ...(filters
        ? {
            OR: [
              { login: { contains: filters, mode: 'insensitive' } },
              { nom: { contains: filters, mode: 'insensitive' } },
              { prenom: { contains: filters, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

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

  private async applyListScope(
    where: Prisma.utilisateurWhereInput,
    user: CurrentUser,
    yearId?: number,
  ): Promise<Prisma.utilisateurWhereInput | null> {
    if (this.isPrivilegedReader(user)) {
      return where;
    }

    const yearIds = yearId
      ? [String(yearId)]
      : Array.from(new Set(user.affectations.map((affectation) => affectation.anneeId)));
    if (yearIds.length === 0) {
      return null;
    }

    const entiteScope = await this.expandUserEntiteScope(user, yearIds);
    if (entiteScope.size === 0) {
      return null;
    }

    const scopeFilter: Prisma.utilisateurWhereInput = {
      affectation: {
        some: {
          id_entite: {
            in: Array.from(entiteScope).map((id) => BigInt(id)),
          },
          id_annee: {
            in: yearIds.map((id) => BigInt(id)),
          },
        },
      },
    };

    return { AND: [where, scopeFilter] };
  }

  private async expandUserEntiteScope(
    user: CurrentUser,
    yearIds: string[],
  ): Promise<Set<string>> {
    const seeds = new Set(
      user.affectations
        .filter((affectation) => yearIds.includes(affectation.anneeId))
        .map((affectation) => affectation.entiteId),
    );
    if (seeds.size === 0) {
      return new Set();
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

    return scope;
  }

  private isInSeedTree(
    entiteId: string,
    seeds: Set<string>,
    parentById: Map<string, string | null>,
  ): boolean {
    if (seeds.has(entiteId)) {
      return true;
    }

    let current: string | null = parentById.get(entiteId) ?? null;
    for (let depth = 0; depth < 32 && current; depth += 1) {
      if (seeds.has(current)) {
        return true;
      }
      current = parentById.get(current) ?? null;
    }
    return false;
  }

  private isPrivilegedReader(user: CurrentUser): boolean {
    return user.affectations.some(
      (affectation) =>
        affectation.roleId === ROLE_IDS.SERVICES_CENTRAUX ||
        affectation.roleId === ROLE_IDS.ADMINISTRATEUR,
    );
  }
}
