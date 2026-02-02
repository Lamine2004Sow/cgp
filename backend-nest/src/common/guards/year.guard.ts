import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../types/current-user';

@Injectable()
export class YearGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUser | undefined;

    if (!user) {
      return false;
    }

    const anneeId =
      request.params?.anneeId ??
      request.params?.id_annee ??
      request.query?.anneeId ??
      request.query?.annee;

    if (!anneeId) {
      return true;
    }

    return user.affectations.some(
      (affectation) => affectation.anneeId === String(anneeId),
    );
  }
}
