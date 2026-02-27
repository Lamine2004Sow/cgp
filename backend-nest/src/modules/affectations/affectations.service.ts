import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAffectationDto } from './dto/create-affectation.dto';
import { UpdateAffectationDto } from './dto/update-affectation.dto';

const toAffectationResponse = (a: {
  id_affectation: bigint;
  id_user: bigint;
  id_role: string;
  id_entite: bigint;
  id_annee: bigint;
  date_debut: Date;
  date_fin: Date | null;
}) => ({
  id_affectation: Number(a.id_affectation),
  id_user: Number(a.id_user),
  id_role: a.id_role,
  id_entite: Number(a.id_entite),
  id_annee: Number(a.id_annee),
  date_debut: a.date_debut.toISOString().slice(0, 10),
  date_fin: a.date_fin ? a.date_fin.toISOString().slice(0, 10) : null,
});

@Injectable()
export class AffectationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateAffectationDto) {
    if (payload.date_fin) {
      const debut = new Date(payload.date_debut);
      const fin = new Date(payload.date_fin);
      if (fin < debut) {
        throw new BadRequestException('date_fin doit être postérieure ou égale à date_debut');
      }
    }

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

    return toAffectationResponse(created);
  }

  async findOne(id: string) {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('Affectation introuvable');
    }

    const affectation = await this.prisma.affectation.findUnique({
      where: { id_affectation: parsedId },
    });

    if (!affectation) {
      throw new NotFoundException('Affectation introuvable');
    }

    return toAffectationResponse(affectation);
  }

  async update(id: string, payload: UpdateAffectationDto) {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('Affectation introuvable');
    }

    const existing = await this.prisma.affectation.findUnique({
      where: { id_affectation: parsedId },
    });

    if (!existing) {
      throw new NotFoundException('Affectation introuvable');
    }

    if (payload.date_fin !== undefined && payload.date_fin !== null) {
      const debut = existing.date_debut;
      const fin = new Date(payload.date_fin);
      if (fin < debut) {
        throw new BadRequestException('date_fin doit être postérieure ou égale à date_debut');
      }
    }

    const updated = await this.prisma.affectation.update({
      where: { id_affectation: parsedId },
      data: {
        ...(payload.id_role !== undefined ? { id_role: payload.id_role } : {}),
        ...(payload.date_fin !== undefined
          ? { date_fin: payload.date_fin ? new Date(payload.date_fin) : null }
          : {}),
      },
    });

    return toAffectationResponse(updated);
  }

  async remove(id: string) {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('Affectation introuvable');
    }

    const existing = await this.prisma.affectation.findUnique({
      where: { id_affectation: parsedId },
    });

    if (!existing) {
      throw new NotFoundException('Affectation introuvable');
    }

    await this.prisma.affectation.delete({ where: { id_affectation: parsedId } });
  }
}
