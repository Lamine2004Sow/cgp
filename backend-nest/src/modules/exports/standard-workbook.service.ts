import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export const STANDARD_WORKBOOK_VERSION = 'CGP_STANDARD_V1';

export const STANDARD_WORKBOOK_COLUMNS = {
  roles: [
    'id_role',
    'libelle',
    'description',
    'niveau_hierarchique',
    'is_global',
    'est_administratif',
    'est_transverse',
    'source_id_composante',
  ],
  structures: [
    'source_id_entite',
    'source_parent_id_entite',
    'type_entite',
    'nom',
    'tel_service',
    'bureau_service',
    'code_composante',
    'type_composante',
    'site_web',
    'mail_fonctionnel',
    'mail_institutionnel',
    'campus',
    'code_interne',
    'type_diplome',
    'diplome_libelle',
    'cycle',
    'code_parcours',
    'libelle_court',
  ],
  users: [
    'source_id_user',
    'login',
    'uid_cas',
    'nom',
    'prenom',
    'genre',
    'categorie',
    'email_institutionnel',
    'email_institutionnel_secondaire',
    'telephone',
    'bureau',
    'statut',
  ],
  affectations: [
    'source_id_affectation',
    'source_id_affectation_n_plus_1',
    'user_login',
    'id_role',
    'source_id_entite',
    'date_debut',
    'date_fin',
  ],
  contacts: [
    'source_id_contact_role',
    'source_id_affectation',
    'email_fonctionnelle',
    'type_email',
    'telephone',
    'bureau',
  ],
  delegations: [
    'source_id_delegation',
    'delegant_login',
    'delegataire_login',
    'source_id_entite',
    'id_role',
    'type_droit',
    'date_debut',
    'date_fin',
    'statut',
  ],
  signalements: [
    'source_id_signalement',
    'auteur_login',
    'traitant_login',
    'cloture_par_login',
    'user_cible_login',
    'source_id_entite_cible',
    'description',
    'type_signalement',
    'escalade_sc',
    'statut',
    'date_creation',
    'date_prise_en_charge',
    'date_traitement',
    'commentaire_prise_en_charge',
    'commentaire_cloture',
  ],
  organigrammes: [
    'source_id_organigramme',
    'source_id_entite_racine',
    'generated_by_login',
    'generated_at',
    'est_fige',
    'export_format',
    'visibility_scope',
  ],
} as const;

export type StandardWorkbookSheetName = keyof typeof STANDARD_WORKBOOK_COLUMNS;
export type StandardWorkbookRow = Record<string, string>;

export interface StandardWorkbookPayload {
  formatVersion: string;
  meta: Record<string, string>;
  sheets: Record<StandardWorkbookSheetName, StandardWorkbookRow[]>;
}

@Injectable()
export class StandardWorkbookService {
  constructor(private readonly prisma: PrismaService) {}

  async buildWorkbookPayload(params: {
    yearId: number;
    entiteId?: number;
    template?: boolean;
  }): Promise<StandardWorkbookPayload> {
    const year = await this.prisma.annee_universitaire.findUnique({
      where: { id_annee: BigInt(params.yearId) },
    });

    if (!year) {
      throw new NotFoundException("Année introuvable");
    }

    const scope = await this.resolveScope(params.yearId, params.entiteId);

    const meta: Record<string, string> = {
      format_version: STANDARD_WORKBOOK_VERSION,
      scope_type: scope.rootEntite ? 'STRUCTURE' : 'YEAR',
      source_year_id: String(year.id_annee),
      source_year_label: year.libelle,
      source_year_start: this.formatDate(year.date_debut),
      source_year_end: this.formatDate(year.date_fin),
      source_year_status: year.statut,
      scope_entite_id: scope.rootEntite ? String(scope.rootEntite.id_entite) : '',
      scope_entite_name: scope.rootEntite?.nom ?? '',
      exported_at: new Date().toISOString(),
      template: params.template ? 'true' : 'false',
    };

    if (params.template) {
      return {
        formatVersion: STANDARD_WORKBOOK_VERSION,
        meta,
        sheets: {
          roles: [],
          structures: [],
          users: [],
          affectations: [],
          contacts: [],
          delegations: [],
          signalements: [],
          organigrammes: [],
        },
      };
    }

    const entiteIds = Array.from(scope.scopeEntiteIds);
    const entiteBigInts = entiteIds.map((id) => BigInt(id));

    const [
      structures,
      affectations,
      delegations,
      signalements,
      organigrammes,
    ] = await Promise.all([
      this.prisma.entite_structure.findMany({
        where: {
          id_annee: BigInt(params.yearId),
          id_entite: { in: entiteBigInts },
        },
        orderBy: { id_entite: 'asc' },
        include: {
          composante: true,
          departement: true,
          mention: { include: { diplome: true } },
          parcours: true,
          niveau: true,
        },
      }),
      this.prisma.affectation.findMany({
        where: {
          id_annee: BigInt(params.yearId),
          id_entite: { in: entiteBigInts },
        },
        orderBy: { id_affectation: 'asc' },
        include: {
          utilisateur: true,
          role: true,
          contact_role: true,
        },
      }),
      this.prisma.delegation.findMany({
        where: {
          id_entite: { in: entiteBigInts },
        },
        orderBy: { id_delegation: 'asc' },
        include: {
          utilisateur_delegation_delegant_idToutilisateur: true,
          utilisateur_delegation_delegataire_idToutilisateur: true,
        },
      }),
      this.prisma.signalement.findMany({
        where: {
          id_entite_cible: { in: entiteBigInts },
        },
        orderBy: { id_signalement: 'asc' },
        include: {
          utilisateur_signalement_auteur_idToutilisateur: true,
          utilisateur_signalement_traitant_idToutilisateur: true,
          utilisateur_signalement_cloture_par_idToutilisateur: true,
          utilisateur_signalement_user_cibleToutilisateur: true,
        },
      }),
      this.prisma.organigramme.findMany({
        where: {
          id_annee: BigInt(params.yearId),
          id_entite_racine: { in: entiteBigInts },
        },
        orderBy: { generated_at: 'asc' },
        include: {
          utilisateur: true,
        },
      }),
    ]);

    const roleIds = new Set<string>();
    affectations.forEach((item) => roleIds.add(item.id_role));
    delegations.forEach((item) => {
      if (item.id_role) {
        roleIds.add(item.id_role);
      }
    });

    const roleRows = await this.prisma.role.findMany({
      where: {
        OR: [
          { id_role: { in: Array.from(roleIds) } },
          { id_composante: { in: entiteBigInts } },
        ],
      },
      orderBy: { id_role: 'asc' },
    });

    const userIds = new Set<string>();
    affectations.forEach((item) => userIds.add(String(item.id_user)));
    delegations.forEach((item) => {
      userIds.add(String(item.delegant_id));
      userIds.add(String(item.delegataire_id));
    });
    signalements.forEach((item) => {
      userIds.add(String(item.auteur_id));
      if (item.traitant_id) userIds.add(String(item.traitant_id));
      if (item.cloture_par_id) userIds.add(String(item.cloture_par_id));
      if (item.id_user_cible) userIds.add(String(item.id_user_cible));
    });
    organigrammes.forEach((item) => userIds.add(String(item.generated_by)));

    const users = await this.prisma.utilisateur.findMany({
      where: {
        id_user: { in: Array.from(userIds).map((value) => BigInt(value)) },
      },
      orderBy: { login: 'asc' },
    });

    return {
      formatVersion: STANDARD_WORKBOOK_VERSION,
      meta,
      sheets: {
        roles: roleRows.map((item) => ({
          id_role: item.id_role,
          libelle: item.libelle ?? '',
          description: item.description ?? '',
          niveau_hierarchique: String(item.niveau_hierarchique ?? 0),
          is_global: item.is_global ? 'true' : 'false',
          est_administratif: item.est_administratif ? 'true' : 'false',
          est_transverse: item.est_transverse ? 'true' : 'false',
          source_id_composante: item.id_composante ? String(item.id_composante) : '',
        })),
        structures: structures.map((item) => ({
          source_id_entite: String(item.id_entite),
          source_parent_id_entite: item.id_entite_parent ? String(item.id_entite_parent) : '',
          type_entite: item.type_entite,
          nom: item.nom,
          tel_service: item.tel_service ?? '',
          bureau_service: item.bureau_service ?? '',
          code_composante: item.composante?.code_composante ?? '',
          type_composante: item.composante?.type_composante ?? '',
          site_web: item.composante?.site_web ?? '',
          mail_fonctionnel: item.composante?.mail_fonctionnel ?? '',
          mail_institutionnel: item.composante?.mail_institutionnel ?? '',
          campus: item.composante?.campus ?? '',
          code_interne: item.departement?.code_interne ?? '',
          type_diplome: item.mention?.type_diplome ?? '',
          diplome_libelle: item.mention?.diplome?.libelle ?? '',
          cycle: item.mention?.cycle != null ? String(item.mention.cycle) : '',
          code_parcours: item.parcours?.code_parcours ?? '',
          libelle_court: item.niveau?.libelle_court ?? '',
        })),
        users: users.map((item) => ({
          source_id_user: String(item.id_user),
          login: item.login,
          uid_cas: item.uid_cas ?? '',
          nom: item.nom,
          prenom: item.prenom,
          genre: item.genre ?? '',
          categorie: item.categorie ?? '',
          email_institutionnel: item.email_institutionnel ?? '',
          email_institutionnel_secondaire:
            item.email_institutionnel_secondaire ?? '',
          telephone: item.telephone ?? '',
          bureau: item.bureau ?? '',
          statut: item.statut,
        })),
        affectations: affectations.map((item) => ({
          source_id_affectation: String(item.id_affectation),
          source_id_affectation_n_plus_1: item.id_affectation_n_plus_1
            ? String(item.id_affectation_n_plus_1)
            : '',
          user_login: item.utilisateur.login,
          id_role: item.id_role,
          source_id_entite: String(item.id_entite),
          date_debut: this.formatDate(item.date_debut),
          date_fin: this.formatDate(item.date_fin),
        })),
        contacts: affectations.flatMap((item) =>
          item.contact_role.map((contact) => ({
            source_id_contact_role: String(contact.id_contact_role),
            source_id_affectation: String(item.id_affectation),
            email_fonctionnelle: contact.email_fonctionnelle ?? '',
            type_email: contact.type_email ?? '',
            telephone: contact.telephone ?? '',
            bureau: contact.bureau ?? '',
          })),
        ),
        delegations: delegations.map((item) => ({
          source_id_delegation: String(item.id_delegation),
          delegant_login:
            item.utilisateur_delegation_delegant_idToutilisateur?.login ?? '',
          delegataire_login:
            item.utilisateur_delegation_delegataire_idToutilisateur?.login ?? '',
          source_id_entite: String(item.id_entite),
          id_role: item.id_role ?? '',
          type_droit: item.type_droit ?? '',
          date_debut: this.formatDate(item.date_debut),
          date_fin: this.formatDate(item.date_fin),
          statut: item.statut,
        })),
        signalements: signalements.map((item) => ({
          source_id_signalement: String(item.id_signalement),
          auteur_login:
            item.utilisateur_signalement_auteur_idToutilisateur?.login ?? '',
          traitant_login:
            item.utilisateur_signalement_traitant_idToutilisateur?.login ?? '',
          cloture_par_login:
            item.utilisateur_signalement_cloture_par_idToutilisateur?.login ?? '',
          user_cible_login:
            item.utilisateur_signalement_user_cibleToutilisateur?.login ?? '',
          source_id_entite_cible: item.id_entite_cible
            ? String(item.id_entite_cible)
            : '',
          description: item.description,
          type_signalement: item.type_signalement ?? '',
          escalade_sc: item.escalade_sc ? 'true' : 'false',
          statut: item.statut,
          date_creation: item.date_creation?.toISOString() ?? '',
          date_prise_en_charge: item.date_prise_en_charge?.toISOString() ?? '',
          date_traitement: item.date_traitement?.toISOString() ?? '',
          commentaire_prise_en_charge: item.commentaire_prise_en_charge ?? '',
          commentaire_cloture: item.commentaire_cloture ?? '',
        })),
        organigrammes: organigrammes.map((item) => ({
          source_id_organigramme: String(item.id_organigramme),
          source_id_entite_racine: String(item.id_entite_racine),
          generated_by_login: item.utilisateur?.login ?? '',
          generated_at: item.generated_at.toISOString(),
          est_fige: item.est_fige ? 'true' : 'false',
          export_format: item.export_format ?? '',
          visibility_scope: item.visibility_scope ?? '',
        })),
      },
    };
  }

  toDownload(
    fileName: string,
    workbook: StandardWorkbookPayload,
  ): { fileName: string; mimeType: string; contentBase64: string } {
    const xml = this.serializeWorkbook(workbook);
    return {
      fileName,
      mimeType: 'application/vnd.ms-excel',
      contentBase64: Buffer.from(xml, 'utf-8').toString('base64'),
    };
  }

  serializeWorkbook(workbook: StandardWorkbookPayload): string {
    const sheets: Array<{ name: string; columns: string[]; rows: StandardWorkbookRow[] }> = [
      {
        name: 'META',
        columns: ['key', 'value'],
        rows: Object.entries(workbook.meta).map(([key, value]) => ({
          key,
          value: value ?? '',
        })),
      },
      ...Object.entries(STANDARD_WORKBOOK_COLUMNS).map(([name, columns]) => ({
        name: name.toUpperCase(),
        columns: [...columns],
        rows: workbook.sheets[name as StandardWorkbookSheetName] ?? [],
      })),
    ];

    const worksheets = sheets
      .map((sheet) => this.renderWorksheet(sheet.name, sheet.columns, sheet.rows))
      .join('');

    return [
      '<?xml version="1.0"?>',
      '<?mso-application progid="Excel.Sheet"?>',
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
      ' xmlns:o="urn:schemas-microsoft-com:office:office"',
      ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
      ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
      '<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">',
      `<Version>${this.escapeXml(workbook.formatVersion)}</Version>`,
      '</DocumentProperties>',
      worksheets,
      '</Workbook>',
    ].join('');
  }

  private async resolveScope(yearId: number, entiteId?: number) {
    const entites = await this.prisma.entite_structure.findMany({
      where: { id_annee: BigInt(yearId) },
      orderBy: { id_entite: 'asc' },
      select: {
        id_entite: true,
        id_entite_parent: true,
        nom: true,
      },
    });

    if (!entites.length) {
      return {
        scopeEntiteIds: new Set<number>(),
        rootEntite: null as null | { id_entite: number; nom: string },
      };
    }

    if (!entiteId) {
      return {
        scopeEntiteIds: new Set(entites.map((item) => Number(item.id_entite))),
        rootEntite: null as null | { id_entite: number; nom: string },
      };
    }

    const root = entites.find((item) => Number(item.id_entite) === entiteId);
    if (!root) {
      throw new NotFoundException("Structure de portée introuvable");
    }

    const childrenByParent = new Map<number, number[]>();
    entites.forEach((item) => {
      if (!item.id_entite_parent) {
        return;
      }
      const parentId = Number(item.id_entite_parent);
      const list = childrenByParent.get(parentId) ?? [];
      list.push(Number(item.id_entite));
      childrenByParent.set(parentId, list);
    });

    const scopeEntiteIds = new Set<number>();
    const queue = [entiteId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (currentId == null || scopeEntiteIds.has(currentId)) {
        continue;
      }
      scopeEntiteIds.add(currentId);
      (childrenByParent.get(currentId) ?? []).forEach((childId) => queue.push(childId));
    }

    return {
      scopeEntiteIds,
      rootEntite: { id_entite: Number(root.id_entite), nom: root.nom },
    };
  }

  private renderWorksheet(
    name: string,
    columns: string[],
    rows: StandardWorkbookRow[],
  ): string {
    const header = this.renderRow(
      columns.map((column) => this.renderCell(column)),
    );
    const body = rows
      .map((row) =>
        this.renderRow(
          columns.map((column) => this.renderCell(row[column] ?? '')),
        ),
      )
      .join('');

    return [
      `<Worksheet ss:Name="${this.escapeXml(name)}">`,
      '<Table>',
      header,
      body,
      '</Table>',
      '</Worksheet>',
    ].join('');
  }

  private renderRow(cells: string[]): string {
    return `<Row>${cells.join('')}</Row>`;
  }

  private renderCell(value: string): string {
    return `<Cell><Data ss:Type="String">${this.escapeXml(value)}</Data></Cell>`;
  }

  private escapeXml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private formatDate(value: Date | null | undefined): string {
    if (!value) {
      return '';
    }
    return value.toISOString().slice(0, 10);
  }
}
