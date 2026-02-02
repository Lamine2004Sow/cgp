import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAffectationDto } from './dto/create-affectation.dto';

@Injectable()
export class AffectationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateAffectationDto) {
    const created = await this.prisma.affectation.create({
      data: {
        id_user: BigInt(payload.id_user),
        id_role: payload.id_role,
        id_entite: BigInt(payload.id_entite),
        id_annee: BigInt(payload.id_annee),
        date_debut: new Date(payload.date_debut),
        date_fin: payload.date_fin ? new Date(payload.date_fin) : null,
      },
    });

    return {
      id_affectation: Number(created.id_affectation),
      id_user: Number(created.id_user),
      id_role: created.id_role,
      id_entite: Number(created.id_entite),
      id_annee: Number(created.id_annee),
      date_debut: created.date_debut.toISOString().slice(0, 10),
      date_fin: created.date_fin ? created.date_fin.toISOString().slice(0, 10) : null,
    };
  }
}
