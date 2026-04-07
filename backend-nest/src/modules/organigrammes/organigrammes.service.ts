import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CurrentUser } from '../../common/types/current-user';
import { ROLE_IDS } from '../../auth/roles.constants';
import { isSupportRole } from '../../common/utils/role-support.utils';

export interface ApiResponsable {
  id_user?: number;
  id_affectation?: number;
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  id_role: string;
  role_label?: string | null;
  id_entite?: number;
  entite_nom?: string | null;
}

export interface ApiOrgNode {
  id_node: string;
  kind: 'structure' | 'personne';
  id_entite: number | null;
  id_user?: number | null;
  nom: string;
  type_entite: string | null;
  role_label?: string | null;
  structure_nom?: string | null;
  email_institutionnel?: string | null;
  hierarchy_level?: number | null;
  children?: ApiOrgNode[];
  responsables?: ApiResponsable[];
}

type OrganigrammeViewMode = 'STRUCTURES' | 'PERSONNES';

interface BuildTreeOptions {
  view?: string;
  q?: string;
  roleId?: string;
  entiteIds?: string;
}

interface LayoutNode {
  node: ApiOrgNode;
  level: number;
  x: number;
  y: number;
  subtreeW: number;
}

interface OrgChartLayout {
  layoutNodes: LayoutNode[];
  canvasW: number;
  canvasH: number;
  boxW: number;
  boxH: number;
  headerH: number;
  vGap: number;
  pageMargin: number;
  fills: [number, number, number][];
}

const HIDDEN_ORG_ROLE_IDS = new Set<string>([
  ROLE_IDS.SERVICES_CENTRAUX,
  ROLE_IDS.ADMINISTRATEUR,
  ROLE_IDS.UTILISATEUR_SIMPLE,
  ROLE_IDS.LECTURE_SEULE,
]);

function shouldDisplayInPeopleOrgChart(roleId: string): boolean {
  if (HIDDEN_ORG_ROLE_IDS.has(roleId)) {
    return false;
  }
  return true;
}

function shouldDisplayInOrgChart(roleId: string, roleLabel?: string | null): boolean {
  if (!shouldDisplayInPeopleOrgChart(roleId)) {
    return false;
  }
  return !isSupportRole(roleId, roleLabel);
}

@Injectable()
export class OrganigrammesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: CurrentUser, yearId?: number) {
    const items = await this.prisma.organigramme.findMany({
      where: yearId ? { id_annee: BigInt(yearId) } : undefined,
      orderBy: { generated_at: 'desc' },
    });

    if (this.isServicesCentraux(user)) {
      return items.map((item) => this.mapOrganigramme(item));
    }

    const filtered = [];
    for (const item of items) {
      const canAccess = await this.canAccessEntiteInYear(
        user,
        String(item.id_entite_racine),
        String(item.id_annee),
      );
      if (canAccess) {
        filtered.push(item);
      }
    }

    return filtered.map((item) => this.mapOrganigramme(item));
  }

  async latest(user: CurrentUser, yearId: number, options?: BuildTreeOptions) {
    const items = await this.list(user, yearId);
    const organigramme = items[0] ?? null;

    const rootId = organigramme?.id_entite_racine ?? null;

    const arbre = await this.buildTree(yearId, rootId ?? undefined, options);
    return { organigramme: organigramme ?? null, arbre };
  }

  async getTreeById(user: CurrentUser, id: string, options?: BuildTreeOptions) {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('Organigramme not found');
    }

    const organigramme = await this.prisma.organigramme.findUnique({
      where: { id_organigramme: parsedId },
    });

    if (!organigramme) {
      throw new NotFoundException('Organigramme not found');
    }

    const canAccess = await this.canAccessEntiteInYear(
      user,
      String(organigramme.id_entite_racine),
      String(organigramme.id_annee),
    );
    if (!canAccess) {
      throw new ForbiddenException('Out of scope organigramme');
    }

    const arbre = await this.buildTree(
      Number(organigramme.id_annee),
      Number(organigramme.id_entite_racine),
      options,
    );

    return { organigramme: this.mapOrganigramme(organigramme), arbre };
  }

  async generate(user: CurrentUser, yearId: number, rootId: number) {
    const rootEntite = await this.prisma.entite_structure.findUnique({
      where: { id_entite: BigInt(rootId) },
      select: {
        id_entite: true,
        id_annee: true,
        type_entite: true,
      },
    });
    if (!rootEntite || Number(rootEntite.id_annee) !== yearId) {
      throw new NotFoundException('Root entity not found for year');
    }

    const canAccess = await this.canAccessEntiteInYear(
      user,
      String(rootEntite.id_entite),
      String(rootEntite.id_annee),
    );
    if (!canAccess) {
      throw new ForbiddenException('Out of scope organigramme generation');
    }

    if (
      rootEntite.type_entite === 'NIVEAU' &&
      !this.isServicesCentraux(user)
    ) {
      throw new ForbiddenException(
        'Generation at NIVEAU level is restricted to services centraux',
      );
    }

    const organigramme = await this.prisma.organigramme.create({
      data: {
        id_annee: BigInt(yearId),
        id_entite_racine: BigInt(rootId),
        generated_by: BigInt(user.userId),
      },
    });

    const arbre = await this.buildTree(yearId, rootId);
    return { organigramme: this.mapOrganigramme(organigramme), arbre };
  }

  async freeze(id: string) {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('Organigramme not found');
    }

    const organigramme = await this.prisma.organigramme.update({
      where: { id_organigramme: parsedId },
      data: { est_fige: true },
    });

    return { organigramme: this.mapOrganigramme(organigramme) };
  }

  async export(user: CurrentUser, id: string, format: string, options?: BuildTreeOptions) {
    const { organigramme, arbre } = await this.getTreeById(user, id, options);
    if (!arbre) {
      throw new NotFoundException('Organigramme tree not found');
    }

    const normalizedFormat = (format || 'PDF').toUpperCase();
    const viewMode = this.normalizeViewMode(options?.view);
    let fileName = `organigramme-${organigramme.id_annee}-${organigramme.id_organigramme}`;
    if (viewMode === 'PERSONNES') {
      fileName += '-personnes';
    }
    let mimeType = 'application/pdf';
    let content: Buffer;

    if (normalizedFormat === 'JSON') {
      fileName += '.json';
      mimeType = 'application/json';
      content = Buffer.from(
        JSON.stringify({ organigramme, arbre }, null, 2),
        'utf-8',
      );
    } else if (normalizedFormat === 'CSV') {
      fileName += '.csv';
      mimeType = 'text/csv';
      content = Buffer.from(this.toCsv(arbre), 'utf-8');
    } else if (normalizedFormat === 'SVG') {
      fileName += '.svg';
      mimeType = 'image/svg+xml';
      content = Buffer.from(this.toSvg(arbre, organigramme.id_annee), 'utf-8');
    } else {
      fileName += '.pdf';
      mimeType = 'application/pdf';
      content = await this.toPdf(arbre, organigramme.id_annee);
    }

    await this.prisma.organigramme.update({
      where: { id_organigramme: BigInt(organigramme.id_organigramme) },
      data: {
        export_format: normalizedFormat,
        export_path: `generated://${fileName}`,
      },
    });

    return {
      fileName,
      mimeType,
      contentBase64: content.toString('base64'),
    };
  }

  private normalizeViewMode(view?: string): OrganigrammeViewMode {
    return view?.trim().toUpperCase() === 'PERSONNES' ? 'PERSONNES' : 'STRUCTURES';
  }

  private parseNumericId(raw?: string): bigint | null {
    const value = raw?.trim();
    if (!value || !/^\d+$/.test(value)) {
      return null;
    }

    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }

  private parseEntiteIds(raw?: string): Set<number> | null {
    if (!raw?.trim()) {
      return null;
    }

    const ids = raw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => /^\d+$/.test(value))
      .map((value) => Number(value));

    return ids.length > 0 ? new Set(ids) : null;
  }

  private matchesPeopleFilter(
    affectation: {
      id_affectation: bigint;
      id_affectation_n_plus_1: bigint | null;
      id_user: bigint;
      id_entite: bigint;
      id_role: string;
      utilisateur: {
        login: string;
        nom: string;
        prenom: string;
        email_institutionnel: string | null;
      };
      role: { libelle: string | null; niveau_hierarchique: number | null } | null;
      entite_structure: { nom: string } | null;
    },
    options: BuildTreeOptions,
    allowedEntiteIds: Set<number> | null,
    affiliationLabel: string,
  ): boolean {
    const entiteId = Number(affectation.id_entite);
    if (allowedEntiteIds && !allowedEntiteIds.has(entiteId)) {
      return false;
    }

    if (options.roleId && affectation.id_role !== options.roleId) {
      return false;
    }

    const q = options.q?.trim();
    if (!q) {
      return true;
    }

    const normalizedQuery = q.toLowerCase();
    const numericId = this.parseNumericId(q);

    if (
      numericId &&
      (affectation.id_affectation === numericId ||
        affectation.id_user === numericId ||
        affectation.id_entite === numericId)
    ) {
      return true;
    }

    return (
      affectation.utilisateur.nom.toLowerCase().includes(normalizedQuery) ||
      affectation.utilisateur.prenom.toLowerCase().includes(normalizedQuery) ||
      affectation.utilisateur.login.toLowerCase().includes(normalizedQuery) ||
      (affectation.utilisateur.email_institutionnel || '')
        .toLowerCase()
        .includes(normalizedQuery) ||
      (affectation.role?.libelle || affectation.id_role)
        .toLowerCase()
        .includes(normalizedQuery) ||
      (affectation.entite_structure?.nom || '').toLowerCase().includes(normalizedQuery) ||
      affiliationLabel.toLowerCase().includes(normalizedQuery)
    );
  }

  private sortTreeChildren(node: ApiOrgNode) {
    if (!node.children?.length) {
      return;
    }

    node.children.sort((left, right) => {
      if (left.kind !== right.kind) {
        return left.kind === 'structure' ? -1 : 1;
      }
      if (left.kind === 'personne' && right.kind === 'personne') {
        const leftLevel = left.hierarchy_level ?? Number.MAX_SAFE_INTEGER;
        const rightLevel = right.hierarchy_level ?? Number.MAX_SAFE_INTEGER;
        if (leftLevel !== rightLevel) {
          return leftLevel - rightLevel;
        }
      }
      return left.nom.localeCompare(right.nom, 'fr', { sensitivity: 'base' });
    });

    node.children.forEach((child) => this.sortTreeChildren(child));
  }

  private prunePeopleTree(node: ApiOrgNode): ApiOrgNode | null {
    if (node.kind === 'personne') {
      return node;
    }

    const children = (node.children ?? [])
      .map((child) => this.prunePeopleTree(child))
      .filter((child): child is ApiOrgNode => Boolean(child));

    if (children.length === 0) {
      return null;
    }

    return {
      ...node,
      children,
      responsables: undefined,
    };
  }

  private collectDescendantEntiteIds(entites: Array<{
    id_entite: bigint;
    id_entite_parent: bigint | null;
  }>, rootId?: number): Set<number> {
    const childrenByParent = new Map<number, number[]>();

    entites.forEach((entite) => {
      const parentId = entite.id_entite_parent ? Number(entite.id_entite_parent) : null;
      if (parentId == null) {
        return;
      }

      const children = childrenByParent.get(parentId) ?? [];
      children.push(Number(entite.id_entite));
      childrenByParent.set(parentId, children);
    });

    if (!rootId) {
      return new Set(entites.map((entite) => Number(entite.id_entite)));
    }

    const scope = new Set<number>();
    const queue = [rootId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (currentId == null || scope.has(currentId)) {
        continue;
      }
      scope.add(currentId);
      (childrenByParent.get(currentId) ?? []).forEach((childId) => queue.push(childId));
    }

    return scope;
  }

  private buildAffiliationLabel(
    entiteId: number,
    entiteById: Map<number, { id_entite_parent: bigint | null; nom: string; type_entite: string }>,
    rootId?: number,
  ): string {
    const chain: string[] = [];
    let currentId: number | null = entiteId;

    while (currentId != null) {
      const entite = entiteById.get(currentId);
      if (!entite) {
        break;
      }
      chain.unshift(entite.nom);
      if (rootId && currentId === rootId) {
        break;
      }
      currentId = entite.id_entite_parent ? Number(entite.id_entite_parent) : null;
    }

    return chain.join(' / ');
  }

  private async buildTree(
    yearId: number,
    rootId?: number,
    options?: BuildTreeOptions,
  ): Promise<ApiOrgNode | null> {
    const viewMode = this.normalizeViewMode(options?.view);
    const entites = await this.prisma.entite_structure.findMany({
      where: { id_annee: BigInt(yearId) },
      orderBy: { id_entite: 'asc' },
    });

    if (!entites.length) {
      return null;
    }

    const nodes = new Map<number, ApiOrgNode>();
    entites.forEach((entite) => {
      nodes.set(Number(entite.id_entite), {
        id_node: `entite-${entite.id_entite}`,
        kind: 'structure',
        id_entite: Number(entite.id_entite),
        nom: entite.nom,
        type_entite: entite.type_entite,
        children: [],
      });
    });

    entites.forEach((entite) => {
      if (entite.id_entite_parent) {
        const parent = nodes.get(Number(entite.id_entite_parent));
        const child = nodes.get(Number(entite.id_entite));
        if (parent && child) {
          parent.children?.push(child);
        }
      }
    });

    const root = rootId
      ? nodes.get(rootId)
      : nodes.get(Number(entites.find((e) => !e.id_entite_parent)?.id_entite));

    if (!root) {
      return null;
    }

    const entiteById = new Map(
      entites.map((entite) => [
        Number(entite.id_entite),
        {
          id_entite_parent: entite.id_entite_parent,
          nom: entite.nom,
          type_entite: entite.type_entite,
        },
      ]),
    );

    const entiteIds = Array.from(nodes.keys());
    const affectations = await this.prisma.affectation.findMany({
      where: {
        id_annee: BigInt(yearId),
        id_entite: { in: entiteIds.map((id) => BigInt(id)) },
      },
      include: {
        utilisateur: true,
        role: { select: { libelle: true, niveau_hierarchique: true } },
        entite_structure: { select: { nom: true } },
      },
    });

    if (viewMode === 'PERSONNES') {
      const rootScopeEntiteIds = this.collectDescendantEntiteIds(entites, rootId);
      const requestedEntiteIds = this.parseEntiteIds(options?.entiteIds);
      const directMatchEntiteIds = requestedEntiteIds
        ? new Set(
            Array.from(rootScopeEntiteIds).filter((entiteId) => requestedEntiteIds.has(entiteId)),
          )
        : rootScopeEntiteIds;
      const visibleAffectations = affectations.filter((affectation) => {
        if (!shouldDisplayInPeopleOrgChart(affectation.id_role)) {
          return false;
        }

        return rootScopeEntiteIds.has(Number(affectation.id_entite));
      });
      const affectationById = new Map(
        visibleAffectations.map((affectation) => [
          Number(affectation.id_affectation),
          affectation,
        ]),
      );
      const affiliationByAffectationId = new Map<number, string>();
      const directMatchIds = new Set<number>();

      visibleAffectations.forEach((affectation) => {
        const affiliationLabel = this.buildAffiliationLabel(
          Number(affectation.id_entite),
          entiteById,
          rootId,
        );
        const affectationId = Number(affectation.id_affectation);
        affiliationByAffectationId.set(affectationId, affiliationLabel);
        if (
          !this.matchesPeopleFilter(
            affectation,
            options ?? {},
            directMatchEntiteIds,
            affiliationLabel,
          )
        ) {
          return;
        }
        directMatchIds.add(affectationId);
      });

      if (directMatchIds.size === 0) {
        return null;
      }

      const includedAffectationIds = new Set<number>();

      directMatchIds.forEach((affectationId) => {
        let currentId: number | null = affectationId;

        while (currentId != null && !includedAffectationIds.has(currentId)) {
          const currentAffectation = affectationById.get(currentId);
          if (!currentAffectation) {
            break;
          }

          includedAffectationIds.add(currentId);
          currentId = currentAffectation.id_affectation_n_plus_1
            ? Number(currentAffectation.id_affectation_n_plus_1)
            : null;
        }
      });

      const personNodes = new Map<number, ApiOrgNode>();

      includedAffectationIds.forEach((affectationId) => {
        const affectation = affectationById.get(affectationId);
        if (!affectation) {
          return;
        }

        personNodes.set(affectationId, {
          id_node: `affectation-${affectation.id_affectation}`,
          kind: 'personne',
          id_entite: Number(affectation.id_entite),
          id_user: Number(affectation.id_user),
          nom: `${affectation.utilisateur.prenom} ${affectation.utilisateur.nom}`.trim(),
          type_entite: 'PERSONNE',
          role_label: affectation.role?.libelle ?? affectation.id_role,
          structure_nom:
            affiliationByAffectationId.get(affectationId) ??
            this.buildAffiliationLabel(Number(affectation.id_entite), entiteById, rootId),
          email_institutionnel: affectation.utilisateur.email_institutionnel,
          hierarchy_level: affectation.role?.niveau_hierarchique ?? null,
          children: [],
        });
      });

      const personRoots: ApiOrgNode[] = [];

      includedAffectationIds.forEach((affectationId) => {
        const affectation = affectationById.get(affectationId);
        const node = personNodes.get(affectationId);
        if (!affectation || !node) {
          return;
        }

        const supervisorId = affectation.id_affectation_n_plus_1
          ? Number(affectation.id_affectation_n_plus_1)
          : null;
        const supervisorNode = supervisorId ? personNodes.get(supervisorId) : undefined;

        if (supervisorNode) {
          supervisorNode.children?.push(node);
        } else {
          personRoots.push(node);
        }
      });

      personRoots.forEach((personRoot) => this.sortTreeChildren(personRoot));

      if (personRoots.length === 0) {
        return null;
      }

      if (personRoots.length === 1) {
        return personRoots[0];
      }

      return {
        id_node: `people-root-${root.id_entite ?? 'year'}`,
        kind: 'structure',
        id_entite: root.id_entite,
        nom: `Hiérarchie des personnes - ${root.nom}`,
        type_entite: 'PERSONNES',
        children: personRoots,
      };
    }

    const responsablesMap = new Map<number, ApiResponsable[]>();
    affectations.forEach((affectation) => {
      if (!shouldDisplayInOrgChart(affectation.id_role, affectation.role?.libelle)) {
        return;
      }

      const key = Number(affectation.id_entite);
      const list = responsablesMap.get(key) ?? [];
      list.push({
        id_user: Number(affectation.id_user),
        id_affectation: Number(affectation.id_affectation),
        nom: affectation.utilisateur.nom,
        prenom: affectation.utilisateur.prenom,
        email_institutionnel: affectation.utilisateur.email_institutionnel,
        id_role: affectation.id_role,
        role_label: affectation.role?.libelle ?? affectation.id_role,
        id_entite: Number(affectation.id_entite),
        entite_nom: affectation.entite_structure?.nom ?? null,
      });
      responsablesMap.set(key, list);
    });

    responsablesMap.forEach((responsables, entiteId) => {
      const node = nodes.get(entiteId);
      if (node) {
        node.responsables = responsables;
      }
    });

    this.sortTreeChildren(root);
    return root;
  }

  private mapOrganigramme(item: {
    id_organigramme: bigint;
    id_annee: bigint;
    id_entite_racine: bigint;
    generated_by: bigint;
    generated_at: Date;
    est_fige: boolean;
    export_path: string | null;
    export_format: string;
    visibility_scope: string | null;
  }) {
    return {
      id_organigramme: Number(item.id_organigramme),
      id_annee: Number(item.id_annee),
      id_entite_racine: Number(item.id_entite_racine),
      generated_by: Number(item.generated_by),
      generated_at: item.generated_at.toISOString(),
      est_fige: item.est_fige,
      export_path: item.export_path,
      export_format: item.export_format,
      visibility_scope: item.visibility_scope,
    };
  }

  private toCsv(root: ApiOrgNode): string {
    const header = [
      'id_node',
      'kind',
      'id_entite',
      'id_user',
      'nom',
      'type_entite',
      'role_label',
      'structure_nom',
      'parent_id',
      'responsables',
      'email',
    ].join(',');
    const rows: string[] = [];

    const walk = (node: ApiOrgNode, parentId: string | null) => {
      const responsables = (node.responsables || [])
        .map(
          (responsable) =>
            `${responsable.prenom} ${responsable.nom} (${responsable.role_label ?? responsable.id_role})`,
        )
        .join(' | ');
      rows.push(
        [
          node.id_node,
          node.kind,
          node.id_entite ?? '',
          node.id_user ?? '',
          node.nom,
          node.type_entite ?? '',
          node.role_label ?? '',
          node.structure_nom ?? '',
          parentId ?? '',
          responsables,
          node.email_institutionnel ?? '',
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(','),
      );

      for (const child of node.children || []) {
        walk(child, node.id_node);
      }
    };

    walk(root, null);
    return `${header}\n${rows.join('\n')}`;
  }

  private buildLayout(root: ApiOrgNode): OrgChartLayout {
    const BOX_W = 200;
    const BOX_H = 54;
    const H_GAP = 28;
    const V_GAP = 60;
    const PAGE_MARGIN = 50;
    const HEADER_H = 60;

    const FILLS: [number, number, number][] = [
      [99, 102, 241],
      [59, 130, 246],
      [16, 185, 129],
      [245, 158, 11],
    ];

    const computeWidth = (node: ApiOrgNode): number => {
      const children = node.children ?? [];
      if (children.length === 0) return BOX_W;
      const childrenW = children.reduce(
        (sum, child) => sum + computeWidth(child),
        (children.length - 1) * H_GAP,
      );
      return Math.max(BOX_W, childrenW);
    };

    const layoutNodes: LayoutNode[] = [];

    const placeNode = (
      node: ApiOrgNode,
      level: number,
      leftEdge: number,
      subtreeW: number,
    ) => {
      const centerX = leftEdge + subtreeW / 2;
      const y = HEADER_H + level * (BOX_H + V_GAP);
      layoutNodes.push({ node, level, x: centerX, y, subtreeW });

      const children = node.children ?? [];
      if (children.length === 0) return;

      let cursor = leftEdge;
      for (const child of children) {
        const childWidth = computeWidth(child);
        placeNode(child, level + 1, cursor, childWidth);
        cursor += childWidth + H_GAP;
      }
    };

    const totalW = computeWidth(root);
    placeNode(root, 0, PAGE_MARGIN, totalW);

    const maxLevel = Math.max(...layoutNodes.map((node) => node.level));
    const canvasW = totalW + PAGE_MARGIN * 2;
    const canvasH = HEADER_H + (maxLevel + 1) * (BOX_H + V_GAP) + PAGE_MARGIN;

    return {
      layoutNodes,
      canvasW,
      canvasH,
      boxW: BOX_W,
      boxH: BOX_H,
      headerH: HEADER_H,
      vGap: V_GAP,
      pageMargin: PAGE_MARGIN,
      fills: FILLS,
    };
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private getNodeFill(layoutNode: LayoutNode, fills: [number, number, number][]): string {
    if (layoutNode.node.kind === 'personne') {
      return '#334155';
    }

    const [r, g, b] = fills[Math.min(layoutNode.level, fills.length - 1)];
    return `#${r.toString(16).padStart(2, '0')}${g
      .toString(16)
      .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private getNodeText(node: ApiOrgNode) {
    const title =
      node.nom.length > 28 ? `${node.nom.slice(0, 26)}...` : node.nom;

    if (node.kind === 'personne') {
      const roleLabel = node.role_label ?? 'Personne';
      const secondary =
        roleLabel.length > 34 ? `${roleLabel.slice(0, 32)}...` : roleLabel;
      const structureLabel = node.structure_nom ?? node.email_institutionnel ?? '';
      const tertiary =
        structureLabel.length > 34
          ? `${structureLabel.slice(0, 32)}...`
          : structureLabel;

      return {
        title,
        secondary,
        tertiary,
      };
    }

    const responsables = (node.responsables ?? [])
      .slice(0, 2)
      .map((resp) => `${resp.prenom} ${resp.nom}`)
      .join(', ');
    const tertiary =
      responsables.length > 34 ? `${responsables.slice(0, 32)}...` : responsables;

    return {
      title,
      secondary: node.type_entite ?? '',
      tertiary,
    };
  }

  private toSvg(root: ApiOrgNode, year: number): string {
    const {
      layoutNodes,
      canvasW,
      canvasH,
      boxW,
      boxH,
      headerH,
      vGap,
      pageMargin,
      fills,
    } = this.buildLayout(root);

    const parts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}" role="img" aria-label="Organigramme ${year}">`,
      `<rect width="${canvasW}" height="${canvasH}" fill="#ffffff"/>`,
      `<rect x="0" y="0" width="${canvasW}" height="${headerH}" fill="#4f46e5"/>`,
      `<text x="${pageMargin}" y="36" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700">Organigramme ${year}</text>`,
    ];

    for (const layoutNode of layoutNodes) {
      const parentBottomY = layoutNode.y + boxH;
      for (const child of layoutNode.node.children ?? []) {
        const childLayout = layoutNodes.find((node) => node.node === child);
        if (!childLayout) continue;
        const midY = parentBottomY + vGap / 2;
        parts.push(
          `<path d="M ${layoutNode.x} ${parentBottomY} L ${layoutNode.x} ${midY} L ${childLayout.x} ${midY} L ${childLayout.x} ${childLayout.y}" fill="none" stroke="#94a3b8" stroke-width="1.5"/>`,
        );
      }
    }

    for (const layoutNode of layoutNodes) {
      const boxX = layoutNode.x - boxW / 2;
      const { title, secondary, tertiary } = this.getNodeText(layoutNode.node);

      parts.push(
        `<rect x="${boxX + 2}" y="${layoutNode.y + 2}" width="${boxW}" height="${boxH}" rx="6" fill="#0f172a" fill-opacity="0.12"/>`,
      );
      parts.push(
        `<rect x="${boxX}" y="${layoutNode.y}" width="${boxW}" height="${boxH}" rx="6" fill="${this.getNodeFill(layoutNode, fills)}"/>`,
      );
      parts.push(
        `<text x="${boxX + 8}" y="${layoutNode.y + 18}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="700">${this.escapeXml(title)}</text>`,
      );
      parts.push(
        `<text x="${boxX + 8}" y="${layoutNode.y + 30}" fill="#ffffff" fill-opacity="0.8" font-family="Arial, Helvetica, sans-serif" font-size="7">${this.escapeXml(secondary)}</text>`,
      );
      if (tertiary) {
        parts.push(
          `<text x="${boxX + 8}" y="${layoutNode.y + 44}" fill="#e0e7ff" font-family="Arial, Helvetica, sans-serif" font-size="6.5">${this.escapeXml(tertiary)}</text>`,
        );
      }
    }

    parts.push('</svg>');
    return parts.join('');
  }

  private toPdf(root: ApiOrgNode, year: number): Promise<Buffer> {
    // ── layout constants ──────────────────────────────────────────────────
    const BOX_W = 200;
    const BOX_H = 54;
    const H_GAP = 28;   // horizontal gap between sibling subtrees
    const V_GAP = 60;   // vertical gap between levels
    const PAGE_MARGIN = 50;
    const HEADER_H = 60;

    // ── level colour palette (r,g,b fills) ───────────────────────────────
    const FILLS: [number, number, number][] = [
      [99,  102, 241],  // indigo  – level 0
      [59,  130, 246],  // blue    – level 1
      [16,  185, 129],  // green   – level 2
      [245, 158,  11],  // amber   – level 3+
    ];

    // ── 1. Compute subtree widths ─────────────────────────────────────────
    interface LayoutNode {
      node: ApiOrgNode;
      level: number;
      x: number;   // centre x
      y: number;   // top y
      subtreeW: number;
    }

    const computeWidth = (node: ApiOrgNode): number => {
      const children = node.children ?? [];
      if (children.length === 0) return BOX_W;
      const childrenW = children.reduce(
        (sum, c) => sum + computeWidth(c),
        (children.length - 1) * H_GAP,
      );
      return Math.max(BOX_W, childrenW);
    };

    const layoutNodes: LayoutNode[] = [];

    const placeNode = (
      node: ApiOrgNode,
      level: number,
      leftEdge: number,
      subtreeW: number,
    ) => {
      const cx = leftEdge + subtreeW / 2;
      const y = HEADER_H + level * (BOX_H + V_GAP);
      layoutNodes.push({ node, level, x: cx, y, subtreeW });

      const children = node.children ?? [];
      if (children.length === 0) return;

      // distribute children left → right
      let cursor = leftEdge;
      for (const child of children) {
        const cw = computeWidth(child);
        placeNode(child, level + 1, cursor, cw);
        cursor += cw + H_GAP;
      }
    };

    const totalW = computeWidth(root);
    placeNode(root, 0, PAGE_MARGIN, totalW);

    // ── 2. Compute canvas size ────────────────────────────────────────────
    const maxLevel = Math.max(...layoutNodes.map((n) => n.level));
    const canvasW = totalW + PAGE_MARGIN * 2;
    const canvasH = HEADER_H + (maxLevel + 1) * (BOX_H + V_GAP) + PAGE_MARGIN;

    // ── 3. Build PDF with PDFKit ──────────────────────────────────────────
    const doc = new PDFDocument({
      size: [canvasW, canvasH],
      margin: 0,
      info: { Title: `Organigramme ${year}` },
    });

    const chunks: Buffer[] = [];
    const pdfBuffer = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // header bar
    doc.rect(0, 0, canvasW, HEADER_H).fill('#4f46e5');
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(18)
      .text(`Organigramme ${year}`, PAGE_MARGIN, 18, { lineBreak: false });

    // draw edges first (behind boxes)
    doc.lineWidth(1.5).strokeColor('#94a3b8');
    for (const ln of layoutNodes) {
      const parentX = ln.x;
      const parentBottomY = ln.y + BOX_H;
      for (const child of ln.node.children ?? []) {
        const childLn = layoutNodes.find((n) => n.node === child);
        if (!childLn) continue;
        const childTopY = childLn.y;
        const midY = parentBottomY + V_GAP / 2;
        doc
          .moveTo(parentX, parentBottomY)
          .lineTo(parentX, midY)
          .lineTo(childLn.x, midY)
          .lineTo(childLn.x, childTopY)
          .stroke();
      }
    }

    // draw boxes
    for (const ln of layoutNodes) {
      const boxX = ln.x - BOX_W / 2;
      const { title, secondary, tertiary } = this.getNodeText(ln.node);

      // shadow-like border
      doc.roundedRect(boxX + 2, ln.y + 2, BOX_W, BOX_H, 6).fill('#00000015');
      // box fill
      doc.roundedRect(boxX, ln.y, BOX_W, BOX_H, 6).fill(this.getNodeFill(ln, FILLS));

      // entity or person label
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(title, boxX + 8, ln.y + 8, { width: BOX_W - 16, lineBreak: false });

      // secondary line (type or role)
      doc
        .fillColor('#ffffffcc')
        .font('Helvetica')
        .fontSize(7)
        .text(secondary, boxX + 8, ln.y + 23, { width: BOX_W - 16, lineBreak: false });

      // tertiary line (responsables or structure/email)
      if (tertiary) {
        doc
          .fillColor('#e0e7ff')
          .font('Helvetica')
          .fontSize(6.5)
          .text(tertiary, boxX + 8, ln.y + 37, { width: BOX_W - 16, lineBreak: false });
      }
    }

    doc.end();

    return pdfBuffer;
  }

  private isServicesCentraux(user: CurrentUser): boolean {
    return user.affectations.some(
      (affectation) => affectation.roleId === ROLE_IDS.SERVICES_CENTRAUX,
    );
  }

  private async canAccessEntiteInYear(
    user: CurrentUser,
    entiteId: string,
    yearId: string,
  ): Promise<boolean> {
    if (this.isServicesCentraux(user)) {
      return true;
    }

    const yearAffectations = user.affectations.filter(
      (affectation) => affectation.anneeId === yearId,
    );
    if (yearAffectations.length === 0) {
      return false;
    }

    const userEntites = new Set(
      yearAffectations.map((affectation) => affectation.entiteId),
    );
    if (userEntites.has(entiteId)) {
      return true;
    }

    let currentId: bigint;
    try {
      currentId = BigInt(entiteId);
    } catch {
      return false;
    }

    for (let depth = 0; depth < 32; depth += 1) {
      const entite = await this.prisma.entite_structure.findUnique({
        where: { id_entite: currentId },
        select: { id_entite_parent: true, id_annee: true },
      });

      if (!entite || String(entite.id_annee) !== yearId || !entite.id_entite_parent) {
        return false;
      }

      const parentId = String(entite.id_entite_parent);
      if (userEntites.has(parentId)) {
        return true;
      }

      currentId = entite.id_entite_parent;
    }

    return false;
  }
}
