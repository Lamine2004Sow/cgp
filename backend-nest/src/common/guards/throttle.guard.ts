import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

interface HitRecord {
  count: number;
  resetAt: number;
}

/**
 * Rate limiter maison (sans @nestjs/throttler).
 * Par défaut : 60 requêtes par fenêtre de 60 secondes par IP.
 * Les endpoints d'import sont limités à 10 req/min.
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly store = new Map<string, HitRecord>();
  private readonly DEFAULT_LIMIT = 60;
  private readonly DEFAULT_TTL_MS = 60_000;
  private readonly STRICT_LIMIT = 10;
  private readonly STRICT_PATHS = ['/api/imports'];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = (request.ip || request.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
    const path = request.path || '';

    const isStrict = this.STRICT_PATHS.some((p) => path.startsWith(p));
    const limit = isStrict ? this.STRICT_LIMIT : this.DEFAULT_LIMIT;
    const ttl = this.DEFAULT_TTL_MS;

    const key = `${ip}:${isStrict ? 'strict' : 'default'}`;
    const now = Date.now();

    let record = this.store.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + ttl };
      this.store.set(key, record);
      this.cleanup(now);
      return true;
    }

    record.count += 1;
    if (record.count > limit) {
      throw new HttpException(
        { message: 'Trop de requêtes, veuillez réessayer dans quelques instants.', statusCode: 429 },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private cleanup(now: number): void {
    // Nettoyage périodique toutes les 1000 entrées pour éviter les fuites mémoire
    if (this.store.size > 1000) {
      for (const [key, record] of this.store.entries()) {
        if (now > record.resetAt) {
          this.store.delete(key);
        }
      }
    }
  }
}
