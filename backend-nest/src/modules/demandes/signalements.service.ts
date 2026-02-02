import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { UpdateSignalementDto } from './dto/update-signalement.dto';

@Injectable()
export class SignalementsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(statut?: string) {
    const items = await this.prisma.signalement.findMany({
      where: statut ? { statut: statut as any } : undefined,
      orderBy: { date_creation: 'desc' },
      include: {
        utilisateur_signalement_auteur_idToutilisateur: true,
        utilisateur_signalement_traitant_idToutilisateur: true,
        utilisateur_signalement_cloture_par_idToutilisateur: true,
      },
    });

    return items.map((item) => ({
      id_signalement: Number(item.id_signalement),
      auteur_id: Number(item.auteur_id),
      traitant_id: item.traitant_id ? Number(item.traitant_id) : null,
      cloture_par_id: item.cloture_par_id ? Number(item.cloture_par_id) : null,
      id_entite_cible: item.id_entite_cible ? Number(item.id_entite_cible) : null,
      description: item.description,
      statut: item.statut,
      date_creation: item.date_creation.toISOString(),
      date_prise_en_charge: item.date_prise_en_charge?.toISOString() ?? null,
      date_traitement: item.date_traitement?.toISOString() ?? null,
      commentaire_prise_en_charge: item.commentaire_prise_en_charge ?? null,
      commentaire_cloture: item.commentaire_cloture ?? null,
      auteur_nom: item.utilisateur_signalement_auteur_idToutilisateur?.nom ?? null,
      auteur_prenom: item.utilisateur_signalement_auteur_idToutilisateur?.prenom ?? null,
      traitant_nom: item.utilisateur_signalement_traitant_idToutilisateur?.nom ?? null,
      traitant_prenom: item.utilisateur_signalement_traitant_idToutilisateur?.prenom ?? null,
      cloture_nom: item.utilisateur_signalement_cloture_par_idToutilisateur?.nom ?? null,
      cloture_prenom: item.utilisateur_signalement_cloture_par_idToutilisateur?.prenom ?? null,
    }));
  }

  async create(userId: string, payload: CreateSignalementDto) {
    const created = await this.prisma.signalement.create({
      data: {
        auteur_id: BigInt(userId),
        id_entite_cible: payload.id_entite_cible ? BigInt(payload.id_entite_cible) : null,
        description: payload.description,
        statut: 'OUVERT',
      },
    });

    return this.mapSignalement(created);
  }

  async update(id: string, userId: string, payload: UpdateSignalementDto) {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('Signalement not found');
    }

    const data: Record<string, any> = {};

    if (payload.statut) {
      data.statut = payload.statut;
    }

    if (payload.statut === 'EN_COURS') {
      data.traitant_id = BigInt(userId);
      data.date_prise_en_charge = new Date();
      data.commentaire_prise_en_charge = payload.commentaire ?? null;
    }

    if (payload.statut === 'CLOTURE') {
      data.cloture_par_id = BigInt(userId);
      data.date_traitement = new Date();
      data.commentaire_cloture = payload.commentaire ?? null;
    }

    const updated = await this.prisma.signalement.update({
      where: { id_signalement: parsedId },
      data,
    });

    return this.mapSignalement(updated);
  }

  private mapSignalement(item: {
    id_signalement: bigint;
    auteur_id: bigint;
    traitant_id: bigint | null;
    cloture_par_id: bigint | null;
    id_entite_cible: bigint | null;
    description: string;
    statut: string;
    date_creation: Date;
    date_prise_en_charge: Date | null;
    date_traitement: Date | null;
    commentaire_prise_en_charge: string | null;
    commentaire_cloture: string | null;
  }) {
    return {
      id_signalement: Number(item.id_signalement),
      auteur_id: Number(item.auteur_id),
      traitant_id: item.traitant_id ? Number(item.traitant_id) : null,
      cloture_par_id: item.cloture_par_id ? Number(item.cloture_par_id) : null,
      id_entite_cible: item.id_entite_cible ? Number(item.id_entite_cible) : null,
      description: item.description,
      statut: item.statut,
      date_creation: item.date_creation.toISOString(),
      date_prise_en_charge: item.date_prise_en_charge?.toISOString() ?? null,
      date_traitement: item.date_traitement?.toISOString() ?? null,
      commentaire_prise_en_charge: item.commentaire_prise_en_charge ?? null,
      commentaire_cloture: item.commentaire_cloture ?? null,
    };
  }
}
