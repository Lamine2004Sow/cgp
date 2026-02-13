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
const roles_constants_1 = require("../../auth/roles.constants");
let OrganigrammesService = class OrganigrammesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(user, yearId) {
        const items = await this.prisma.organigramme.findMany({
            where: yearId ? { id_annee: BigInt(yearId) } : undefined,
            orderBy: { generated_at: 'desc' },
        });
        if (this.isServicesCentraux(user)) {
            return items.map((item) => this.mapOrganigramme(item));
        }
        const filtered = [];
        for (const item of items) {
            const canAccess = await this.canAccessEntiteInYear(user, String(item.id_entite_racine), String(item.id_annee));
            if (canAccess) {
                filtered.push(item);
            }
        }
        return filtered.map((item) => this.mapOrganigramme(item));
    }
    async latest(user, yearId) {
        const items = await this.list(user, yearId);
        const organigramme = items[0] ?? null;
        const rootId = organigramme?.id_entite_racine ?? null;
        const arbre = await this.buildTree(yearId, rootId ?? undefined);
        return { organigramme: organigramme ?? null, arbre };
    }
    async getTreeById(user, id) {
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
        const canAccess = await this.canAccessEntiteInYear(user, String(organigramme.id_entite_racine), String(organigramme.id_annee));
        if (!canAccess) {
            throw new common_1.ForbiddenException('Out of scope organigramme');
        }
        const arbre = await this.buildTree(Number(organigramme.id_annee), Number(organigramme.id_entite_racine));
        return { organigramme: this.mapOrganigramme(organigramme), arbre };
    }
    async generate(user, yearId, rootId) {
        const rootEntite = await this.prisma.entite_structure.findUnique({
            where: { id_entite: BigInt(rootId) },
            select: {
                id_entite: true,
                id_annee: true,
                type_entite: true,
            },
        });
        if (!rootEntite || Number(rootEntite.id_annee) !== yearId) {
            throw new common_1.NotFoundException('Root entity not found for year');
        }
        const canAccess = await this.canAccessEntiteInYear(user, String(rootEntite.id_entite), String(rootEntite.id_annee));
        if (!canAccess) {
            throw new common_1.ForbiddenException('Out of scope organigramme generation');
        }
        if (rootEntite.type_entite === 'NIVEAU' &&
            !this.isServicesCentraux(user)) {
            throw new common_1.ForbiddenException('Generation at NIVEAU level is restricted to services centraux');
        }
        const organigramme = await this.prisma.organigramme.create({
            data: {
                id_annee: BigInt(yearId),
                id_entite_racine: BigInt(rootId),
                generated_by: BigInt(user.userId),
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
    async export(user, id, format) {
        const { organigramme, arbre } = await this.getTreeById(user, id);
        if (!arbre) {
            throw new common_1.NotFoundException('Organigramme tree not found');
        }
        const normalizedFormat = (format || 'PDF').toUpperCase();
        let fileName = `organigramme-${organigramme.id_annee}-${organigramme.id_organigramme}`;
        let mimeType = 'application/pdf';
        let content;
        if (normalizedFormat === 'JSON') {
            fileName += '.json';
            mimeType = 'application/json';
            content = Buffer.from(JSON.stringify({ organigramme, arbre }, null, 2), 'utf-8');
        }
        else if (normalizedFormat === 'CSV') {
            fileName += '.csv';
            mimeType = 'text/csv';
            content = Buffer.from(this.toCsv(arbre), 'utf-8');
        }
        else {
            fileName += '.pdf';
            mimeType = 'application/pdf';
            content = this.toPdf(arbre, organigramme.id_annee);
        }
        await this.prisma.organigramme.update({
            where: { id_organigramme: BigInt(organigramme.id_organigramme) },
            data: {
                export_format: normalizedFormat,
                export_path: `generated://${fileName}`,
            },
        });
        return {
            fileName,
            mimeType,
            contentBase64: content.toString('base64'),
        };
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
    toCsv(root) {
        const header = ['id_entite', 'nom', 'type_entite', 'parent_entite', 'responsables'].join(',');
        const rows = [];
        const walk = (node, parentId) => {
            const responsables = (node.responsables || [])
                .map((responsable) => `${responsable.prenom} ${responsable.nom} (${responsable.id_role})`)
                .join(' | ');
            rows.push([
                node.id_entite,
                node.nom,
                node.type_entite,
                parentId ?? '',
                responsables,
            ]
                .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                .join(','));
            for (const child of node.children || []) {
                walk(child, node.id_entite);
            }
        };
        walk(root, null);
        return `${header}\n${rows.join('\n')}`;
    }
    toPdf(root, year) {
        const lines = [`Organigramme ${year}`];
        const walk = (node, depth) => {
            const prefix = `${'  '.repeat(depth)}- `;
            lines.push(`${prefix}${node.nom} [${node.type_entite}]`);
            for (const responsable of node.responsables || []) {
                lines.push(`${'  '.repeat(depth + 1)}* ${responsable.prenom} ${responsable.nom} (${responsable.id_role})`);
            }
            for (const child of node.children || []) {
                walk(child, depth + 1);
            }
        };
        walk(root, 0);
        const escapedText = lines
            .map((line) => line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'))
            .join(') Tj T* (');
        const stream = `BT /F1 10 Tf 40 780 Td 14 TL (${escapedText}) Tj ET`;
        const objects = [
            '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
            '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
            '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
            `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
            '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
        ];
        let pdf = '%PDF-1.4\n';
        const offsets = [0];
        for (const object of objects) {
            offsets.push(Buffer.byteLength(pdf, 'utf8'));
            pdf += `${object}\n`;
        }
        const xrefOffset = Buffer.byteLength(pdf, 'utf8');
        pdf += `xref\n0 ${objects.length + 1}\n`;
        pdf += '0000000000 65535 f \n';
        for (let i = 1; i < offsets.length; i += 1) {
            pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
        }
        pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`;
        pdf += `startxref\n${xrefOffset}\n%%EOF`;
        return Buffer.from(pdf, 'utf8');
    }
    isServicesCentraux(user) {
        return user.affectations.some((affectation) => affectation.roleId === roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX);
    }
    async canAccessEntiteInYear(user, entiteId, yearId) {
        if (this.isServicesCentraux(user)) {
            return true;
        }
        const yearAffectations = user.affectations.filter((affectation) => affectation.anneeId === yearId);
        if (yearAffectations.length === 0) {
            return false;
        }
        const userEntites = new Set(yearAffectations.map((affectation) => affectation.entiteId));
        if (userEntites.has(entiteId)) {
            return true;
        }
        let currentId;
        try {
            currentId = BigInt(entiteId);
        }
        catch {
            return false;
        }
        for (let depth = 0; depth < 32; depth += 1) {
            const entite = await this.prisma.entite_structure.findUnique({
                where: { id_entite: currentId },
                select: { id_entite_parent: true, id_annee: true },
            });
            if (!entite || String(entite.id_annee) !== yearId || !entite.id_entite_parent) {
                return false;
            }
            const parentId = String(entite.id_entite_parent);
            if (userEntites.has(parentId)) {
                return true;
            }
            currentId = entite.id_entite_parent;
        }
        return false;
    }
};
exports.OrganigrammesService = OrganigrammesService;
exports.OrganigrammesService = OrganigrammesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrganigrammesService);
//# sourceMappingURL=organigrammes.service.js.map