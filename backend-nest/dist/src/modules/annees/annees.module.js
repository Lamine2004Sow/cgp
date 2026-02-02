"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnneesModule = void 0;
const common_1 = require("@nestjs/common");
const annees_controller_1 = require("./annees.controller");
const annees_service_1 = require("./annees.service");
let AnneesModule = class AnneesModule {
};
exports.AnneesModule = AnneesModule;
exports.AnneesModule = AnneesModule = __decorate([
    (0, common_1.Module)({
        controllers: [annees_controller_1.AnneesController],
        providers: [annees_service_1.AnneesService],
    })
], AnneesModule);
//# sourceMappingURL=annees.module.js.map