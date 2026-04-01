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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganigrammesService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
const prisma_service_1 = require("../../common/prisma/prisma.service");
const roles_constants_1 = require("../../auth/roles.constants");
const role_support_utils_1 = require("../../common/utils/role-support.utils");
const HIDDEN_ORG_ROLE_IDS = new Set([
    roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX,
    roles_constants_1.ROLE_IDS.ADMINISTRATEUR,
    roles_constants_1.ROLE_IDS.UTILISATEUR_SIMPLE,
    roles_constants_1.ROLE_IDS.LECTURE_SEULE,
]);
function shouldDisplayInOrgChart(roleId, roleLabel) {
    if (HIDDEN_ORG_ROLE_IDS.has(roleId)) {
        return false;
    }
    return !(0, role_support_utils_1.isSupportRole)(roleId, roleLabel);
}
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
            include: {
                utilisateur: true,
                role: { select: { libelle: true } },
            },
        });
        const responsablesMap = new Map();
        affectations.forEach((affectation) => {
            if (!shouldDisplayInOrgChart(affectation.id_role, affectation.role?.libelle)) {
                return;
            }
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
        const BOX_W = 200;
        const BOX_H = 54;
        const H_GAP = 28;
        const V_GAP = 60;
        const PAGE_MARGIN = 50;
        const HEADER_H = 60;
        const FILLS = [
            [99, 102, 241],
            [59, 130, 246],
            [16, 185, 129],
            [245, 158, 11],
        ];
        const computeWidth = (node) => {
            const children = node.children ?? [];
            if (children.length === 0)
                return BOX_W;
            const childrenW = children.reduce((sum, c) => sum + computeWidth(c), (children.length - 1) * H_GAP);
            return Math.max(BOX_W, childrenW);
        };
        const layoutNodes = [];
        const placeNode = (node, level, leftEdge, subtreeW) => {
            const cx = leftEdge + subtreeW / 2;
            const y = HEADER_H + level * (BOX_H + V_GAP);
            layoutNodes.push({ node, level, x: cx, y, subtreeW });
            const children = node.children ?? [];
            if (children.length === 0)
                return;
            let cursor = leftEdge;
            for (const child of children) {
                const cw = computeWidth(child);
                placeNode(child, level + 1, cursor, cw);
                cursor += cw + H_GAP;
            }
        };
        const totalW = computeWidth(root);
        placeNode(root, 0, PAGE_MARGIN, totalW);
        const maxLevel = Math.max(...layoutNodes.map((n) => n.level));
        const canvasW = totalW + PAGE_MARGIN * 2;
        const canvasH = HEADER_H + (maxLevel + 1) * (BOX_H + V_GAP) + PAGE_MARGIN;
        const doc = new pdfkit_1.default({
            size: [canvasW, canvasH],
            margin: 0,
            info: { Title: `Organigramme ${year}` },
        });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.rect(0, 0, canvasW, HEADER_H).fill('#4f46e5');
        doc
            .fillColor('#ffffff')
            .font('Helvetica-Bold')
            .fontSize(18)
            .text(`Organigramme ${year}`, PAGE_MARGIN, 18, { lineBreak: false });
        doc.lineWidth(1.5).strokeColor('#94a3b8');
        for (const ln of layoutNodes) {
            const parentX = ln.x;
            const parentBottomY = ln.y + BOX_H;
            for (const child of ln.node.children ?? []) {
                const childLn = layoutNodes.find((n) => n.node === child);
                if (!childLn)
                    continue;
                const childTopY = childLn.y;
                const midY = parentBottomY + V_GAP / 2;
                doc
                    .moveTo(parentX, parentBottomY)
                    .lineTo(parentX, midY)
                    .lineTo(childLn.x, midY)
                    .lineTo(childLn.x, childTopY)
                    .stroke();
            }
        }
        for (const ln of layoutNodes) {
            const [r, g, b] = FILLS[Math.min(ln.level, FILLS.length - 1)];
            const fill = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            const boxX = ln.x - BOX_W / 2;
            doc.roundedRect(boxX + 2, ln.y + 2, BOX_W, BOX_H, 6).fill('#00000015');
            doc.roundedRect(boxX, ln.y, BOX_W, BOX_H, 6).fill(fill);
            const label = ln.node.nom.length > 28 ? `${ln.node.nom.slice(0, 26)}…` : ln.node.nom;
            doc
                .fillColor('#ffffff')
                .font('Helvetica-Bold')
                .fontSize(9)
                .text(label, boxX + 8, ln.y + 8, { width: BOX_W - 16, lineBreak: false });
            doc
                .fillColor('#ffffffcc')
                .font('Helvetica')
                .fontSize(7)
                .text(ln.node.type_entite, boxX + 8, ln.y + 23, { width: BOX_W - 16, lineBreak: false });
            const resps = ln.node.responsables ?? [];
            if (resps.length > 0) {
                const respLine = resps
                    .slice(0, 2)
                    .map((r) => `${r.prenom} ${r.nom}`)
                    .join(', ');
                const truncated = respLine.length > 34 ? `${respLine.slice(0, 32)}…` : respLine;
                doc
                    .fillColor('#e0e7ff')
                    .font('Helvetica')
                    .fontSize(6.5)
                    .text(truncated, boxX + 8, ln.y + 37, { width: BOX_W - 16, lineBreak: false });
            }
        }
        doc.end();
        return Buffer.concat(chunks);
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