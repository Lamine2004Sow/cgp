import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportResponsablesDto, type ImportResponsableRowDto } from './dto/import-responsables.dto';

export type ImportPreviewStatus =
  | 'new_user'
  | 'update_user'
  | 'duplicate_affectation'
  | 'error';

export type ImportPreviewChange = {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  major?: boolean;
};

export type ImportPreviewItem = {
  rowIndex: number;
  status: ImportPreviewStatus;
  login: string;
  nom: string;
  prenom: string;
  id_role: string;
  id_entite: number;
  id_annee: number;
  entiteNom?: string | null;
  roleLabel?: string | null;
  /** Modifications détectées sur la fiche utilisateur (nom, prénom, email, etc.) */
  changes?: ImportPreviewChange[];
  /** Message d'erreur si status === 'error' (entité/année invalide, etc.) */
  error?: string;
};

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async previewResponsables(payload: ImportResponsablesDto): Promise<{
    items: ImportPreviewItem[];
    summary: { total: number; newUser: number; updateUser: number; duplicateAffectation: number; error: number };
  }> {
    const roleMap = await this.getRoleLabelMap();
    const summary = { total: payload.rows.length, newUser: 0, updateUser: 0, duplicateAffectation: 0, error: 0 };
    const items: ImportPreviewItem[] = [];

    for (let i = 0; i < payload.rows.length; i += 1) {
      const row = payload.rows[i];
      const entite = await this.prisma.entite_structure.findUnique({
        where: {
          id_entite: BigInt(row.id_entite),
          id_annee: BigInt(row.id_annee),
        },
        select: { nom: true },
      });

      const anneeExists = await this.prisma.annee_universitaire.findUnique({
        where: { id_annee: BigInt(row.id_annee) },
        select: { id_annee: true },
      });
      const roleExists = roleMap.has(row.id_role);

      if (!entite || !anneeExists || !roleExists) {
        const msg = !entite
          ? `Entité ${row.id_entite} introuvable pour l'année ${row.id_annee}`
          : !anneeExists
            ? `Année ${row.id_annee} introuvable`
            : `Rôle "${row.id_role}" introuvable`;
        items.push({
          rowIndex: i,
          status: 'error',
          login: row.login,
          nom: row.nom,
          prenom: row.prenom,
          id_role: row.id_role,
          id_entite: row.id_entite,
          id_annee: row.id_annee,
          entiteNom: entite?.nom ?? null,
          roleLabel: roleMap.get(row.id_role) ?? null,
          error: msg,
        });
        summary.error += 1;
        continue;
      }

      const existingUser = await this.prisma.utilisateur.findUnique({
        where: { login: row.login },
        select: {
          id_user: true,
          nom: true,
          prenom: true,
          email_institutionnel: true,
          telephone: true,
          bureau: true,
        },
      });

      const existingAffectation = existingUser
        ? await this.prisma.affectation.findFirst({
            where: {
              id_user: existingUser.id_user,
              id_role: row.id_role,
              id_entite: BigInt(row.id_entite),
              id_annee: BigInt(row.id_annee),
            },
          })
        : null;

      if (existingAffectation) {
        items.push({
          rowIndex: i,
          status: 'duplicate_affectation',
          login: row.login,
          nom: row.nom,
          prenom: row.prenom,
          id_role: row.id_role,
          id_entite: row.id_entite,
          id_annee: row.id_annee,
          entiteNom: entite.nom,
          roleLabel: roleMap.get(row.id_role) ?? null,
        });
        summary.duplicateAffectation += 1;
        continue;
      }

      if (existingUser) {
        const changes = this.computeUserChanges(existingUser, row);
        items.push({
          rowIndex: i,
          status: 'update_user',
          login: row.login,
          nom: row.nom,
          prenom: row.prenom,
          id_role: row.id_role,
          id_entite: row.id_entite,
          id_annee: row.id_annee,
          entiteNom: entite.nom,
          roleLabel: roleMap.get(row.id_role) ?? null,
          changes: changes.length ? changes : undefined,
        });
        summary.updateUser += 1;
      } else {
        items.push({
          rowIndex: i,
          status: 'new_user',
          login: row.login,
          nom: row.nom,
          prenom: row.prenom,
          id_role: row.id_role,
          id_entite: row.id_entite,
          id_annee: row.id_annee,
          entiteNom: entite.nom,
          roleLabel: roleMap.get(row.id_role) ?? null,
        });
        summary.newUser += 1;
      }
    }

    return { items, summary };
  }

  private computeUserChanges(
    existing: { nom: string; prenom: string; email_institutionnel: string | null; telephone: string | null; bureau: string | null },
    row: ImportResponsableRowDto,
  ): ImportPreviewChange[] {
    const changes: ImportPreviewChange[] = [];
    const fields: Array<{ key: keyof typeof existing; label: string; major: boolean }> = [
      { key: 'nom', label: 'Nom', major: true },
      { key: 'prenom', label: 'Prénom', major: true },
      { key: 'email_institutionnel', label: 'Email', major: true },
      { key: 'telephone', label: 'Téléphone', major: false },
      { key: 'bureau', label: 'Bureau', major: false },
    ];
    const rowData = {
      nom: row.nom,
      prenom: row.prenom,
      email_institutionnel: row.email_institutionnel ?? null,
      telephone: row.telephone ?? null,
      bureau: row.bureau ?? null,
    };
    for (const { key, label, major } of fields) {
      const oldVal = existing[key] ?? null;
      const newVal = rowData[key] ?? null;
      const o = oldVal != null ? String(oldVal) : '';
      const n = newVal != null ? String(newVal) : '';
      if (o !== n) {
        changes.push({ field: label, oldValue: oldVal, newValue: newVal, major });
      }
    }
    return changes;
  }

  private async getRoleLabelMap(): Promise<Map<string, string>> {
    const roles = await this.prisma.role.findMany({
      select: { id_role: true, libelle: true },
    });
    return new Map(roles.map((r) => [r.id_role, r.libelle]));
  }

  async importResponsables(payload: ImportResponsablesDto, excludeIndices?: number[]) {
    const set = new Set(excludeIndices ?? []);
    const rows = payload.rows.filter((_, i) => !set.has(i));
    if (rows.length === 0) {
      return {
        imported_rows: 0,
        created_users: 0,
        created_affectations: 0,
      };
    }

    let createdUsers = 0;
    let createdAffectations = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const userResult = await this.upsertUser(tx, row);
        if (userResult.created) {
          createdUsers += 1;
        }

        const exists = await tx.affectation.findFirst({
          where: {
            id_user: userResult.id,
            id_role: row.id_role,
            id_entite: BigInt(row.id_entite),
            id_annee: BigInt(row.id_annee),
          },
        });

        if (!exists) {
          await tx.affectation.create({
            data: {
              id_user: userResult.id,
              id_role: row.id_role,
              id_entite: BigInt(row.id_entite),
              id_annee: BigInt(row.id_annee),
              date_debut: new Date(row.date_debut),
              date_fin: row.date_fin ? new Date(row.date_fin) : null,
            },
          });
          createdAffectations += 1;
        }
      }
    });

    return {
      imported_rows: rows.length,
      created_users: createdUsers,
      created_affectations: createdAffectations,
    };
  }

  private async upsertUser(
    tx: Prisma.TransactionClient,
    row: ImportResponsableRowDto,
  ): Promise<{ id: bigint; created: boolean }> {
    const existing = await tx.utilisateur.findUnique({
      where: { login: row.login },
      select: { id_user: true },
    });
    if (existing) {
      await tx.utilisateur.update({
        where: { id_user: existing.id_user },
        data: {
          nom: row.nom,
          prenom: row.prenom,
          email_institutionnel: row.email_institutionnel ?? null,
          telephone: row.telephone ?? null,
          bureau: row.bureau ?? null,
        },
      });
      return { id: existing.id_user, created: false };
    }

    const created = await tx.utilisateur.create({
      data: {
        login: row.login,
        nom: row.nom,
        prenom: row.prenom,
        email_institutionnel: row.email_institutionnel ?? null,
        telephone: row.telephone ?? null,
        bureau: row.bureau ?? null,
      },
      select: { id_user: true },
    });
    return { id: created.id_user, created: true };
  }
}
