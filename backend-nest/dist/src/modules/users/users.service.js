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
    async findAll(query) {
        const { page, pageSize, skip } = (0, pagination_1.normalizePagination)({
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
    async findOne(id) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
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
                nom: payload.nom,
                prenom: payload.prenom,
                email_institutionnel: payload.email_institutionnel,
                telephone: payload.telephone,
                bureau: payload.bureau,
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
        await this.prisma.utilisateur.delete({ where: { id_user: parsedId } });
    }
    toUserListItem(user) {
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
    buildQuery(query, yearFilter) {
        const filters = query.filters?.trim();
        const baseWhere = filters
            ? {
                OR: [
                    { login: { contains: filters, mode: 'insensitive' } },
                    { nom: { contains: filters, mode: 'insensitive' } },
                    { prenom: { contains: filters, mode: 'insensitive' } },
                ],
            }
            : {};
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map