import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  utilisateur_categorie,
  utilisateur_genre,
  utilisateur_statut,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CurrentUser } from '../../common/types/current-user';
import { ROLE_IDS } from '../../auth/roles.constants';
import {
  STANDARD_WORKBOOK_COLUMNS,
  STANDARD_WORKBOOK_VERSION,
  type StandardWorkbookPayload,
  type StandardWorkbookRow,
  type StandardWorkbookSheetName,
} from '../exports/standard-workbook.service';
import {
  ImportResponsablesDto,
  type ImportResponsableRowDto,
} from './dto/import-responsables.dto';

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
  changes?: ImportPreviewChange[];
  error?: string;
};

export type WorkbookPreviewStatus =
  | 'create'
  | 'update'
  | 'reuse'
  | 'skip'
  | 'warning'
  | 'error';

export type WorkbookPreviewItem = {
  sheet: StandardWorkbookSheetName | 'meta';
  sourceKey: string;
  label: string;
  status: WorkbookPreviewStatus;
  detail: string;
};

export type WorkbookPreviewSummary = {
  total: number;
  create: number;
  update: number;
  reuse: number;
  skip: number;
  warning: number;
  error: number;
  targetYearId: number | null;
  targetYearLabel: string | null;
  targetYearWillBeCreated: boolean;
};

type WorkbookImportPayload = {
  workbook: unknown;
  targetYearId?: number;
  createTargetYear?: boolean;
  scopeSourceEntiteId?: number;
};

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async previewResponsables(payload: ImportResponsablesDto): Promise<{
    items: ImportPreviewItem[];
    summary: {
      total: number;
      newUser: number;
      updateUser: number;
      duplicateAffectation: number;
      error: number;
    };
  }> {
    const roleMap = await this.getRoleLabelMap();
    const summary = {
      total: payload.rows.length,
      newUser: 0,
      updateUser: 0,
      duplicateAffectation: 0,
      error: 0,
    };
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

  async importResponsables(
    payload: ImportResponsablesDto,
    excludeIndices?: number[],
  ) {
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

  async previewWorkbook(user: CurrentUser, payload: WorkbookImportPayload) {
    return this.prisma.$transaction((tx) =>
      this.processWorkbookImport(tx, user, payload, false),
    );
  }

  async importWorkbook(user: CurrentUser, payload: WorkbookImportPayload) {
    return this.prisma.$transaction((tx) =>
      this.processWorkbookImport(tx, user, payload, true),
    );
  }

  private async processWorkbookImport(
    tx: Prisma.TransactionClient,
    user: CurrentUser,
    payload: WorkbookImportPayload,
    apply: boolean,
  ) {
    const workbook = this.filterWorkbookByScope(
      this.normalizeWorkbookPayload(payload.workbook),
      payload.scopeSourceEntiteId,
    );

    const createTargetYear = Boolean(payload.createTargetYear);
    const targetYearMeta = workbook.meta.source_year_label?.trim() || null;

    if (!payload.targetYearId && !createTargetYear) {
      throw new BadRequestException(
        "Sélectionnez une année cible ou demandez la création d'une année depuis le classeur",
      );
    }

    if (createTargetYear && !this.isServicesCentraux(user)) {
      throw new ForbiddenException(
        "La création d'une année depuis un classeur est réservée aux Services centraux",
      );
    }

    let targetYearId = payload.targetYearId ?? null;
    let targetYearLabel: string | null = null;
    let targetYearWillBeCreated = false;

    if (createTargetYear) {
      const yearLabel =
        targetYearMeta ||
        `Import ${new Date().toISOString().slice(0, 10)}`;
      const existingYear = await tx.annee_universitaire.findFirst({
        where: { libelle: yearLabel },
        select: { id_annee: true },
      });
      if (existingYear) {
        throw new BadRequestException(
          `Une année "${yearLabel}" existe déjà. Choisissez-la comme cible ou modifiez le fichier.`,
        );
      }

      targetYearLabel = yearLabel;
      targetYearWillBeCreated = true;
      if (apply) {
        const createdYear = await tx.annee_universitaire.create({
          data: {
            libelle: yearLabel,
            date_debut: this.parseDate(
              workbook.meta.source_year_start,
              new Date(`${new Date().getFullYear()}-09-01`),
            ),
            date_fin: this.parseDate(
              workbook.meta.source_year_end,
              new Date(`${new Date().getFullYear() + 1}-08-31`),
            ),
            statut: 'PREPARATION',
          },
        });
        targetYearId = Number(createdYear.id_annee);
        targetYearLabel = createdYear.libelle;
      }
    } else if (targetYearId) {
      const existingYear = await tx.annee_universitaire.findUnique({
        where: { id_annee: BigInt(targetYearId) },
      });
      if (!existingYear) {
        throw new NotFoundException("Année cible introuvable");
      }
      targetYearLabel = existingYear.libelle;
    }

    const previewItems: WorkbookPreviewItem[] = [];
    const summary: WorkbookPreviewSummary = {
      total: 0,
      create: 0,
      update: 0,
      reuse: 0,
      skip: 0,
      warning: 0,
      error: 0,
      targetYearId,
      targetYearLabel,
      targetYearWillBeCreated,
    };

    const pushItem = (
      item: WorkbookPreviewItem,
    ) => {
      previewItems.push(item);
      summary.total += 1;
      summary[item.status] += 1;
    };

    if (!targetYearId && !apply) {
      pushItem({
        sheet: 'meta',
        sourceKey: 'target_year',
        label: targetYearLabel ?? 'Nouvelle année',
        status: 'create',
        detail: "Une nouvelle année sera créée à partir des métadonnées du classeur lors de l'import.",
      });
    }

    const structureRows = this.sortStructureRows(workbook.sheets.structures);
    const existingTargetStructures = targetYearId
      ? await tx.entite_structure.findMany({
          where: { id_annee: BigInt(targetYearId) },
          include: {
            composante: true,
            departement: true,
            mention: { include: { diplome: true } },
            parcours: true,
            niveau: true,
          },
        })
      : [];

    const structuresByParentKey = new Map<string, (typeof existingTargetStructures)[number][]>();
    const structuresByTypeAndName = new Map<string, (typeof existingTargetStructures)[number][]>();

    existingTargetStructures.forEach((structure) => {
      const parentKey = this.buildStructureMatchKey(
        structure.type_entite,
        structure.nom,
        structure.id_entite_parent ? Number(structure.id_entite_parent) : null,
      );
      const parentList = structuresByParentKey.get(parentKey) ?? [];
      parentList.push(structure);
      structuresByParentKey.set(parentKey, parentList);

      const globalKey = this.buildStructureGlobalKey(
        structure.type_entite,
        structure.nom,
      );
      const globalList = structuresByTypeAndName.get(globalKey) ?? [];
      globalList.push(structure);
      structuresByTypeAndName.set(globalKey, globalList);
    });

    const sourceToTargetEntiteId = new Map<string, bigint>();
    const affectedTargetEntiteIds = new Set<bigint>();

    for (const row of structureRows) {
      const sourceId = row.source_id_entite?.trim();
      if (!sourceId) {
        pushItem({
          sheet: 'structures',
          sourceKey: '',
          label: row.nom || 'Structure sans identifiant',
          status: 'error',
          detail: "L'identifiant source de la structure est manquant.",
        });
        continue;
      }

      const parentSourceId = row.source_parent_id_entite?.trim() || null;
      const mappedParentId = parentSourceId
        ? sourceToTargetEntiteId.get(parentSourceId) ?? null
        : null;

      const existing = this.findExistingStructure(
        row,
        mappedParentId ? Number(mappedParentId) : null,
        structuresByParentKey,
        structuresByTypeAndName,
      );

      if (existing) {
        sourceToTargetEntiteId.set(sourceId, existing.id_entite);
        affectedTargetEntiteIds.add(existing.id_entite);
        const structureChanges = this.collectStructureChanges(existing, row);

        if (apply && structureChanges.baseData) {
          await tx.entite_structure.update({
            where: { id_entite: existing.id_entite },
            data: structureChanges.baseData,
          });
          await this.applyStructureSubtype(tx, existing.id_entite, row);
        }

        pushItem({
          sheet: 'structures',
          sourceKey: sourceId,
          label: row.nom || sourceId,
          status: structureChanges.hasChanges ? 'update' : 'reuse',
          detail: structureChanges.hasChanges
            ? 'Structure existante mise à jour par fusion.'
            : 'Structure existante réutilisée.',
        });
        continue;
      }

      if (!targetYearId) {
        pushItem({
          sheet: 'structures',
          sourceKey: sourceId,
          label: row.nom || sourceId,
          status: 'create',
          detail: 'La structure sera créée dans la nouvelle année.',
        });
        continue;
      }

      let createdId = BigInt(0);
      if (apply) {
        const created = await tx.entite_structure.create({
          data: {
            id_annee: BigInt(targetYearId),
            id_entite_parent: mappedParentId,
            type_entite: row.type_entite as never,
            nom: row.nom || `Structure ${sourceId}`,
            tel_service: this.emptyToNull(row.tel_service),
            bureau_service: this.emptyToNull(row.bureau_service),
          },
        });
        createdId = created.id_entite;
        await this.applyStructureSubtype(tx, created.id_entite, row);
        affectedTargetEntiteIds.add(created.id_entite);

        const parentKey = this.buildStructureMatchKey(
          row.type_entite,
          row.nom,
          mappedParentId ? Number(mappedParentId) : null,
        );
        const createdRecord = await tx.entite_structure.findUniqueOrThrow({
          where: { id_entite: created.id_entite },
          include: {
            composante: true,
            departement: true,
            mention: { include: { diplome: true } },
            parcours: true,
            niveau: true,
          },
        });
        const parentList = structuresByParentKey.get(parentKey) ?? [];
        parentList.push(createdRecord);
        structuresByParentKey.set(parentKey, parentList);

        const globalKey = this.buildStructureGlobalKey(row.type_entite, row.nom);
        const globalList = structuresByTypeAndName.get(globalKey) ?? [];
        globalList.push(createdRecord);
        structuresByTypeAndName.set(globalKey, globalList);
      }

      sourceToTargetEntiteId.set(sourceId, createdId);
      pushItem({
        sheet: 'structures',
        sourceKey: sourceId,
        label: row.nom || sourceId,
        status: 'create',
        detail: 'Nouvelle structure à créer.',
      });
    }

    const roleRows = workbook.sheets.roles.filter((row) => row.id_role?.trim());
    const roleIds = roleRows.map((row) => row.id_role.trim());
    const existingRoles = roleIds.length
      ? await tx.role.findMany({ where: { id_role: { in: roleIds } } })
      : [];
    const roleById = new Map(existingRoles.map((role) => [role.id_role, role]));

    for (const row of roleRows) {
      const roleId = row.id_role.trim();
      const existing = roleById.get(roleId);
      if (existing) {
        const newLabel = this.emptyToNull(row.libelle);
        const metadataChanged =
          (newLabel && newLabel !== existing.libelle) ||
          this.toBoolean(row.is_global, existing.is_global) !== existing.is_global ||
          this.toBoolean(row.est_administratif, existing.est_administratif) !==
            existing.est_administratif ||
          this.toBoolean(row.est_transverse, existing.est_transverse) !==
            existing.est_transverse ||
          this.toNumber(row.niveau_hierarchique, existing.niveau_hierarchique) !==
            existing.niveau_hierarchique;

        if (apply && metadataChanged) {
          await tx.role.update({
            where: { id_role: roleId },
            data: {
              libelle: row.libelle || existing.libelle,
              description: this.emptyToNull(row.description) ?? existing.description,
              niveau_hierarchique: this.toNumber(
                row.niveau_hierarchique,
                existing.niveau_hierarchique,
              ),
              is_global: this.toBoolean(row.is_global, existing.is_global),
              est_administratif: this.toBoolean(
                row.est_administratif,
                existing.est_administratif,
              ),
              est_transverse: this.toBoolean(
                row.est_transverse,
                existing.est_transverse,
              ),
            },
          });
        }

        pushItem({
          sheet: 'roles',
          sourceKey: roleId,
          label: row.libelle || roleId,
          status: metadataChanged ? 'update' : 'reuse',
          detail: metadataChanged
            ? 'Rôle existant harmonisé avec le classeur.'
            : 'Rôle existant réutilisé.',
        });
      } else {
        const mappedComposanteId =
          row.source_id_composante && sourceToTargetEntiteId.has(row.source_id_composante)
            ? sourceToTargetEntiteId.get(row.source_id_composante) ?? null
            : null;

        if (apply) {
          const created = await tx.role.create({
            data: {
              id_role: roleId,
              libelle: row.libelle || roleId,
              description: this.emptyToNull(row.description),
              niveau_hierarchique: this.toNumber(row.niveau_hierarchique, 0),
              is_global: this.toBoolean(row.is_global, true),
              est_administratif: this.toBoolean(row.est_administratif, false),
              est_transverse: this.toBoolean(row.est_transverse, false),
              id_composante: mappedComposanteId,
            },
          });
          roleById.set(roleId, created);
        }

        pushItem({
          sheet: 'roles',
          sourceKey: roleId,
          label: row.libelle || roleId,
          status: 'create',
          detail: 'Nouveau rôle à créer.',
        });
      }
    }

    const userRows = workbook.sheets.users.filter((row) => row.login?.trim());
    const userLogins = userRows.map((row) => row.login.trim());
    const existingUsers = userLogins.length
      ? await tx.utilisateur.findMany({
          where: { login: { in: userLogins } },
        })
      : [];
    const userByLogin = new Map(existingUsers.map((u) => [u.login, u]));

    for (const row of userRows) {
      const login = row.login.trim();
      const existing = userByLogin.get(login);
      if (existing) {
        const userChanges = this.collectWorkbookUserChanges(existing, row);
        if (apply) {
          await tx.utilisateur.update({
            where: { id_user: existing.id_user },
            data: userChanges.data,
          });
        }

        const updated = {
          ...existing,
          ...userChanges.preview,
        };
        userByLogin.set(login, updated as typeof existing);

        pushItem({
          sheet: 'users',
          sourceKey: login,
          label: `${row.prenom || existing.prenom} ${row.nom || existing.nom}`.trim(),
          status: userChanges.hasChanges ? 'update' : 'reuse',
          detail: userChanges.hasChanges
            ? "Profil utilisateur fusionné avec les valeurs du classeur."
            : 'Utilisateur existant réutilisé.',
        });
      } else {
        if (apply) {
          const created = await tx.utilisateur.create({
            data: {
              login,
              uid_cas: this.emptyToNull(row.uid_cas),
              nom: row.nom || login,
              prenom: row.prenom || '',
              genre: this.toUtilisateurGenre(row.genre),
              categorie: this.toUtilisateurCategorie(row.categorie),
              email_institutionnel: this.emptyToNull(row.email_institutionnel),
              email_institutionnel_secondaire: this.emptyToNull(
                row.email_institutionnel_secondaire,
              ),
              telephone: this.emptyToNull(row.telephone),
              bureau: this.emptyToNull(row.bureau),
              statut: this.toUtilisateurStatut(row.statut, utilisateur_statut.ACTIF),
            },
          });
          userByLogin.set(login, created);
        }

        pushItem({
          sheet: 'users',
          sourceKey: login,
          label: `${row.prenom} ${row.nom}`.trim() || login,
          status: 'create',
          detail: 'Nouvel utilisateur à créer.',
        });
      }
    }

    const existingAffectations = targetYearId
      ? await tx.affectation.findMany({
          where: { id_annee: BigInt(targetYearId) },
          include: { utilisateur: true },
        })
      : [];
    const affectationKeyToRow = new Map(
      existingAffectations.map((affectation) => [
        this.buildAffectationKey(
          affectation.utilisateur.login,
          affectation.id_role,
          Number(affectation.id_entite),
          Number(affectation.id_annee),
        ),
        affectation,
      ]),
    );
    const sourceAffectationToTargetId = new Map<string, bigint>();

    for (const row of workbook.sheets.affectations) {
      const sourceAffectationId = row.source_id_affectation?.trim();
      const login = row.user_login?.trim();
      const roleId = row.id_role?.trim();
      const sourceEntiteId = row.source_id_entite?.trim();

      if (!sourceAffectationId || !login || !roleId || !sourceEntiteId) {
        pushItem({
          sheet: 'affectations',
          sourceKey: sourceAffectationId || '',
          label: login || 'Affectation incomplète',
          status: 'error',
          detail: 'Une affectation ne contient pas toutes les colonnes obligatoires.',
        });
        continue;
      }

      const userRecord = userByLogin.get(login);
      const targetEntiteId = sourceToTargetEntiteId.get(sourceEntiteId);

      if (!userRecord || !targetEntiteId || !targetYearId) {
        pushItem({
          sheet: 'affectations',
          sourceKey: sourceAffectationId,
          label: `${login} / ${roleId}`,
          status: 'error',
          detail:
            "Impossible de relier l'affectation à son utilisateur, sa structure ou son année cible.",
        });
        continue;
      }

      const key = this.buildAffectationKey(
        login,
        roleId,
        Number(targetEntiteId),
        targetYearId,
      );
      const existing = affectationKeyToRow.get(key);
      if (existing) {
        sourceAffectationToTargetId.set(sourceAffectationId, existing.id_affectation);
        pushItem({
          sheet: 'affectations',
          sourceKey: sourceAffectationId,
          label: `${login} / ${roleId}`,
          status: 'skip',
          detail: 'Affectation déjà présente dans la cible, elle sera ignorée.',
        });
        continue;
      }

      let createdAffectationId = BigInt(0);
      if (apply) {
        const created = await tx.affectation.create({
          data: {
            id_user: userRecord.id_user,
            id_role: roleId,
            id_entite: targetEntiteId,
            id_annee: BigInt(targetYearId),
            date_debut: this.parseDate(row.date_debut, new Date()),
            date_fin: row.date_fin ? this.parseNullableDate(row.date_fin) : null,
          },
          include: { utilisateur: true },
        });
        createdAffectationId = created.id_affectation;
        affectationKeyToRow.set(key, created);
      }

      sourceAffectationToTargetId.set(sourceAffectationId, createdAffectationId);
      pushItem({
        sheet: 'affectations',
        sourceKey: sourceAffectationId,
        label: `${login} / ${roleId}`,
        status: 'create',
        detail: 'Nouvelle affectation à créer.',
      });
    }

    if (apply) {
      for (const row of workbook.sheets.affectations) {
        const sourceAffectationId = row.source_id_affectation?.trim();
        const sourceSupervisorId = row.source_id_affectation_n_plus_1?.trim();
        if (!sourceAffectationId || !sourceSupervisorId) {
          continue;
        }
        const targetAffectationId = sourceAffectationToTargetId.get(sourceAffectationId);
        const targetSupervisorId = sourceAffectationToTargetId.get(sourceSupervisorId);
        if (!targetAffectationId || !targetSupervisorId) {
          pushItem({
            sheet: 'affectations',
            sourceKey: sourceAffectationId,
            label: sourceAffectationId,
            status: 'warning',
            detail:
              "Le lien hiérarchique N+1 n'a pas pu être rétabli car le supérieur n'est pas présent dans le périmètre importé.",
          });
          continue;
        }
        await tx.affectation.update({
          where: { id_affectation: targetAffectationId },
          data: { id_affectation_n_plus_1: targetSupervisorId },
        });
      }
    }

    const targetAffectationIds = Array.from(sourceAffectationToTargetId.values()).filter(
      (value) => value > 0,
    );
    const existingContacts = targetAffectationIds.length
      ? await tx.contact_role.findMany({
          where: { id_affectation: { in: targetAffectationIds } },
        })
      : [];
    const contactByAffectation = new Map<string, (typeof existingContacts)[0][]>();
    existingContacts.forEach((contact) => {
      const key = String(contact.id_affectation);
      const list = contactByAffectation.get(key) ?? [];
      list.push(contact);
      contactByAffectation.set(key, list);
    });

    for (const row of workbook.sheets.contacts) {
      const sourceAffectationId = row.source_id_affectation?.trim();
      if (!sourceAffectationId) {
        continue;
      }
      const targetAffectationId = sourceAffectationToTargetId.get(sourceAffectationId);
      if (!targetAffectationId || targetAffectationId <= 0) {
        pushItem({
          sheet: 'contacts',
          sourceKey: row.source_id_contact_role || sourceAffectationId,
          label: sourceAffectationId,
          status: 'warning',
          detail: "Le contact fonctionnel n'a pas pu être rattaché à une affectation cible.",
        });
        continue;
      }

      const existing = (contactByAffectation.get(String(targetAffectationId)) ?? [])[0];
      if (existing) {
        const changed =
          this.emptyToNull(row.email_fonctionnelle) !== existing.email_fonctionnelle ||
          this.emptyToNull(row.type_email) !== existing.type_email ||
          this.emptyToNull(row.telephone) !== existing.telephone ||
          this.emptyToNull(row.bureau) !== existing.bureau;
        if (apply && changed) {
          await tx.contact_role.update({
            where: { id_contact_role: existing.id_contact_role },
            data: {
              email_fonctionnelle: this.emptyToNull(row.email_fonctionnelle),
              type_email: this.emptyToNull(row.type_email),
              telephone: this.emptyToNull(row.telephone),
              bureau: this.emptyToNull(row.bureau),
            },
          });
        }
        pushItem({
          sheet: 'contacts',
          sourceKey: row.source_id_contact_role || sourceAffectationId,
          label: row.email_fonctionnelle || `Contact ${sourceAffectationId}`,
          status: changed ? 'update' : 'reuse',
          detail: changed
            ? 'Contact fonctionnel existant mis à jour.'
            : 'Contact fonctionnel existant réutilisé.',
        });
      } else {
        if (apply) {
          await tx.contact_role.create({
            data: {
              id_affectation: targetAffectationId,
              email_fonctionnelle: this.emptyToNull(row.email_fonctionnelle),
              type_email: this.emptyToNull(row.type_email),
              telephone: this.emptyToNull(row.telephone),
              bureau: this.emptyToNull(row.bureau),
            },
          });
        }
        pushItem({
          sheet: 'contacts',
          sourceKey: row.source_id_contact_role || sourceAffectationId,
          label: row.email_fonctionnelle || `Contact ${sourceAffectationId}`,
          status: 'create',
          detail: 'Nouveau contact fonctionnel à créer.',
        });
      }
    }

    const importedTargetEntiteIds = Array.from(affectedTargetEntiteIds);
    const existingDelegations = importedTargetEntiteIds.length
      ? await tx.delegation.findMany({
          where: { id_entite: { in: importedTargetEntiteIds } },
          include: {
            utilisateur_delegation_delegant_idToutilisateur: true,
            utilisateur_delegation_delegataire_idToutilisateur: true,
          },
        })
      : [];
    const delegationKeyMap = new Set(
      existingDelegations.map((delegation) =>
        this.buildDelegationKey(
          delegation.utilisateur_delegation_delegant_idToutilisateur?.login ?? '',
          delegation.utilisateur_delegation_delegataire_idToutilisateur?.login ?? '',
          delegation.id_role ?? '',
          Number(delegation.id_entite),
          delegation.date_debut.toISOString().slice(0, 10),
          delegation.date_fin?.toISOString().slice(0, 10) ?? '',
        ),
      ),
    );

    for (const row of workbook.sheets.delegations) {
      const targetEntiteId = row.source_id_entite
        ? sourceToTargetEntiteId.get(row.source_id_entite) ?? null
        : null;
      const delegant = row.delegant_login ? userByLogin.get(row.delegant_login) ?? null : null;
      const delegataire = row.delegataire_login
        ? userByLogin.get(row.delegataire_login) ?? null
        : null;

      if (!targetEntiteId || !delegant || !delegataire) {
        pushItem({
          sheet: 'delegations',
          sourceKey: row.source_id_delegation || '',
          label: row.delegant_login || 'Délégation',
          status: 'warning',
          detail:
            "La délégation n'a pas pu être importée car la structure ou les utilisateurs manquent.",
        });
        continue;
      }

      const key = this.buildDelegationKey(
        delegant.login,
        delegataire.login,
        row.id_role || '',
        Number(targetEntiteId),
        row.date_debut || '',
        row.date_fin || '',
      );

      if (delegationKeyMap.has(key)) {
        pushItem({
          sheet: 'delegations',
          sourceKey: row.source_id_delegation || '',
          label: `${delegant.login} → ${delegataire.login}`,
          status: 'skip',
          detail: 'Délégation déjà présente, elle sera ignorée.',
        });
        continue;
      }

      if (apply) {
        await tx.delegation.create({
          data: {
            delegant_id: delegant.id_user,
            delegataire_id: delegataire.id_user,
            id_entite: targetEntiteId,
            id_role: this.emptyToNull(row.id_role),
            type_droit: this.emptyToNull(row.type_droit),
            date_debut: this.parseDate(row.date_debut, new Date()),
            date_fin: this.parseNullableDate(row.date_fin),
            statut: (this.emptyToNull(row.statut) as never) ?? 'ACTIVE',
          },
        });
      }
      delegationKeyMap.add(key);
      pushItem({
        sheet: 'delegations',
        sourceKey: row.source_id_delegation || '',
        label: `${delegant.login} → ${delegataire.login}`,
        status: 'create',
        detail: 'Nouvelle délégation à créer.',
      });
    }

    const existingSignalements = importedTargetEntiteIds.length
      ? await tx.signalement.findMany({
          where: { id_entite_cible: { in: importedTargetEntiteIds } },
          include: {
            utilisateur_signalement_auteur_idToutilisateur: true,
          },
        })
      : [];
    const signalementKeySet = new Set(
      existingSignalements.map((signalement) =>
        this.buildSignalementKey(
          signalement.utilisateur_signalement_auteur_idToutilisateur?.login ?? '',
          signalement.description,
          signalement.id_entite_cible ? Number(signalement.id_entite_cible) : null,
          signalement.date_creation.toISOString(),
        ),
      ),
    );

    for (const row of workbook.sheets.signalements) {
      const targetEntiteId = row.source_id_entite_cible
        ? sourceToTargetEntiteId.get(row.source_id_entite_cible) ?? null
        : null;
      const auteur = row.auteur_login ? userByLogin.get(row.auteur_login) ?? null : null;

      if (!auteur) {
        pushItem({
          sheet: 'signalements',
          sourceKey: row.source_id_signalement || '',
          label: row.description || 'Signalement',
          status: 'warning',
          detail: "Le signalement n'a pas pu être importé car son auteur est introuvable.",
        });
        continue;
      }

      const signalementKey = this.buildSignalementKey(
        auteur.login,
        row.description || '',
        targetEntiteId ? Number(targetEntiteId) : null,
        row.date_creation || '',
      );

      if (signalementKeySet.has(signalementKey)) {
        pushItem({
          sheet: 'signalements',
          sourceKey: row.source_id_signalement || '',
          label: row.description || 'Signalement',
          status: 'skip',
          detail: 'Signalement déjà présent, il sera ignoré.',
        });
        continue;
      }

      const traitant = row.traitant_login ? userByLogin.get(row.traitant_login) ?? null : null;
      const cloturePar = row.cloture_par_login
        ? userByLogin.get(row.cloture_par_login) ?? null
        : null;
      const userCible = row.user_cible_login ? userByLogin.get(row.user_cible_login) ?? null : null;

      if (apply) {
        await tx.signalement.create({
          data: {
            auteur_id: auteur.id_user,
            traitant_id: traitant?.id_user ?? null,
            cloture_par_id: cloturePar?.id_user ?? null,
            id_user_cible: userCible?.id_user ?? null,
            id_entite_cible: targetEntiteId ?? null,
            description: row.description || '',
            type_signalement: row.type_signalement || 'AUTRE',
            escalade_sc: this.toBoolean(row.escalade_sc, false),
            statut: (this.emptyToNull(row.statut) as never) ?? 'OUVERT',
            date_creation: this.parseDateTime(row.date_creation, new Date()),
            date_prise_en_charge: this.parseNullableDateTime(row.date_prise_en_charge),
            date_traitement: this.parseNullableDateTime(row.date_traitement),
            commentaire_prise_en_charge: this.emptyToNull(
              row.commentaire_prise_en_charge,
            ),
            commentaire_cloture: this.emptyToNull(row.commentaire_cloture),
          },
        });
      }
      signalementKeySet.add(signalementKey);
      pushItem({
        sheet: 'signalements',
        sourceKey: row.source_id_signalement || '',
        label: row.description || 'Signalement',
        status: 'create',
        detail: 'Nouveau signalement à créer.',
      });
    }

    const existingOrganigrammes = targetYearId
      ? await tx.organigramme.findMany({
          where: { id_annee: BigInt(targetYearId) },
          include: { utilisateur: true },
        })
      : [];
    const organigrammeKeySet = new Set(
      existingOrganigrammes.map((organigramme) =>
        this.buildOrganigrammeKey(
          organigramme.id_entite_racine ? Number(organigramme.id_entite_racine) : null,
          organigramme.generated_at.toISOString(),
        ),
      ),
    );

    for (const row of workbook.sheets.organigrammes) {
      if (!targetYearId || !row.source_id_entite_racine) {
        continue;
      }
      const targetRootId =
        sourceToTargetEntiteId.get(row.source_id_entite_racine) ?? null;
      if (!targetRootId) {
        pushItem({
          sheet: 'organigrammes',
          sourceKey: row.source_id_organigramme || '',
          label: row.source_id_entite_racine,
          status: 'warning',
          detail: "L'organigramme ne peut pas être restauré sans racine importée.",
        });
        continue;
      }

      const key = this.buildOrganigrammeKey(
        Number(targetRootId),
        row.generated_at || '',
      );
      if (organigrammeKeySet.has(key)) {
        pushItem({
          sheet: 'organigrammes',
          sourceKey: row.source_id_organigramme || '',
          label: row.source_id_entite_racine,
          status: 'skip',
          detail: 'Organigramme déjà présent, il sera ignoré.',
        });
        continue;
      }

      const generatedBy = row.generated_by_login
        ? userByLogin.get(row.generated_by_login) ?? null
        : null;
      if (apply) {
        await tx.organigramme.create({
          data: {
            id_annee: BigInt(targetYearId),
            id_entite_racine: targetRootId,
            generated_by: generatedBy?.id_user ?? BigInt(user.userId),
            generated_at: this.parseDateTime(row.generated_at, new Date()),
            est_fige: this.toBoolean(row.est_fige, false),
            export_format: row.export_format || 'PDF',
            visibility_scope: this.emptyToNull(row.visibility_scope),
          },
        });
      }
      organigrammeKeySet.add(key);
      pushItem({
        sheet: 'organigrammes',
        sourceKey: row.source_id_organigramme || '',
        label: row.source_id_entite_racine,
        status: 'create',
        detail: 'Nouvel organigramme à restaurer.',
      });
    }

    return {
      items: previewItems,
      summary,
      result: apply
        ? {
            targetYearId,
            targetYearLabel,
            processed: previewItems.length,
          }
        : undefined,
    };
  }

  private normalizeWorkbookPayload(raw: unknown): StandardWorkbookPayload {
    if (!raw || typeof raw !== 'object') {
      throw new BadRequestException('Le classeur standardisé est invalide.');
    }

    const workbook = raw as Record<string, unknown>;
    const metaRecord =
      workbook.meta && typeof workbook.meta === 'object'
        ? (workbook.meta as Record<string, unknown>)
        : {};
    const sheetsRecord =
      workbook.sheets && typeof workbook.sheets === 'object'
        ? (workbook.sheets as Record<string, unknown>)
        : {};

    const formatVersion = String(
      workbook.formatVersion ??
        metaRecord.format_version ??
        '',
    ).trim();

    if (formatVersion !== STANDARD_WORKBOOK_VERSION) {
      throw new BadRequestException(
        `Format de classeur non supporté. Version attendue: ${STANDARD_WORKBOOK_VERSION}.`,
      );
    }

    const sheets = Object.fromEntries(
      Object.keys(STANDARD_WORKBOOK_COLUMNS).map((sheetName) => {
        const rawRows = Array.isArray(sheetsRecord[sheetName])
          ? (sheetsRecord[sheetName] as unknown[])
          : [];
        const columns =
          STANDARD_WORKBOOK_COLUMNS[sheetName as StandardWorkbookSheetName];

        const rows = rawRows.map((row) => {
          const record = typeof row === 'object' && row
            ? (row as Record<string, unknown>)
            : {};
          return Object.fromEntries(
            columns.map((column) => [column, String(record[column] ?? '').trim()]),
          );
        });

        return [sheetName, rows];
      }),
    ) as Record<StandardWorkbookSheetName, StandardWorkbookRow[]>;

    return {
      formatVersion,
      meta: Object.fromEntries(
        Object.entries(metaRecord).map(([key, value]) => [key, String(value ?? '').trim()]),
      ),
      sheets,
    };
  }

  private filterWorkbookByScope(
    workbook: StandardWorkbookPayload,
    scopeSourceEntiteId?: number,
  ): StandardWorkbookPayload {
    if (!scopeSourceEntiteId) {
      return workbook;
    }

    const structureRows = workbook.sheets.structures;
    const childrenByParent = new Map<string, string[]>();
    structureRows.forEach((row) => {
      const parentId = row.source_parent_id_entite?.trim();
      if (!parentId) return;
      const list = childrenByParent.get(parentId) ?? [];
      list.push(row.source_id_entite);
      childrenByParent.set(parentId, list);
    });

    const selectedIds = new Set<string>();
    const queue = [String(scopeSourceEntiteId)];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || selectedIds.has(currentId)) {
        continue;
      }
      selectedIds.add(currentId);
      (childrenByParent.get(currentId) ?? []).forEach((childId) => queue.push(childId));
    }

    const affectations = workbook.sheets.affectations.filter((row) =>
      selectedIds.has(row.source_id_entite),
    );
    const affectationIds = new Set(
      affectations.map((row) => row.source_id_affectation).filter(Boolean),
    );
    const users = new Set<string>();
    const roles = new Set<string>();
    affectations.forEach((row) => {
      if (row.user_login) users.add(row.user_login);
      if (row.id_role) roles.add(row.id_role);
    });

    const delegations = workbook.sheets.delegations.filter((row) =>
      selectedIds.has(row.source_id_entite),
    );
    delegations.forEach((row) => {
      if (row.delegant_login) users.add(row.delegant_login);
      if (row.delegataire_login) users.add(row.delegataire_login);
      if (row.id_role) roles.add(row.id_role);
    });

    const signalements = workbook.sheets.signalements.filter((row) =>
      !row.source_id_entite_cible || selectedIds.has(row.source_id_entite_cible),
    );
    signalements.forEach((row) => {
      if (row.auteur_login) users.add(row.auteur_login);
      if (row.traitant_login) users.add(row.traitant_login);
      if (row.cloture_par_login) users.add(row.cloture_par_login);
      if (row.user_cible_login) users.add(row.user_cible_login);
    });

    const organigrammes = workbook.sheets.organigrammes.filter((row) =>
      selectedIds.has(row.source_id_entite_racine),
    );
    organigrammes.forEach((row) => {
      if (row.generated_by_login) users.add(row.generated_by_login);
    });

    return {
      ...workbook,
      meta: {
        ...workbook.meta,
        scope_source_entite_id: String(scopeSourceEntiteId),
      },
      sheets: {
        roles: workbook.sheets.roles.filter((row) =>
          roles.has(row.id_role) ||
          (row.source_id_composante && selectedIds.has(row.source_id_composante)),
        ),
        structures: structureRows.filter((row) => selectedIds.has(row.source_id_entite)),
        users: workbook.sheets.users.filter((row) => users.has(row.login)),
        affectations,
        contacts: workbook.sheets.contacts.filter((row) =>
          affectationIds.has(row.source_id_affectation),
        ),
        delegations,
        signalements,
        organigrammes,
      },
    };
  }

  private sortStructureRows(rows: StandardWorkbookRow[]) {
    const byId = new Map(rows.map((row) => [row.source_id_entite, row]));
    const depthCache = new Map<string, number>();

    const depthOf = (row: StandardWorkbookRow): number => {
      if (depthCache.has(row.source_id_entite)) {
        return depthCache.get(row.source_id_entite)!;
      }
      const parentId = row.source_parent_id_entite?.trim();
      if (!parentId || !byId.has(parentId)) {
        depthCache.set(row.source_id_entite, 0);
        return 0;
      }
      const depth = depthOf(byId.get(parentId)!) + 1;
      depthCache.set(row.source_id_entite, depth);
      return depth;
    };

    return [...rows].sort((left, right) => {
      const depthDiff = depthOf(left) - depthOf(right);
      if (depthDiff !== 0) {
        return depthDiff;
      }
      return left.source_id_entite.localeCompare(right.source_id_entite);
    });
  }

  private findExistingStructure(
    row: StandardWorkbookRow,
    parentId: number | null,
    byParentKey: Map<string, any[]>,
    byTypeAndName: Map<string, any[]>,
  ) {
    const exactKey = this.buildStructureMatchKey(row.type_entite, row.nom, parentId);
    const exactMatches = byParentKey.get(exactKey) ?? [];
    if (exactMatches.length > 0) {
      return exactMatches[0];
    }

    const globalKey = this.buildStructureGlobalKey(row.type_entite, row.nom);
    const globalMatches = byTypeAndName.get(globalKey) ?? [];
    if (parentId == null && globalMatches.length === 1) {
      return globalMatches[0];
    }

    return null;
  }

  private collectStructureChanges(existing: any, row: StandardWorkbookRow) {
    const baseData: Record<string, unknown> = {};
    let hasChanges = false;

    const compare = (field: string, nextValue: string | null) => {
      const currentValue =
        existing[field] != null ? String(existing[field]) : null;
      if ((currentValue ?? '') !== (nextValue ?? '')) {
        baseData[field] = nextValue;
        hasChanges = true;
      }
    };

    compare('tel_service', this.emptyToNull(row.tel_service));
    compare('bureau_service', this.emptyToNull(row.bureau_service));

    return {
      hasChanges,
      baseData: Object.keys(baseData).length > 0 ? baseData : null,
    };
  }

  private async applyStructureSubtype(
    tx: Prisma.TransactionClient,
    entiteId: bigint,
    row: StandardWorkbookRow,
  ) {
    if (row.type_entite === 'COMPOSANTE') {
      await tx.composante.upsert({
        where: { id_entite: entiteId },
        create: {
          id_entite: entiteId,
          code_composante: this.emptyToNull(row.code_composante),
          type_composante: this.emptyToNull(row.type_composante) as never,
          site_web: this.emptyToNull(row.site_web),
          mail_fonctionnel: this.emptyToNull(row.mail_fonctionnel),
          mail_institutionnel: this.emptyToNull(row.mail_institutionnel),
          campus: this.emptyToNull(row.campus),
        },
        update: {
          code_composante: this.emptyToNull(row.code_composante),
          type_composante: this.emptyToNull(row.type_composante) as never,
          site_web: this.emptyToNull(row.site_web),
          mail_fonctionnel: this.emptyToNull(row.mail_fonctionnel),
          mail_institutionnel: this.emptyToNull(row.mail_institutionnel),
          campus: this.emptyToNull(row.campus),
        },
      });
    }

    if (row.type_entite === 'DEPARTEMENT') {
      await tx.departement.upsert({
        where: { id_entite: entiteId },
        create: {
          id_entite: entiteId,
          code_interne: this.emptyToNull(row.code_interne),
        },
        update: {
          code_interne: this.emptyToNull(row.code_interne),
        },
      });
    }

    if (row.type_entite === 'MENTION') {
      let idTypeDiplome: bigint | null = null;
      const diplomeLibelle = this.emptyToNull(row.diplome_libelle);
      if (diplomeLibelle) {
        const diplome = await tx.type_diplome.upsert({
          where: { libelle: diplomeLibelle },
          create: { libelle: diplomeLibelle },
          update: { is_active: true },
        });
        idTypeDiplome = diplome.id_type_diplome;
      }

      await tx.mention.upsert({
        where: { id_entite: entiteId },
        create: {
          id_entite: entiteId,
          type_diplome: this.emptyToNull(row.type_diplome),
          cycle: row.cycle ? this.toNumber(row.cycle, null) : null,
          id_type_diplome: idTypeDiplome,
        },
        update: {
          type_diplome: this.emptyToNull(row.type_diplome),
          cycle: row.cycle ? this.toNumber(row.cycle, null) : null,
          id_type_diplome: idTypeDiplome,
        },
      });
    }

    if (row.type_entite === 'PARCOURS') {
      await tx.parcours.upsert({
        where: { id_entite: entiteId },
        create: {
          id_entite: entiteId,
          code_parcours: this.emptyToNull(row.code_parcours),
        },
        update: {
          code_parcours: this.emptyToNull(row.code_parcours),
        },
      });
    }

    if (row.type_entite === 'NIVEAU') {
      await tx.niveau.upsert({
        where: { id_entite: entiteId },
        create: {
          id_entite: entiteId,
          libelle_court: this.emptyToNull(row.libelle_court),
        },
        update: {
          libelle_court: this.emptyToNull(row.libelle_court),
        },
      });
    }
  }

  private collectWorkbookUserChanges(existing: any, row: StandardWorkbookRow) {
    const nextValues = {
      uid_cas: this.emptyToNull(row.uid_cas),
      nom: this.emptyToNull(row.nom) ?? existing.nom,
      prenom: this.emptyToNull(row.prenom) ?? existing.prenom,
      genre: this.toUtilisateurGenre(row.genre, existing.genre ?? null),
      categorie: this.toUtilisateurCategorie(row.categorie, existing.categorie ?? null),
      email_institutionnel: this.emptyToNull(row.email_institutionnel),
      email_institutionnel_secondaire: this.emptyToNull(
        row.email_institutionnel_secondaire,
      ),
      telephone: this.emptyToNull(row.telephone),
      bureau: this.emptyToNull(row.bureau),
      statut: this.toUtilisateurStatut(row.statut, existing.statut),
    };

    let hasChanges = false;
    Object.entries(nextValues).forEach(([key, value]) => {
      if ((existing[key] ?? null) !== value) {
        hasChanges = true;
      }
    });

    return {
      hasChanges,
      data: nextValues,
      preview: nextValues,
    };
  }

  private buildStructureMatchKey(
    type: string,
    nom: string,
    parentId: number | null,
  ) {
    return `${parentId ?? 'root'}|${this.normalizeKey(type)}|${this.normalizeKey(nom)}`;
  }

  private buildStructureGlobalKey(type: string, nom: string) {
    return `${this.normalizeKey(type)}|${this.normalizeKey(nom)}`;
  }

  private buildAffectationKey(
    login: string,
    roleId: string,
    entiteId: number,
    yearId: number,
  ) {
    return `${login}|${roleId}|${entiteId}|${yearId}`;
  }

  private buildDelegationKey(
    delegantLogin: string,
    delegataireLogin: string,
    roleId: string,
    entiteId: number,
    dateDebut: string,
    dateFin: string,
  ) {
    return `${delegantLogin}|${delegataireLogin}|${roleId}|${entiteId}|${dateDebut}|${dateFin}`;
  }

  private buildSignalementKey(
    auteurLogin: string,
    description: string,
    entiteId: number | null,
    createdAt: string,
  ) {
    return `${auteurLogin}|${entiteId ?? 'none'}|${this.normalizeKey(description)}|${createdAt}`;
  }

  private buildOrganigrammeKey(
    entiteRacineId: number | null,
    generatedAt: string,
  ) {
    return `${entiteRacineId ?? 'none'}|${generatedAt}`;
  }

  private normalizeKey(value: string | null | undefined) {
    return (value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private emptyToNull(value: string | null | undefined) {
    const normalized = String(value ?? '').trim();
    return normalized ? normalized : null;
  }

  private toUtilisateurGenre(
    value: string | null | undefined,
    fallback: utilisateur_genre | null = null,
  ): utilisateur_genre | null {
    const normalized = this.emptyToNull(value)?.toUpperCase();
    if (!normalized) return fallback;

    return Object.values(utilisateur_genre).includes(normalized as utilisateur_genre)
      ? (normalized as utilisateur_genre)
      : fallback;
  }

  private toUtilisateurCategorie(
    value: string | null | undefined,
    fallback: utilisateur_categorie | null = null,
  ): utilisateur_categorie | null {
    const normalized = this.emptyToNull(value)?.toUpperCase();
    if (!normalized) return fallback;

    return Object.values(utilisateur_categorie).includes(
      normalized as utilisateur_categorie,
    )
      ? (normalized as utilisateur_categorie)
      : fallback;
  }

  private toUtilisateurStatut(
    value: string | null | undefined,
    fallback: utilisateur_statut,
  ): utilisateur_statut {
    const normalized = this.emptyToNull(value)?.toUpperCase();
    if (!normalized) return fallback;

    return Object.values(utilisateur_statut).includes(normalized as utilisateur_statut)
      ? (normalized as utilisateur_statut)
      : fallback;
  }

  private toBoolean(value: string | null | undefined, fallback: boolean) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return fallback;
    return normalized === 'true' || normalized === '1' || normalized === 'oui';
  }

  private toNumber<T extends number | null>(
    value: string | null | undefined,
    fallback: T,
  ): T {
    const normalized = String(value ?? '').trim();
    if (!normalized) return fallback;
    const parsed = Number(normalized);
    return (Number.isFinite(parsed) ? parsed : fallback) as T;
  }

  private parseDate(raw: string | null | undefined, fallback: Date) {
    const normalized = String(raw ?? '').trim();
    if (!normalized) return fallback;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }

  private parseNullableDate(raw: string | null | undefined) {
    const normalized = String(raw ?? '').trim();
    if (!normalized) return null;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseDateTime(raw: string | null | undefined, fallback: Date) {
    return this.parseDate(raw, fallback);
  }

  private parseNullableDateTime(raw: string | null | undefined) {
    return this.parseNullableDate(raw);
  }

  private isServicesCentraux(user: CurrentUser) {
    return user.affectations.some(
      (affectation) => affectation.roleId === ROLE_IDS.SERVICES_CENTRAUX,
    );
  }

  private computeUserChanges(
    existing: {
      nom: string;
      prenom: string;
      email_institutionnel: string | null;
      telephone: string | null;
      bureau: string | null;
    },
    row: ImportResponsableRowDto,
  ): ImportPreviewChange[] {
    const changes: ImportPreviewChange[] = [];
    const fields: Array<{
      key: keyof typeof existing;
      label: string;
      major: boolean;
    }> = [
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
