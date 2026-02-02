import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

interface AuditLogInput {
  userId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  oldValue?: string;
  newValue?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    if (!input.userId || !input.action || !input.targetType) {
      return;
    }

    await this.prisma.journal_audit.create({
      data: {
        id_user_auteur: BigInt(input.userId),
        type_action: input.action,
        cible_type: input.targetType,
        cible_id: input.targetId ?? null,
        ancienne_valeur: input.oldValue ?? null,
        nouvelle_valeur: input.newValue ?? null,
      },
    });
  }
}
