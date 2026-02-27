import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../types/current-user';
import { PrismaService } from '../prisma/prisma.service';
import { ROLE_IDS } from '../../auth/roles.constants';

@Injectable()
export class ScopeGuard implements CanActivate {
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

    const entiteIds = this.extractEntiteIds(request);
    if (entiteIds.length === 0) {
      return true;
    }

    const userEntiteIds = new Set(
      user.affectations.map((affectation) => affectation.entiteId),
    );

    for (const entiteId of entiteIds) {
      if (userEntiteIds.has(entiteId)) {
        continue;
      }

      const inHierarchy = await this.isDescendantOfUserScope(entiteId, userEntiteIds);
      if (!inHierarchy) {
        return false;
      }
    }

    return true;
  }

  private extractEntiteIds(request: Request): string[] {
    const values = new Set<string>();
    const candidates: unknown[] = [
      request.params?.entiteId,
      request.params?.id_entite,
      request.params?.id_entite_cible,
      request.params?.id_entite_racine,
      request.query?.entiteId,
      request.query?.id_entite,
      request.query?.id_entite_cible,
      request.query?.id_entite_racine,
      request.query?.scopeEntite,
    ];

    for (const candidate of candidates) {
      this.addNormalized(candidate, values);
    }

    this.walkBodyForEntiteIds(request.body, values);

    return Array.from(values);
  }

  private walkBodyForEntiteIds(value: unknown, out: Set<string>): void {
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        this.walkBodyForEntiteIds(item, out);
      }
      return;
    }

    if (typeof value !== 'object') {
      return;
    }

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (
        key === 'id_entite' ||
        key === 'id_entite_cible' ||
        key === 'id_entite_racine' ||
        key === 'entiteId' ||
        key === 'scopeEntite' ||
        key === 'id_composante'
      ) {
        this.addNormalized(child, out);
      }
      this.walkBodyForEntiteIds(child, out);
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

  private async isDescendantOfUserScope(
    entiteId: string,
    userEntiteIds: Set<string>,
  ): Promise<boolean> {
    let currentId: bigint;
    try {
      currentId = BigInt(entiteId);
    } catch {
      return false;
    }

    for (let depth = 0; depth < 32; depth += 1) {
      const entite = await this.prisma.entite_structure.findUnique({
        where: { id_entite: currentId },
        select: { id_entite_parent: true },
      });

      if (!entite || !entite.id_entite_parent) {
        return false;
      }

      const parentId = String(entite.id_entite_parent);
      if (userEntiteIds.has(parentId)) {
        return true;
      }

      currentId = entite.id_entite_parent;
    }

    return false;
  }
}
