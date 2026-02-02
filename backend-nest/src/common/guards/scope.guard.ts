import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../types/current-user';

@Injectable()
export class ScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUser | undefined;

    if (!user) {
      return false;
    }

    const entiteId =
      request.params?.entiteId ??
      request.params?.id_entite ??
      request.query?.entiteId ??
      request.query?.id_entite;

    if (!entiteId) {
      return true;
    }

    return user.affectations.some(
      (affectation) => affectation.entiteId === String(entiteId),
    );
  }
}
