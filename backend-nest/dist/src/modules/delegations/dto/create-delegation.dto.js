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
exports.CreateDelegationDto = exports.TYPE_DROIT_VALUES = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
exports.TYPE_DROIT_VALUES = [
    'view',
    'manage_responsables',
    'assign_role',
    'validate_signalement',
    'generate_orgchart',
    'import_data',
    'full',
];
class CreateDelegationDto {
    delegataire_id;
    id_entite;
    id_role;
    type_droit;
    date_debut;
    date_fin;
}
exports.CreateDelegationDto = CreateDelegationDto;
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateDelegationDto.prototype, "delegataire_id", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateDelegationDto.prototype, "id_entite", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], CreateDelegationDto.prototype, "id_role", void 0);
__decorate([
    (0, class_validator_1.IsIn)(exports.TYPE_DROIT_VALUES, {
        message: `type_droit doit être l'une des valeurs : ${exports.TYPE_DROIT_VALUES.join(', ')}`,
    }),
    __metadata("design:type", String)
], CreateDelegationDto.prototype, "type_droit", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateDelegationDto.prototype, "date_debut", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", Object)
], CreateDelegationDto.prototype, "date_fin", void 0);
//# sourceMappingURL=create-delegation.dto.js.map