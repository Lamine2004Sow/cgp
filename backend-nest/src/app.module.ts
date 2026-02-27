import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { AuthorizationService } from './auth/authorization.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { MockAuthGuard } from './common/guards/mock-auth.guard';
import { ThrottleGuard } from './common/guards/throttle.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ScopeGuard } from './common/guards/scope.guard';
import { YearGuard } from './common/guards/year.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AffectationsModule } from './modules/affectations/affectations.module';
import { AnneesModule } from './modules/annees/annees.module';
import { AuditModule } from './modules/audit/audit.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DelegationsModule } from './modules/delegations/delegations.module';
import { DemandesModule } from './modules/demandes/demandes.module';
import { EntitesModule } from './modules/entites/entites.module';
import { ExportsModule } from './modules/exports/exports.module';
import { ImportsModule } from './modules/imports/imports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrganigrammesModule } from './modules/organigrammes/organigrammes.module';
import { RolesModule } from './modules/roles/roles.module';
import { SearchModule } from './modules/search/search.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    SearchModule,
    AffectationsModule,
    AnneesModule,
    EntitesModule,
    DelegationsModule,
    OrganigrammesModule,
    DemandesModule,
    AuditModule,
    DashboardModule,
    ExportsModule,
    ImportsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AuthorizationService,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottleGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_GUARD, useClass: MockAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ScopeGuard },
    { provide: APP_GUARD, useClass: YearGuard },
  ],
})
export class AppModule {}
