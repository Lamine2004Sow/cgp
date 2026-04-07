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
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const pagination_1 = require("../../common/utils/pagination");
let SearchService = class SearchService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    parseNumericId(raw) {
        const value = raw?.trim();
        if (!value || !/^\d+$/.test(value)) {
            return null;
        }
        try {
            return BigInt(value);
        }
        catch {
            return null;
        }
    }
    parseEntiteIds(raw) {
        if (!raw)
            return null;
        const ids = raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => BigInt(s));
        return ids.length > 0 ? ids : null;
    }
    async responsables(query) {
        const { page, pageSize, skip } = (0, pagination_1.normalizePagination)({
            page: query.page,
            pageSize: query.pageSize,
        });
        const entiteIds = this.parseEntiteIds(query.entiteIds);
        const numericId = this.parseNumericId(query.q);
        const where = {
            ...(query.yearId ? { id_annee: BigInt(query.yearId) } : {}),
            ...(query.roleId ? { id_role: query.roleId } : {}),
            ...(entiteIds ? { id_entite: { in: entiteIds } } : {}),
            ...(query.q
                ? {
                    OR: [
                        ...(numericId
                            ? [
                                { id_affectation: numericId },
                                { id_user: numericId },
                                { id_entite: numericId },
                            ]
                            : []),
                        { utilisateur: { nom: { contains: query.q, mode: 'insensitive' } } },
                        { utilisateur: { prenom: { contains: query.q, mode: 'insensitive' } } },
                        { utilisateur: { login: { contains: query.q, mode: 'insensitive' } } },
                        {
                            utilisateur: {
                                email_institutionnel: { contains: query.q, mode: 'insensitive' },
                            },
                        },
                        { entite_structure: { nom: { contains: query.q, mode: 'insensitive' } } },
                        {
                            entite_structure: {
                                composante: {
                                    code_composante: { contains: query.q, mode: 'insensitive' },
                                },
                            },
                        },
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
    async formations(query) {
        const { page, pageSize, skip } = (0, pagination_1.normalizePagination)({
            page: query.page,
            pageSize: query.pageSize,
        });
        const entiteIds = this.parseEntiteIds(query.entiteIds);
        const numericId = this.parseNumericId(query.q);
        const formationTypes = ['MENTION', 'PARCOURS', 'NIVEAU'];
        const typedFormation = this.toEntiteType(query.typeEntite);
        const typeFilter = typedFormation
            ? { type_entite: typedFormation }
            : { type_entite: { in: formationTypes } };
        const where = {
            ...(query.yearId ? { id_annee: BigInt(query.yearId) } : {}),
            ...typeFilter,
            ...(entiteIds ? { id_entite: { in: entiteIds } } : {}),
            ...(query.typeDiplome ? { type_diplome: { contains: query.typeDiplome, mode: 'insensitive' } } : {}),
            ...(query.q
                ? {
                    OR: [
                        ...(numericId ? [{ id_entite: numericId }] : []),
                        { nom: { contains: query.q, mode: 'insensitive' } },
                        { parcours: { code_parcours: { contains: query.q, mode: 'insensitive' } } },
                        { niveau: { libelle_court: { contains: query.q, mode: 'insensitive' } } },
                        { mention: { type_diplome: { contains: query.q, mode: 'insensitive' } } },
                    ],
                }
                : {}),
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
    async structures(query) {
        const { page, pageSize, skip } = (0, pagination_1.normalizePagination)({
            page: query.page,
            pageSize: query.pageSize,
        });
        const typedEntite = this.toEntiteType(query.typeEntite);
        const entiteIds = this.parseEntiteIds(query.entiteIds);
        const numericId = this.parseNumericId(query.q);
        const where = {
            ...(query.yearId ? { id_annee: BigInt(query.yearId) } : {}),
            ...(typedEntite ? { type_entite: typedEntite } : {}),
            ...(entiteIds ? { id_entite: { in: entiteIds } } : {}),
            ...(query.q
                ? {
                    OR: [
                        ...(numericId ? [{ id_entite: numericId }] : []),
                        { nom: { contains: query.q, mode: 'insensitive' } },
                        {
                            composante: {
                                code_composante: { contains: query.q, mode: 'insensitive' },
                            },
                        },
                        {
                            departement: {
                                code_interne: { contains: query.q, mode: 'insensitive' },
                            },
                        },
                    ],
                }
                : {}),
        };
        const [entites, total] = await this.prisma.$transaction([
            this.prisma.entite_structure.findMany({
                where,
                include: {
                    composante: { select: { code_composante: true } },
                    departement: { select: { code_interne: true } },
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
                id_entite_parent: entite.id_entite_parent ? Number(entite.id_entite_parent) : null,
                type_entite: entite.type_entite,
                nom: entite.nom,
                tel_service: entite.tel_service,
                bureau_service: entite.bureau_service,
                code_composante: entite.composante?.code_composante ?? null,
                code_interne: entite.departement?.code_interne ?? null,
            })),
            page,
            pageSize,
            total,
        };
    }
    async secretariats(query) {
        const { page, pageSize, skip } = (0, pagination_1.normalizePagination)({
            page: query.page,
            pageSize: query.pageSize,
        });
        const entiteIds = this.parseEntiteIds(query.entiteIds);
        const numericId = this.parseNumericId(query.q);
        const where = {
            ...(query.yearId ? { id_annee: BigInt(query.yearId) } : {}),
            ...(entiteIds ? { id_entite: { in: entiteIds } } : {}),
            ...(query.q
                ? {
                    OR: [
                        ...(numericId ? [{ id_entite: numericId }] : []),
                        { nom: { contains: query.q, mode: 'insensitive' } },
                    ],
                }
                : {}),
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
    toEntiteType(value) {
        if (!value) {
            return undefined;
        }
        const normalized = value.toUpperCase();
        if (normalized === 'COMPOSANTE' ||
            normalized === 'DEPARTEMENT' ||
            normalized === 'MENTION' ||
            normalized === 'PARCOURS' ||
            normalized === 'NIVEAU') {
            return normalized;
        }
        return undefined;
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SearchService);
//# sourceMappingURL=search.service.js.map