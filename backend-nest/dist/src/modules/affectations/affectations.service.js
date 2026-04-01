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
exports.AffectationsService = exports.UpsertContactDto = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const prisma_service_1 = require("../../common/prisma/prisma.service");
class UpsertContactDto {
    email_fonctionnelle;
    telephone;
    bureau;
}
exports.UpsertContactDto = UpsertContactDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpsertContactDto.prototype, "email_fonctionnelle", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpsertContactDto.prototype, "telephone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], UpsertContactDto.prototype, "bureau", void 0);
const toAffectationResponse = (a) => ({
    id_affectation: Number(a.id_affectation),
    id_user: Number(a.id_user),
    id_role: a.id_role,
    id_entite: Number(a.id_entite),
    id_annee: Number(a.id_annee),
    date_debut: a.date_debut.toISOString().slice(0, 10),
    date_fin: a.date_fin ? a.date_fin.toISOString().slice(0, 10) : null,
    id_affectation_n_plus_1: a.id_affectation_n_plus_1 ? Number(a.id_affectation_n_plus_1) : null,
    superviseur: a.affectation_n_plus_1
        ? {
            id_affectation: Number(a.affectation_n_plus_1.id_affectation),
            id_role: a.affectation_n_plus_1.id_role,
            nom: a.affectation_n_plus_1.utilisateur?.nom ?? null,
            prenom: a.affectation_n_plus_1.utilisateur?.prenom ?? null,
        }
        : null,
});
let AffectationsService = class AffectationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(payload) {
        if (payload.date_fin) {
            const debut = new Date(payload.date_debut);
            const fin = new Date(payload.date_fin);
            if (fin < debut) {
                throw new common_1.BadRequestException('date_fin doit être postérieure ou égale à date_debut');
            }
        }
        const created = await this.prisma.affectation.create({
            data: {
                id_user: BigInt(payload.id_user),
                id_role: payload.id_role,
                id_entite: BigInt(payload.id_entite),
                id_annee: BigInt(payload.id_annee),
                date_debut: new Date(payload.date_debut),
                date_fin: payload.date_fin ? new Date(payload.date_fin) : null,
            },
        });
        return toAffectationResponse(created);
    }
    async findOne(id) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('Affectation introuvable');
        }
        const affectation = await this.prisma.affectation.findUnique({
            where: { id_affectation: parsedId },
            include: {
                affectation_n_plus_1: { include: { utilisateur: { select: { nom: true, prenom: true } } } },
            },
        });
        if (!affectation) {
            throw new common_1.NotFoundException('Affectation introuvable');
        }
        return toAffectationResponse(affectation);
    }
    async update(id, payload) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('Affectation introuvable');
        }
        const existing = await this.prisma.affectation.findUnique({
            where: { id_affectation: parsedId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Affectation introuvable');
        }
        if (payload.date_fin !== undefined && payload.date_fin !== null) {
            const debut = existing.date_debut;
            const fin = new Date(payload.date_fin);
            if (fin < debut) {
                throw new common_1.BadRequestException('date_fin doit être postérieure ou égale à date_debut');
            }
        }
        const updated = await this.prisma.affectation.update({
            where: { id_affectation: parsedId },
            data: {
                ...(payload.id_role !== undefined ? { id_role: payload.id_role } : {}),
                ...(payload.date_fin !== undefined
                    ? { date_fin: payload.date_fin ? new Date(payload.date_fin) : null }
                    : {}),
                ...(payload.id_affectation_n_plus_1 !== undefined
                    ? {
                        id_affectation_n_plus_1: payload.id_affectation_n_plus_1 != null
                            ? BigInt(payload.id_affectation_n_plus_1)
                            : null,
                    }
                    : {}),
            },
            include: {
                affectation_n_plus_1: { include: { utilisateur: { select: { nom: true, prenom: true } } } },
            },
        });
        return toAffectationResponse(updated);
    }
    async remove(id) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('Affectation introuvable');
        }
        const existing = await this.prisma.affectation.findUnique({
            where: { id_affectation: parsedId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Affectation introuvable');
        }
        await this.prisma.affectation.delete({ where: { id_affectation: parsedId } });
    }
    async upsertContact(id, data) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('Affectation introuvable');
        }
        const affectation = await this.prisma.affectation.findUnique({
            where: { id_affectation: parsedId },
        });
        if (!affectation) {
            throw new common_1.NotFoundException('Affectation introuvable');
        }
        const existingContact = await this.prisma.contact_role.findFirst({
            where: { id_affectation: parsedId },
        });
        const payload = {
            email_fonctionnelle: data.email_fonctionnelle ?? null,
            telephone: data.telephone ?? null,
            bureau: data.bureau ?? null,
        };
        const contact = existingContact
            ? await this.prisma.contact_role.update({
                where: { id_contact_role: existingContact.id_contact_role },
                data: payload,
            })
            : await this.prisma.contact_role.create({
                data: { id_affectation: parsedId, ...payload },
            });
        return {
            id_contact_role: Number(contact.id_contact_role),
            id_affectation: Number(contact.id_affectation),
            email_fonctionnelle: contact.email_fonctionnelle,
            telephone: contact.telephone,
            bureau: contact.bureau,
        };
    }
};
exports.AffectationsService = AffectationsService;
exports.AffectationsService = AffectationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AffectationsService);
//# sourceMappingURL=affectations.service.js.map