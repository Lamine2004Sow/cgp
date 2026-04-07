"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const pagination_1 = require("../../common/utils/pagination");
const roles_constants_1 = require("../../auth/roles.constants");
const SORT_FIELDS = {
    login: { login: 'asc' },
    nom: { nom: 'asc' },
    prenom: { prenom: 'asc' },
};
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    parseNumericId(value) {
        const normalized = value?.trim();
        if (!normalized || !/^\d+$/.test(normalized)) {
            return null;
        }
        try {
            return BigInt(normalized);
        }
        catch {
            return null;
        }
    }
    async findAll(query, currentUser) {
        const { page, pageSize, skip } = (0, pagination_1.normalizePagination)({
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
    async findOne(id, currentUser) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
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
        const targetYearIds = Array.from(new Set((user.affectation || []).map((affectation) => String(affectation.id_annee))));
        const scope = await this.expandUserEntiteScope(currentUser, targetYearIds);
        if (scope.size === 0) {
            return null;
        }
        const canAccess = (user.affectation || []).some((affectation) => scope.has(String(affectation.id_entite)) &&
            targetYearIds.includes(String(affectation.id_annee)));
        if (!canAccess) {
            return null;
        }
        return this.toUserListItem(user);
    }
    async create(payload) {
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
            throw new common_1.NotFoundException('User not found after creation');
        }
        return full;
    }
    async update(id, payload) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('User not found');
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
            throw new common_1.NotFoundException('User not found');
        }
        return updated;
    }
    async remove(id) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('User not found');
        }
        const user = await this.prisma.utilisateur.findUnique({
            where: { id_user: parsedId, statut: 'ACTIF' },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.prisma.utilisateur.update({
            where: { id_user: parsedId },
            data: { statut: 'INACTIF' },
        });
    }
    toUserListItem(user) {
        return {
            id_user: Number(user.id_user),
            login: user.login,
            nom: user.nom,
            prenom: user.prenom,
            email_institutionnel: user.email_institutionnel,
            email_institutionnel_secondaire: user.email_institutionnel_secondaire,
            genre: user.genre,
            categorie: user.categorie,
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
    buildQuery(query, yearFilter) {
        const filters = query.filters?.trim();
        const numericId = this.parseNumericId(filters);
        const baseWhere = {
            statut: 'ACTIF',
            ...(filters
                ? {
                    OR: [
                        ...(numericId ? [{ id_user: numericId }] : []),
                        { login: { contains: filters, mode: 'insensitive' } },
                        { nom: { contains: filters, mode: 'insensitive' } },
                        { prenom: { contains: filters, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const where = yearFilter
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
    parseSort(sort) {
        if (!sort) {
            return { nom: 'asc' };
        }
        const [field, direction] = sort.split(':');
        const normalizedDirection = direction === 'desc' ? 'desc' : 'asc';
        if (field && SORT_FIELDS[field]) {
            return { [field]: normalizedDirection };
        }
        return { nom: 'asc' };
    }
    async applyListScope(where, user, yearId) {
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
        const scopeFilter = {
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
    async expandUserEntiteScope(user, yearIds) {
        const seeds = new Set(user.affectations
            .filter((affectation) => yearIds.includes(affectation.anneeId))
            .map((affectation) => affectation.entiteId));
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
        const parentById = new Map();
        for (const entite of entites) {
            parentById.set(String(entite.id_entite), entite.id_entite_parent ? String(entite.id_entite_parent) : null);
        }
        const scope = new Set();
        for (const entite of entites) {
            const entiteId = String(entite.id_entite);
            if (this.isInSeedTree(entiteId, seeds, parentById)) {
                scope.add(entiteId);
            }
        }
        return scope;
    }
    isInSeedTree(entiteId, seeds, parentById) {
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
    isPrivilegedReader(user) {
        return user.affectations.some((affectation) => affectation.roleId === roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX ||
            affectation.roleId === roles_constants_1.ROLE_IDS.ADMINISTRATEUR);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map