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
exports.ImportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ImportsService = class ImportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async previewResponsables(payload) {
        const roleMap = await this.getRoleLabelMap();
        const summary = { total: payload.rows.length, newUser: 0, updateUser: 0, duplicateAffectation: 0, error: 0 };
        const items = [];
        for (let i = 0; i < payload.rows.length; i += 1) {
            const row = payload.rows[i];
            const entite = await this.prisma.entite_structure.findUnique({
                where: {
                    id_entite: BigInt(row.id_entite),
                    id_annee: BigInt(row.id_annee),
                },
                select: { nom: true },
            });
            const anneeExists = await this.prisma.annee_universitaire.findUnique({
                where: { id_annee: BigInt(row.id_annee) },
                select: { id_annee: true },
            });
            const roleExists = roleMap.has(row.id_role);
            if (!entite || !anneeExists || !roleExists) {
                const msg = !entite
                    ? `Entité ${row.id_entite} introuvable pour l'année ${row.id_annee}`
                    : !anneeExists
                        ? `Année ${row.id_annee} introuvable`
                        : `Rôle "${row.id_role}" introuvable`;
                items.push({
                    rowIndex: i,
                    status: 'error',
                    login: row.login,
                    nom: row.nom,
                    prenom: row.prenom,
                    id_role: row.id_role,
                    id_entite: row.id_entite,
                    id_annee: row.id_annee,
                    entiteNom: entite?.nom ?? null,
                    roleLabel: roleMap.get(row.id_role) ?? null,
                    error: msg,
                });
                summary.error += 1;
                continue;
            }
            const existingUser = await this.prisma.utilisateur.findUnique({
                where: { login: row.login },
                select: {
                    id_user: true,
                    nom: true,
                    prenom: true,
                    email_institutionnel: true,
                    telephone: true,
                    bureau: true,
                },
            });
            const existingAffectation = existingUser
                ? await this.prisma.affectation.findFirst({
                    where: {
                        id_user: existingUser.id_user,
                        id_role: row.id_role,
                        id_entite: BigInt(row.id_entite),
                        id_annee: BigInt(row.id_annee),
                    },
                })
                : null;
            if (existingAffectation) {
                items.push({
                    rowIndex: i,
                    status: 'duplicate_affectation',
                    login: row.login,
                    nom: row.nom,
                    prenom: row.prenom,
                    id_role: row.id_role,
                    id_entite: row.id_entite,
                    id_annee: row.id_annee,
                    entiteNom: entite.nom,
                    roleLabel: roleMap.get(row.id_role) ?? null,
                });
                summary.duplicateAffectation += 1;
                continue;
            }
            if (existingUser) {
                const changes = this.computeUserChanges(existingUser, row);
                items.push({
                    rowIndex: i,
                    status: 'update_user',
                    login: row.login,
                    nom: row.nom,
                    prenom: row.prenom,
                    id_role: row.id_role,
                    id_entite: row.id_entite,
                    id_annee: row.id_annee,
                    entiteNom: entite.nom,
                    roleLabel: roleMap.get(row.id_role) ?? null,
                    changes: changes.length ? changes : undefined,
                });
                summary.updateUser += 1;
            }
            else {
                items.push({
                    rowIndex: i,
                    status: 'new_user',
                    login: row.login,
                    nom: row.nom,
                    prenom: row.prenom,
                    id_role: row.id_role,
                    id_entite: row.id_entite,
                    id_annee: row.id_annee,
                    entiteNom: entite.nom,
                    roleLabel: roleMap.get(row.id_role) ?? null,
                });
                summary.newUser += 1;
            }
        }
        return { items, summary };
    }
    computeUserChanges(existing, row) {
        const changes = [];
        const fields = [
            { key: 'nom', label: 'Nom', major: true },
            { key: 'prenom', label: 'Prénom', major: true },
            { key: 'email_institutionnel', label: 'Email', major: true },
            { key: 'telephone', label: 'Téléphone', major: false },
            { key: 'bureau', label: 'Bureau', major: false },
        ];
        const rowData = {
            nom: row.nom,
            prenom: row.prenom,
            email_institutionnel: row.email_institutionnel ?? null,
            telephone: row.telephone ?? null,
            bureau: row.bureau ?? null,
        };
        for (const { key, label, major } of fields) {
            const oldVal = existing[key] ?? null;
            const newVal = rowData[key] ?? null;
            const o = oldVal != null ? String(oldVal) : '';
            const n = newVal != null ? String(newVal) : '';
            if (o !== n) {
                changes.push({ field: label, oldValue: oldVal, newValue: newVal, major });
            }
        }
        return changes;
    }
    async getRoleLabelMap() {
        const roles = await this.prisma.role.findMany({
            select: { id_role: true, libelle: true },
        });
        return new Map(roles.map((r) => [r.id_role, r.libelle]));
    }
    async importResponsables(payload, excludeIndices) {
        const set = new Set(excludeIndices ?? []);
        const rows = payload.rows.filter((_, i) => !set.has(i));
        if (rows.length === 0) {
            return {
                imported_rows: 0,
                created_users: 0,
                created_affectations: 0,
            };
        }
        let createdUsers = 0;
        let createdAffectations = 0;
        await this.prisma.$transaction(async (tx) => {
            for (const row of rows) {
                const userResult = await this.upsertUser(tx, row);
                if (userResult.created) {
                    createdUsers += 1;
                }
                const exists = await tx.affectation.findFirst({
                    where: {
                        id_user: userResult.id,
                        id_role: row.id_role,
                        id_entite: BigInt(row.id_entite),
                        id_annee: BigInt(row.id_annee),
                    },
                });
                if (!exists) {
                    await tx.affectation.create({
                        data: {
                            id_user: userResult.id,
                            id_role: row.id_role,
                            id_entite: BigInt(row.id_entite),
                            id_annee: BigInt(row.id_annee),
                            date_debut: new Date(row.date_debut),
                            date_fin: row.date_fin ? new Date(row.date_fin) : null,
                        },
                    });
                    createdAffectations += 1;
                }
            }
        });
        return {
            imported_rows: rows.length,
            created_users: createdUsers,
            created_affectations: createdAffectations,
        };
    }
    async upsertUser(tx, row) {
        const existing = await tx.utilisateur.findUnique({
            where: { login: row.login },
            select: { id_user: true },
        });
        if (existing) {
            await tx.utilisateur.update({
                where: { id_user: existing.id_user },
                data: {
                    nom: row.nom,
                    prenom: row.prenom,
                    email_institutionnel: row.email_institutionnel ?? null,
                    telephone: row.telephone ?? null,
                    bureau: row.bureau ?? null,
                },
            });
            return { id: existing.id_user, created: false };
        }
        const created = await tx.utilisateur.create({
            data: {
                login: row.login,
                nom: row.nom,
                prenom: row.prenom,
                email_institutionnel: row.email_institutionnel ?? null,
                telephone: row.telephone ?? null,
                bureau: row.bureau ?? null,
            },
            select: { id_user: true },
        });
        return { id: created.id_user, created: true };
    }
};
exports.ImportsService = ImportsService;
exports.ImportsService = ImportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ImportsService);
//# sourceMappingURL=imports.service.js.map