import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../types/current-user';
import { ROLE_IDS } from '../../auth/roles.constants';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class YearGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.path?.endsWith('/health')) {
      return true;
    }

    const user = request.user as CurrentUser | undefined;

    if (!user) {
      return false;
    }

    if (
      user.affectations.some(
        (affectation) => affectation.roleId === ROLE_IDS.SERVICES_CENTRAUX,
      )
    ) {
      return true;
    }

    const yearIds = this.extractYearIds(request);
    if (yearIds.length === 0) {
      return true;
    }

    const currentYearId = await this.resolveCurrentYearId();
    if (currentYearId && !yearIds.every((yearId) => yearId === currentYearId)) {
      return false;
    }

    const userYears = new Set(
      user.affectations.map((affectation) => affectation.anneeId),
    );
    return yearIds.every((yearId) => userYears.has(yearId));
  }

  private extractYearIds(request: Request): string[] {
    const values = new Set<string>();
    const candidates: unknown[] = [
      request.params?.anneeId,
      request.params?.id_annee,
      request.query?.anneeId,
      request.query?.id_annee,
      request.query?.yearId,
      request.query?.annee,
    ];

    for (const candidate of candidates) {
      this.addNormalized(candidate, values);
    }

    this.walkBodyForYearIds(request.body, values);
    return Array.from(values);
  }

  private walkBodyForYearIds(value: unknown, out: Set<string>): void {
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        this.walkBodyForYearIds(item, out);
      }
      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (
        key === 'id_annee' ||
        key === 'anneeId' ||
        key === 'yearId' ||
        key === 'annee' ||
        key === 'id_annee_source'
      ) {
        this.addNormalized(child, out);
      }
      this.walkBodyForYearIds(child, out);
    }
  }

  private addNormalized(raw: unknown, out: Set<string>): void {
    if (raw === null || raw === undefined) {
      return;
    }

    if (Array.isArray(raw)) {
      for (const item of raw) {
        this.addNormalized(item, out);
      }
      return;
    }

    const value = String(raw).trim();
    if (!/^\d+$/.test(value)) {
      return;
    }
    out.add(value);
  }

  private async resolveCurrentYearId(): Promise<string | null> {
    const current = await this.prisma.annee_universitaire.findFirst({
      where: { statut: 'EN_COURS' },
      orderBy: { id_annee: 'desc' },
      select: { id_annee: true },
    });

    if (current) {
      return String(current.id_annee);
    }

    const latest = await this.prisma.annee_universitaire.findFirst({
      orderBy: { id_annee: 'desc' },
      select: { id_annee: true },
    });

    return latest ? String(latest.id_annee) : null;
  }
}
