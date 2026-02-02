import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class EntitesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(yearId?: number) {
    const items = await this.prisma.entite_structure.findMany({
      where: yearId ? { id_annee: BigInt(yearId) } : undefined,
      orderBy: { id_entite: 'asc' },
    });

    return items.map((item) => ({
      id_entite: Number(item.id_entite),
      id_annee: Number(item.id_annee),
      id_entite_parent: item.id_entite_parent ? Number(item.id_entite_parent) : null,
      type_entite: item.type_entite,
      nom: item.nom,
      tel_service: item.tel_service,
      bureau_service: item.bureau_service,
    }));
  }
}
