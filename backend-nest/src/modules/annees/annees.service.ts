import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CloneYearDto } from './dto/clone-year.dto';

@Injectable()
export class AnneesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(statut?: string) {
    const items = await this.prisma.annee_universitaire.findMany({
      where: statut ? { statut: statut as any } : undefined,
      orderBy: { id_annee: 'asc' },
    });

    return items.map((item) => ({
      id_annee: Number(item.id_annee),
      libelle: item.libelle,
      date_debut: item.date_debut.toISOString().slice(0, 10),
      date_fin: item.date_fin.toISOString().slice(0, 10),
      statut: item.statut,
      id_annee_source: item.id_annee_source ? Number(item.id_annee_source) : null,
    }));
  }

  async cloneYear(sourceId: string, payload: CloneYearDto) {
    let parsedId: bigint;
    try {
      parsedId = BigInt(sourceId);
    } catch {
      parsedId = BigInt(0);
    }

    const created = await this.prisma.annee_universitaire.create({
      data: {
        libelle: payload.libelle,
        date_debut: new Date(payload.date_debut),
        date_fin: new Date(payload.date_fin),
        statut: payload.statut as any,
        id_annee_source: parsedId > 0 ? parsedId : null,
      },
    });

    return {
      id_annee: Number(created.id_annee),
      libelle: created.libelle,
      date_debut: created.date_debut.toISOString().slice(0, 10),
      date_fin: created.date_fin.toISOString().slice(0, 10),
      statut: created.statut,
      id_annee_source: created.id_annee_source ? Number(created.id_annee_source) : null,
    };
  }
}
