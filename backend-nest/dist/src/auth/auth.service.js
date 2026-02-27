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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async buildCurrentUserByLogin(login) {
        try {
            const user = await this.prisma.utilisateur.findUnique({
                where: { login },
                include: {
                    affectation: {
                        include: {
                            role: true,
                            entite_structure: true,
                            annee_universitaire: true,
                        },
                    },
                },
            });
            if (!user) {
                return null;
            }
            return {
                userId: String(user.id_user),
                login: user.login,
                nom: user.nom,
                prenom: user.prenom,
                emailInstitutionnel: user.email_institutionnel,
                affectations: user.affectation.map((affectation) => this.mapAffectation(affectation)),
            };
        }
        catch (err) {
            const message = err && typeof err.message === 'string'
                ? err.message
                : 'Service indisponible';
            if (message.includes('connect') || message.includes('Connection')) {
                throw new common_1.HttpException({ message: 'Base de données indisponible. Vérifiez que le serveur et la base sont démarrés.' }, common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            throw new common_1.HttpException({ message: 'Erreur lors de la vérification de l\'utilisateur.' }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    mapAffectation(affectation) {
        return {
            affectationId: String(affectation.id_affectation),
            roleId: affectation.id_role,
            roleLabel: affectation.role?.libelle ?? null,
            entiteId: String(affectation.id_entite),
            entiteType: affectation.entite_structure?.type_entite ?? null,
            entiteName: affectation.entite_structure?.nom ?? null,
            anneeId: String(affectation.id_annee),
            anneeLabel: affectation.annee_universitaire?.libelle ?? null,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map