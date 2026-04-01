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
exports.EntitesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const role_support_utils_1 = require("../../common/utils/role-support.utils");
const NON_RESPONSABLE_ROLES = new Set([
    'services-centraux',
    'administrateur',
    'utilisateur-simple',
    'lecture-seule',
]);
let EntitesService = class EntitesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    mapItem(item) {
        const base = {
            id_entite: Number(item.id_entite),
            id_annee: Number(item.id_annee),
            id_entite_parent: item.id_entite_parent ? Number(item.id_entite_parent) : null,
            type_entite: item.type_entite,
            nom: item.nom,
            tel_service: item.tel_service,
            bureau_service: item.bureau_service,
        };
        const detail = { ...base };
        if (item.composante) {
            detail.site_web = item.composante.site_web;
            detail.code_composante = item.composante.code_composante;
            detail.type_composante = item.composante.type_composante;
            detail.mail_fonctionnel = item.composante.mail_fonctionnel;
            detail.mail_institutionnel = item.composante.mail_institutionnel;
            detail.campus = item.composante.campus;
        }
        if (item.departement)
            detail.code_interne = item.departement.code_interne;
        if (item.mention)
            detail.type_diplome = item.mention.type_diplome;
        if (item.parcours)
            detail.code_parcours = item.parcours.code_parcours;
        if (item.niveau)
            detail.libelle_court = item.niveau.libelle_court;
        return detail;
    }
    async list(yearId) {
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
    async getDescendantEntiteIds(idEntite, idAnnee) {
        const all = await this.prisma.entite_structure.findMany({
            where: { id_annee: BigInt(idAnnee) },
            select: { id_entite: true, id_entite_parent: true },
        });
        const byParent = new Map();
        for (const e of all) {
            const parent = e.id_entite_parent != null ? Number(e.id_entite_parent) : null;
            if (!byParent.has(parent))
                byParent.set(parent, []);
            byParent.get(parent).push(Number(e.id_entite));
        }
        const out = new Set();
        const stack = [idEntite];
        while (stack.length > 0) {
            const current = stack.pop();
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
    async findOne(id) {
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
        if (!item)
            return null;
        const idAnnee = Number(item.id_annee);
        const idEntite = Number(item.id_entite);
        const [affectations, delegationCount, signalementCount, descendantIds] = await Promise.all([
            this.prisma.affectation.findMany({
                where: { id_entite: BigInt(id), id_annee: BigInt(idAnnee) },
                include: {
                    utilisateur: true,
                    role: true,
                    contact_role: true,
                },
            }),
            this.prisma.delegation.count({ where: { id_entite: BigInt(id) } }),
            this.prisma.signalement.count({ where: { id_entite_cible: BigInt(id) } }),
            this.getDescendantEntiteIds(idEntite, idAnnee),
        ]);
        const descendantIdBigInts = [...descendantIds].map((n) => BigInt(n));
        const sousResponsablesCount = descendantIdBigInts.length === 0
            ? 0
            : await this.prisma.affectation.count({
                where: {
                    id_entite: { in: descendantIdBigInts },
                    id_annee: BigInt(idAnnee),
                    id_role: { notIn: [...NON_RESPONSABLE_ROLES] },
                },
            });
        const mapPerson = (a) => {
            const cr = a.contact_role?.[0] ?? null;
            return {
                id_affectation: Number(a.id_affectation),
                id_user: Number(a.id_user),
                nom: a.utilisateur.nom,
                prenom: a.utilisateur.prenom,
                email_institutionnel: a.utilisateur.email_institutionnel,
                telephone: a.utilisateur.telephone,
                bureau: a.utilisateur.bureau,
                id_role: a.id_role,
                role_libelle: a.role?.libelle ?? a.id_role,
                is_responsable: !NON_RESPONSABLE_ROLES.has(a.id_role) &&
                    !(0, role_support_utils_1.isSupportRole)(a.id_role, a.role?.libelle),
                contact: cr
                    ? {
                        id_contact_role: Number(cr.id_contact_role),
                        email_fonctionnelle: cr.email_fonctionnelle,
                        telephone: cr.telephone,
                        bureau: cr.bureau,
                    }
                    : null,
            };
        };
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
    async update(id, dto) {
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
        if (!existing)
            throw new common_1.NotFoundException('Entité introuvable');
        await this.prisma.$transaction(async (tx) => {
            if (dto.nom !== undefined ||
                dto.tel_service !== undefined ||
                dto.bureau_service !== undefined) {
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
        if (!updated)
            throw new common_1.NotFoundException('Entité introuvable');
        return updated;
    }
};
exports.EntitesService = EntitesService;
exports.EntitesService = EntitesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EntitesService);
//# sourceMappingURL=entites.service.js.map