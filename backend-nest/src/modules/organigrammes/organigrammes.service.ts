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
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  id_role: string;
}

export interface ApiOrgNode {
  id_entite: number;
  nom: string;
  type_entite: string;
  children?: ApiOrgNode[];
  responsables?: ApiResponsable[];
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

function shouldDisplayInOrgChart(roleId: string, roleLabel?: string | null): boolean {
  if (HIDDEN_ORG_ROLE_IDS.has(roleId)) {
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

  async latest(user: CurrentUser, yearId: number) {
    const items = await this.list(user, yearId);
    const organigramme = items[0] ?? null;

    const rootId = organigramme?.id_entite_racine ?? null;

    const arbre = await this.buildTree(yearId, rootId ?? undefined);
    return { organigramme: organigramme ?? null, arbre };
  }

  async getTreeById(user: CurrentUser, id: string) {
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

  async export(user: CurrentUser, id: string, format: string) {
    const { organigramme, arbre } = await this.getTreeById(user, id);
    if (!arbre) {
      throw new NotFoundException('Organigramme tree not found');
    }

    const normalizedFormat = (format || 'PDF').toUpperCase();
    let fileName = `organigramme-${organigramme.id_annee}-${organigramme.id_organigramme}`;
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

  private async buildTree(yearId: number, rootId?: number): Promise<ApiOrgNode | null> {
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

    const entiteIds = Array.from(nodes.keys());
    const affectations = await this.prisma.affectation.findMany({
      where: {
        id_annee: BigInt(yearId),
        id_entite: { in: entiteIds.map((id) => BigInt(id)) },
      },
      include: {
        utilisateur: true,
        role: { select: { libelle: true } },
      },
    });

    const responsablesMap = new Map<number, ApiResponsable[]>();
    affectations.forEach((affectation) => {
      if (!shouldDisplayInOrgChart(affectation.id_role, affectation.role?.libelle)) {
        return;
      }

      const key = Number(affectation.id_entite);
      const list = responsablesMap.get(key) ?? [];
      list.push({
        nom: affectation.utilisateur.nom,
        prenom: affectation.utilisateur.prenom,
        email_institutionnel: affectation.utilisateur.email_institutionnel,
        id_role: affectation.id_role,
      });
      responsablesMap.set(key, list);
    });

    responsablesMap.forEach((responsables, entiteId) => {
      const node = nodes.get(entiteId);
      if (node) {
        node.responsables = responsables;
      }
    });

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
    const header = ['id_entite', 'nom', 'type_entite', 'parent_entite', 'responsables'].join(',');
    const rows: string[] = [];

    const walk = (node: ApiOrgNode, parentId: number | null) => {
      const responsables = (node.responsables || [])
        .map((responsable) => `${responsable.prenom} ${responsable.nom} (${responsable.id_role})`)
        .join(' | ');
      rows.push(
        [
          node.id_entite,
          node.nom,
          node.type_entite,
          parentId ?? '',
          responsables,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(','),
      );

      for (const child of node.children || []) {
        walk(child, node.id_entite);
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
      const [r, g, b] = fills[Math.min(layoutNode.level, fills.length - 1)];
      const boxX = layoutNode.x - boxW / 2;
      const label =
        layoutNode.node.nom.length > 28
          ? `${layoutNode.node.nom.slice(0, 26)}...`
          : layoutNode.node.nom;
      const responsables = (layoutNode.node.responsables ?? [])
        .slice(0, 2)
        .map((resp) => `${resp.prenom} ${resp.nom}`)
        .join(', ');
      const respLabel =
        responsables.length > 34 ? `${responsables.slice(0, 32)}...` : responsables;

      parts.push(
        `<rect x="${boxX + 2}" y="${layoutNode.y + 2}" width="${boxW}" height="${boxH}" rx="6" fill="#0f172a" fill-opacity="0.12"/>`,
      );
      parts.push(
        `<rect x="${boxX}" y="${layoutNode.y}" width="${boxW}" height="${boxH}" rx="6" fill="rgb(${r}, ${g}, ${b})"/>`,
      );
      parts.push(
        `<text x="${boxX + 8}" y="${layoutNode.y + 18}" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="700">${this.escapeXml(label)}</text>`,
      );
      parts.push(
        `<text x="${boxX + 8}" y="${layoutNode.y + 30}" fill="#ffffff" fill-opacity="0.8" font-family="Arial, Helvetica, sans-serif" font-size="7">${this.escapeXml(layoutNode.node.type_entite)}</text>`,
      );
      if (respLabel) {
        parts.push(
          `<text x="${boxX + 8}" y="${layoutNode.y + 44}" fill="#e0e7ff" font-family="Arial, Helvetica, sans-serif" font-size="6.5">${this.escapeXml(respLabel)}</text>`,
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
      const [r, g, b] = FILLS[Math.min(ln.level, FILLS.length - 1)];
      const fill = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      const boxX = ln.x - BOX_W / 2;

      // shadow-like border
      doc.roundedRect(boxX + 2, ln.y + 2, BOX_W, BOX_H, 6).fill('#00000015');
      // box fill
      doc.roundedRect(boxX, ln.y, BOX_W, BOX_H, 6).fill(fill);

      // entity name (white, bold, truncated)
      const label = ln.node.nom.length > 28 ? `${ln.node.nom.slice(0, 26)}…` : ln.node.nom;
      doc
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(label, boxX + 8, ln.y + 8, { width: BOX_W - 16, lineBreak: false });

      // type badge text
      doc
        .fillColor('#ffffffcc')
        .font('Helvetica')
        .fontSize(7)
        .text(ln.node.type_entite, boxX + 8, ln.y + 23, { width: BOX_W - 16, lineBreak: false });

      // responsables (up to 2)
      const resps = ln.node.responsables ?? [];
      if (resps.length > 0) {
        const respLine = resps
          .slice(0, 2)
          .map((r) => `${r.prenom} ${r.nom}`)
          .join(', ');
        const truncated = respLine.length > 34 ? `${respLine.slice(0, 32)}…` : respLine;
        doc
          .fillColor('#e0e7ff')
          .font('Helvetica')
          .fontSize(6.5)
          .text(truncated, boxX + 8, ln.y + 37, { width: BOX_W - 16, lineBreak: false });
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
