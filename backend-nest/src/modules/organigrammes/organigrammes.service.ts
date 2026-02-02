import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

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

@Injectable()
export class OrganigrammesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(yearId?: number) {
    const items = await this.prisma.organigramme.findMany({
      where: yearId ? { id_annee: BigInt(yearId) } : undefined,
      orderBy: { generated_at: 'desc' },
    });

    return items.map((item) => this.mapOrganigramme(item));
  }

  async latest(yearId: number) {
    const organigramme = await this.prisma.organigramme.findFirst({
      where: { id_annee: BigInt(yearId) },
      orderBy: { generated_at: 'desc' },
    });

    const rootId = organigramme?.id_entite_racine
      ? Number(organigramme.id_entite_racine)
      : null;

    const arbre = await this.buildTree(yearId, rootId ?? undefined);
    return { organigramme: organigramme ? this.mapOrganigramme(organigramme) : null, arbre };
  }

  async getTreeById(id: string) {
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

    const arbre = await this.buildTree(
      Number(organigramme.id_annee),
      Number(organigramme.id_entite_racine),
    );

    return { organigramme: this.mapOrganigramme(organigramme), arbre };
  }

  async generate(yearId: number, rootId: number, userId: string) {
    const organigramme = await this.prisma.organigramme.create({
      data: {
        id_annee: BigInt(yearId),
        id_entite_racine: BigInt(rootId),
        generated_by: BigInt(userId),
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
      include: { utilisateur: true },
    });

    const responsablesMap = new Map<number, ApiResponsable[]>();
    affectations.forEach((affectation) => {
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
}
