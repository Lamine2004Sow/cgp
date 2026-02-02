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
exports.OrganigrammesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let OrganigrammesService = class OrganigrammesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(yearId) {
        const items = await this.prisma.organigramme.findMany({
            where: yearId ? { id_annee: BigInt(yearId) } : undefined,
            orderBy: { generated_at: 'desc' },
        });
        return items.map((item) => this.mapOrganigramme(item));
    }
    async latest(yearId) {
        const organigramme = await this.prisma.organigramme.findFirst({
            where: { id_annee: BigInt(yearId) },
            orderBy: { generated_at: 'desc' },
        });
        const rootId = organigramme?.id_entite_racine
            ? Number(organigramme.id_entite_racine)
            : null;
        const arbre = await this.buildTree(yearId, rootId ?? undefined);
        return { organigramme: organigramme ? this.mapOrganigramme(organigramme) : null, arbre };
    }
    async getTreeById(id) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('Organigramme not found');
        }
        const organigramme = await this.prisma.organigramme.findUnique({
            where: { id_organigramme: parsedId },
        });
        if (!organigramme) {
            throw new common_1.NotFoundException('Organigramme not found');
        }
        const arbre = await this.buildTree(Number(organigramme.id_annee), Number(organigramme.id_entite_racine));
        return { organigramme: this.mapOrganigramme(organigramme), arbre };
    }
    async generate(yearId, rootId, userId) {
        const organigramme = await this.prisma.organigramme.create({
            data: {
                id_annee: BigInt(yearId),
                id_entite_racine: BigInt(rootId),
                generated_by: BigInt(userId),
            },
        });
        const arbre = await this.buildTree(yearId, rootId);
        return { organigramme: this.mapOrganigramme(organigramme), arbre };
    }
    async freeze(id) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('Organigramme not found');
        }
        const organigramme = await this.prisma.organigramme.update({
            where: { id_organigramme: parsedId },
            data: { est_fige: true },
        });
        return { organigramme: this.mapOrganigramme(organigramme) };
    }
    async buildTree(yearId, rootId) {
        const entites = await this.prisma.entite_structure.findMany({
            where: { id_annee: BigInt(yearId) },
            orderBy: { id_entite: 'asc' },
        });
        if (!entites.length) {
            return null;
        }
        const nodes = new Map();
        entites.forEach((entite) => {
            nodes.set(Number(entite.id_entite), {
                id_entite: Number(entite.id_entite),
                nom: entite.nom,
                type_entite: entite.type_entite,
                children: [],
            });
        });
        entites.forEach((entite) => {
            if (entite.id_entite_parent) {
                const parent = nodes.get(Number(entite.id_entite_parent));
                const child = nodes.get(Number(entite.id_entite));
                if (parent && child) {
                    parent.children?.push(child);
                }
            }
        });
        const root = rootId
            ? nodes.get(rootId)
            : nodes.get(Number(entites.find((e) => !e.id_entite_parent)?.id_entite));
        if (!root) {
            return null;
        }
        const entiteIds = Array.from(nodes.keys());
        const affectations = await this.prisma.affectation.findMany({
            where: {
                id_annee: BigInt(yearId),
                id_entite: { in: entiteIds.map((id) => BigInt(id)) },
            },
            include: { utilisateur: true },
        });
        const responsablesMap = new Map();
        affectations.forEach((affectation) => {
            const key = Number(affectation.id_entite);
            const list = responsablesMap.get(key) ?? [];
            list.push({
                nom: affectation.utilisateur.nom,
                prenom: affectation.utilisateur.prenom,
                email_institutionnel: affectation.utilisateur.email_institutionnel,
                id_role: affectation.id_role,
            });
            responsablesMap.set(key, list);
        });
        responsablesMap.forEach((responsables, entiteId) => {
            const node = nodes.get(entiteId);
            if (node) {
                node.responsables = responsables;
            }
        });
        return root;
    }
    mapOrganigramme(item) {
        return {
            id_organigramme: Number(item.id_organigramme),
            id_annee: Number(item.id_annee),
            id_entite_racine: Number(item.id_entite_racine),
            generated_by: Number(item.generated_by),
            generated_at: item.generated_at.toISOString(),
            est_fige: item.est_fige,
            export_path: item.export_path,
            export_format: item.export_format,
            visibility_scope: item.visibility_scope,
        };
    }
};
exports.OrganigrammesService = OrganigrammesService;
exports.OrganigrammesService = OrganigrammesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrganigrammesService);
//# sourceMappingURL=organigrammes.service.js.map