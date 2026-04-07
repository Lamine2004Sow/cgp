import { EntiteStructure } from "../types";

export const HIERARCHY_LEVELS = [
  { key: "composanteId", label: "Composante", type: "COMPOSANTE" },
  { key: "departementId", label: "Département", type: "DEPARTEMENT" },
  { key: "mentionId", label: "Mention", type: "MENTION" },
  { key: "parcoursId", label: "Parcours", type: "PARCOURS" },
  { key: "niveauId", label: "Niveau", type: "NIVEAU" },
] as const;

export type HierarchyFilterKey = (typeof HIERARCHY_LEVELS)[number]["key"];
export type HierarchyEntiteType = (typeof HIERARCHY_LEVELS)[number]["type"];

export type HierarchyFilters = Record<HierarchyFilterKey, string>;

export const EMPTY_HIERARCHY_FILTERS: HierarchyFilters = {
  composanteId: "",
  departementId: "",
  mentionId: "",
  parcoursId: "",
  niveauId: "",
};

type HierarchyLineage = Partial<Record<HierarchyEntiteType, number>>;

const sortByName = (items: EntiteStructure[]) =>
  [...items].sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));

function getYearEntites(
  entites: EntiteStructure[],
  yearId?: string | number | null,
): EntiteStructure[] {
  if (yearId === undefined || yearId === null || yearId === "") {
    return entites;
  }

  const normalizedYearId = Number(yearId);
  return entites.filter((entite) => entite.id_annee === normalizedYearId);
}

function buildEntiteMap(entites: EntiteStructure[]): Map<number, EntiteStructure> {
  return new Map(entites.map((entite) => [entite.id_entite, entite]));
}

function getLineageForEntite(
  entiteId: number,
  entiteMap: Map<number, EntiteStructure>,
): HierarchyLineage {
  const lineage: HierarchyLineage = {};
  let current = entiteMap.get(entiteId);

  while (current) {
    const type = current.type_entite as HierarchyEntiteType;
    if (!lineage[type]) {
      lineage[type] = current.id_entite;
    }
    if (!current.id_entite_parent) {
      break;
    }
    current = entiteMap.get(current.id_entite_parent);
  }

  return lineage;
}

function matchesSelectedAncestors(
  lineage: HierarchyLineage,
  filters: HierarchyFilters,
  levelIndex: number,
): boolean {
  for (let index = 0; index < levelIndex; index += 1) {
    const level = HIERARCHY_LEVELS[index];
    const selectedId = filters[level.key];
    if (selectedId && lineage[level.type] !== Number(selectedId)) {
      return false;
    }
  }

  return true;
}

export function updateHierarchyFilters(
  current: HierarchyFilters,
  key: HierarchyFilterKey,
  value: string,
): HierarchyFilters {
  const next = { ...current };
  let shouldReset = false;

  for (const level of HIERARCHY_LEVELS) {
    if (level.key === key) {
      next[level.key] = value;
      shouldReset = true;
      continue;
    }

    if (shouldReset) {
      next[level.key] = "";
    }
  }

  return next;
}

export function getHierarchyOptions(
  entites: EntiteStructure[],
  filters: HierarchyFilters,
  yearId?: string | number | null,
): Record<HierarchyFilterKey, EntiteStructure[]> {
  const scopedEntites = getYearEntites(entites, yearId);
  const entiteMap = buildEntiteMap(scopedEntites);
  const lineageCache = new Map<number, HierarchyLineage>();

  const getLineage = (entiteId: number) => {
    const cached = lineageCache.get(entiteId);
    if (cached) {
      return cached;
    }
    const lineage = getLineageForEntite(entiteId, entiteMap);
    lineageCache.set(entiteId, lineage);
    return lineage;
  };

  const entries = HIERARCHY_LEVELS.map((level, levelIndex) => {
    const options = scopedEntites.filter((entite) => {
      if (entite.type_entite !== level.type) {
        return false;
      }

      return matchesSelectedAncestors(getLineage(entite.id_entite), filters, levelIndex);
    });

    return [level.key, sortByName(options)] as const;
  });

  return Object.fromEntries(entries) as Record<HierarchyFilterKey, EntiteStructure[]>;
}

export function matchesEntiteHierarchy(
  entites: EntiteStructure[],
  entiteId: number,
  filters: HierarchyFilters,
  yearId?: string | number | null,
): boolean {
  const scopedEntites = getYearEntites(entites, yearId);
  const entiteMap = buildEntiteMap(scopedEntites);
  const lineage = getLineageForEntite(entiteId, entiteMap);

  return HIERARCHY_LEVELS.every((level) => {
    const selectedId = filters[level.key];
    return !selectedId || lineage[level.type] === Number(selectedId);
  });
}

export function getDeepestSelectedEntiteId(filters: HierarchyFilters): number | null {
  for (let index = HIERARCHY_LEVELS.length - 1; index >= 0; index -= 1) {
    const selectedId = filters[HIERARCHY_LEVELS[index].key];
    if (selectedId) {
      return Number(selectedId);
    }
  }

  return null;
}

export function getDescendantEntiteIds(
  entites: EntiteStructure[],
  rootId: number,
  options?: { includeSelf?: boolean; yearId?: string | number | null },
): Set<number> {
  const includeSelf = options?.includeSelf ?? true;
  const scopedEntites = getYearEntites(entites, options?.yearId);
  const byParent = new Map<number, number[]>();

  scopedEntites.forEach((entite) => {
    if (!entite.id_entite_parent) {
      return;
    }
    const children = byParent.get(entite.id_entite_parent) ?? [];
    children.push(entite.id_entite);
    byParent.set(entite.id_entite_parent, children);
  });

  const ids = new Set<number>();
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (currentId === undefined) {
      continue;
    }
    if (currentId !== rootId || includeSelf) {
      ids.add(currentId);
    }
    (byParent.get(currentId) ?? []).forEach((childId) => queue.push(childId));
  }

  return ids;
}

export function getFilteredEntites(
  entites: EntiteStructure[],
  filters: HierarchyFilters,
  yearId?: string | number | null,
): EntiteStructure[] {
  return getYearEntites(entites, yearId).filter((entite) =>
    matchesEntiteHierarchy(entites, entite.id_entite, filters, yearId),
  );
}
