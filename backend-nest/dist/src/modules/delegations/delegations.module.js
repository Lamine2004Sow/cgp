"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelegationsModule = void 0;
const common_1 = require("@nestjs/common");
const delegations_controller_1 = require("./delegations.controller");
const delegations_service_1 = require("./delegations.service");
let DelegationsModule = class DelegationsModule {
};
exports.DelegationsModule = DelegationsModule;
exports.DelegationsModule = DelegationsModule = __decorate([
    (0, common_1.Module)({
        controllers: [delegations_controller_1.DelegationsController],
        providers: [delegations_service_1.DelegationsService],
    })
], DelegationsModule);
//# sourceMappingURL=delegations.module.js.map