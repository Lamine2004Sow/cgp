"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const auth_module_1 = require("./auth/auth.module");
const authorization_service_1 = require("./auth/authorization.service");
const prisma_module_1 = require("./common/prisma/prisma.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const mock_auth_guard_1 = require("./common/guards/mock-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const audit_interceptor_1 = require("./common/interceptors/audit.interceptor");
const affectations_module_1 = require("./modules/affectations/affectations.module");
const annees_module_1 = require("./modules/annees/annees.module");
const audit_module_1 = require("./modules/audit/audit.module");
const delegations_module_1 = require("./modules/delegations/delegations.module");
const demandes_module_1 = require("./modules/demandes/demandes.module");
const entites_module_1 = require("./modules/entites/entites.module");
const exports_module_1 = require("./modules/exports/exports.module");
const imports_module_1 = require("./modules/imports/imports.module");
const organigrammes_module_1 = require("./modules/organigrammes/organigrammes.module");
const roles_module_1 = require("./modules/roles/roles.module");
const users_module_1 = require("./modules/users/users.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
                cache: true,
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            roles_module_1.RolesModule,
            affectations_module_1.AffectationsModule,
            annees_module_1.AnneesModule,
            entites_module_1.EntitesModule,
            delegations_module_1.DelegationsModule,
            organigrammes_module_1.OrganigrammesModule,
            demandes_module_1.DemandesModule,
            audit_module_1.AuditModule,
            exports_module_1.ExportsModule,
            imports_module_1.ImportsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            authorization_service_1.AuthorizationService,
            { provide: core_1.APP_FILTER, useClass: http_exception_filter_1.HttpExceptionFilter },
            { provide: core_1.APP_INTERCEPTOR, useClass: audit_interceptor_1.AuditInterceptor },
            { provide: core_1.APP_GUARD, useClass: mock_auth_guard_1.MockAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map