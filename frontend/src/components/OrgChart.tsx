import { useEffect, useMemo, useState } from "react";
import { User, UserRole, AcademicYear, EntiteStructure, canGenerateOrgChart } from "../types";
import { Download, GitBranch, Lock, Unlock, FileDown, Eye } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  EMPTY_HIERARCHY_FILTERS,
  HIERARCHY_LEVELS,
  type HierarchyFilters,
  getDeepestSelectedEntiteId,
  getDescendantEntiteIds,
  getHierarchyOptions,
  updateHierarchyFilters,
} from "../lib/entite-hierarchy";

interface OrgChartProps {
  userRole: UserRole;
  currentYear: AcademicYear;
  authLogin: string | null;
  entites: EntiteStructure[];
  currentUser: User;
}

type ApiOrganigramme = {
  id_organigramme: number;
  id_annee: number;
  id_entite_racine: number;
  generated_by: number;
  generated_at: string;
  est_fige: boolean;
};

type ApiResponsable = {
  id_user?: number;
  id_affectation?: number;
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  id_role: string;
  role_label?: string | null;
  id_entite?: number;
  entite_nom?: string | null;
};

type ApiOrgNode = {
  id_node: string;
  kind: "structure" | "personne";
  id_entite: number | null;
  id_user?: number | null;
  nom: string;
  type_entite: string | null;
  role_label?: string | null;
  structure_nom?: string | null;
  email_institutionnel?: string | null;
  email_secondaire?: string | null;
  hierarchy_level?: number | null;
  children?: ApiOrgNode[];
  responsables?: ApiResponsable[];
};

type ExportFormat = "PDF" | "CSV" | "JSON" | "SVG" | "PNG";
type OrgChartViewMode = "structures" | "personnes";
type ApiRole = { id: string; libelle: string };

const HIERARCHY_EMPTY_LABELS: Record<keyof HierarchyFilters, string> = {
  composanteId: "Toutes les composantes",
  departementId: "Tous les départements",
  mentionId: "Toutes les mentions",
  parcoursId: "Tous les parcours",
  niveauId: "Tous les niveaux",
};

const levelLabel = (type: string | null) => {
  if (!type) return "Nœud";
  const normalized = type.toLowerCase();
  if (normalized === "composante") return "Composante";
  if (normalized === "departement") return "Département";
  if (normalized === "mention") return "Mention";
  if (normalized === "parcours") return "Parcours";
  if (normalized === "niveau") return "Niveau";
  if (normalized === "personne") return "Personne";
  return type;
};

export function OrgChart({ userRole, currentYear, authLogin, entites, currentUser }: OrgChartProps) {
  const [selectedRoot, setSelectedRoot] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [rootSearch, setRootSearch] = useState("");
  const [viewMode, setViewMode] = useState<OrgChartViewMode>("structures");
  const [personSearch, setPersonSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [hierarchyFilters, setHierarchyFilters] = useState<HierarchyFilters>(EMPTY_HIERARCHY_FILTERS);
  const [tree, setTree] = useState<ApiOrgNode | null>(null);
  const [orgaMeta, setOrgaMeta] = useState<ApiOrganigramme | null>(null);
  const [organigrammes, setOrganigrammes] = useState<ApiOrganigramme[]>([]);
  const [selectedOrgaId, setSelectedOrgaId] = useState<string>("");
  const [generatedSearch, setGeneratedSearch] = useState("");
  const [generatedTypeFilter, setGeneratedTypeFilter] = useState<string>("ALL");
  const [generatedStatusFilter, setGeneratedStatusFilter] = useState<"ALL" | "ACTIVE" | "FROZEN">("ALL");
  const [generatedVisibleCount, setGeneratedVisibleCount] = useState<"5" | "10" | "20" | "ALL">("5");
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = canGenerateOrgChart(userRole);
  const canFreeze = userRole === "services-centraux";
  const canGenerateAllRoots = userRole === "services-centraux";

  const entiteMap = useMemo(() => {
    const map = new Map<number, EntiteStructure>();
    entites.forEach((entite) => map.set(entite.id_entite, entite));
    return map;
  }, [entites]);
  const hierarchyOptions = useMemo(
    () => getHierarchyOptions(entites, hierarchyFilters, currentYear.id),
    [entites, hierarchyFilters, currentYear.id],
  );

  const isDescendant = (candidateId: number, ancestorId: number): boolean => {
    let current = entiteMap.get(candidateId);
    while (current) {
      if (current.id_entite === ancestorId) return true;
      if (!current.id_entite_parent) break;
      current = entiteMap.get(current.id_entite_parent);
    }
    return false;
  };

  const rootOptions = useMemo(() => {
    const byYear = entites.filter((entite) => entite.id_annee === Number(currentYear.id));
    const filteredByType = (
      selectedType === "ALL" ? byYear : byYear.filter((entite) => entite.type_entite === selectedType)
    ).filter((entite) => {
      const normalizedSearch = rootSearch.trim().toLowerCase();
      if (!normalizedSearch) return true;
      return (
        entite.nom.toLowerCase().includes(normalizedSearch) ||
        String(entite.id_entite).includes(normalizedSearch) ||
        entite.code_composante?.toLowerCase().includes(normalizedSearch)
      );
    });
    if (canGenerateAllRoots) return filteredByType;

    const allowedRoots = currentUser.roles
      .filter((role) => role.year === currentYear.year)
      .map((role) => role.entiteId);

    if (allowedRoots.length === 0) return [];

    return filteredByType.filter((entite) =>
      allowedRoots.some((allowedId) => isDescendant(entite.id_entite, allowedId)),
    );
  }, [canGenerateAllRoots, entites, currentYear.id, selectedType, currentUser.roles, currentYear.year, entiteMap, rootSearch]);

  useEffect(() => {
    if (rootOptions.length && !selectedRoot) {
      setSelectedRoot(String(rootOptions[0].id_entite));
    }
    if (!rootOptions.find((entite) => String(entite.id_entite) === selectedRoot)) {
      setSelectedRoot(rootOptions[0]?.id_entite ? String(rootOptions[0].id_entite) : "");
    }
  }, [rootOptions, selectedRoot]);

  const filteredEntiteIds = useMemo(() => {
    const deepestEntiteId = getDeepestSelectedEntiteId(hierarchyFilters);
    if (!deepestEntiteId) {
      return "";
    }

    return Array.from(
      getDescendantEntiteIds(entites, deepestEntiteId, { yearId: currentYear.id }),
    ).join(",");
  }, [currentYear.id, entites, hierarchyFilters]);

  const buildTreeQuery = (targetViewMode: OrgChartViewMode = viewMode) => {
    const params = new URLSearchParams();
    params.set("view", targetViewMode === "personnes" ? "PERSONNES" : "STRUCTURES");
    if (targetViewMode === "personnes") {
      if (personSearch.trim()) params.set("q", personSearch.trim());
      if (roleFilter) params.set("roleId", roleFilter);
      if (filteredEntiteIds) params.set("entiteIds", filteredEntiteIds);
    }
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  useEffect(() => {
    if (!authLogin) return;
    apiFetch<ApiRole[] | { items: ApiRole[] }>("/roles", { login: authLogin })
      .then((data) => setRoles(Array.isArray(data) ? data : data.items || []))
      .catch(() => setRoles([]));
  }, [authLogin]);

  const loadOrganigrammesList = async () => {
    if (!authLogin) return [];
    const orgaList = await apiFetch<{ items: ApiOrganigramme[] }>(
      `/organigrammes?yearId=${currentYear.id}`,
      { login: authLogin },
    );
    setOrganigrammes(orgaList.items || []);
    return orgaList.items || [];
  };

  const loadLatest = async () => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      await loadOrganigrammesList();

      const data = await apiFetch<{ organigramme: ApiOrganigramme | null; arbre: ApiOrgNode | null }>(
        `/organigrammes/latest?yearId=${currentYear.id}&${buildTreeQuery().replace(/^\?/, "")}`,
        { login: authLogin },
      );
      setTree(data.arbre || null);
      setOrgaMeta(data.organigramme || null);
      setSelectedOrgaId(
        data.organigramme ? String(data.organigramme.id_organigramme) : "",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
      setTree(null);
      setOrgaMeta(null);
      setSelectedOrgaId("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLatest();
  }, [authLogin, currentYear.id]);

  const handleGenerate = async () => {
    if (!authLogin || !selectedRoot) return;
    setLoading(true);
    setError(null);
    try {
      const generated = await apiFetch<{ organigramme: ApiOrganigramme; arbre: ApiOrgNode }>(
        "/organigrammes/generate",
        {
          method: "POST",
          body: JSON.stringify({
            id_annee: Number(currentYear.id),
            id_entite_racine: Number(selectedRoot),
          }),
          login: authLogin,
        },
      );
      setSelectedOrgaId(String(generated.organigramme.id_organigramme));
      await loadOrganigrammesList();
      await handleLoadOrganigramme(String(generated.organigramme.id_organigramme));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la generation");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadOrganigramme = async (orgaId: string) => {
    if (!authLogin || !orgaId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ organigramme: ApiOrganigramme; arbre: ApiOrgNode | null }>(
        `/organigrammes/${orgaId}/tree${buildTreeQuery()}`,
        { login: authLogin },
      );
      setTree(data.arbre || null);
      setOrgaMeta(data.organigramme || null);
      setSelectedOrgaId(orgaId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGeneratedOrganigramme = async (
    organigramme: ApiOrganigramme,
    targetViewMode: OrgChartViewMode,
  ) => {
    if (!authLogin) return;
    const canReuseAsGenerationRoot = rootOptions.some(
      (entite) => entite.id_entite === organigramme.id_entite_racine,
    );
    if (canReuseAsGenerationRoot) {
      setSelectedRoot(String(organigramme.id_entite_racine));
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ organigramme: ApiOrganigramme; arbre: ApiOrgNode | null }>(
        `/organigrammes/${organigramme.id_organigramme}/tree${buildTreeQuery(targetViewMode)}`,
        { login: authLogin },
      );
      setTree(data.arbre || null);
      setOrgaMeta(data.organigramme || null);
      setSelectedOrgaId(String(organigramme.id_organigramme));
      setViewMode(targetViewMode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  /** Charge un organigramme existant sans générer : pour la racine sélectionnée si disponible, sinon le dernier généré. */
  const handleViewOrganigramme = async () => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      const rootId = selectedRoot ? Number(selectedRoot) : null;
      const existingForRoot =
        rootId != null
          ? organigrammes.find((o) => o.id_entite_racine === rootId)
          : null;
      if (existingForRoot) {
        await handleLoadOrganigramme(String(existingForRoot.id_organigramme));
      } else {
        await loadLatest();
        if (organigrammes.length > 0 && rootId != null) {
          setError(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleSetFreezeState = async (
    organigrammeId: number,
    estFige: boolean,
  ) => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ organigramme: ApiOrganigramme }>(
        `/organigrammes/${organigrammeId}/freeze`,
        {
          method: "PATCH",
          body: JSON.stringify({ est_fige: estFige }),
          login: authLogin,
        },
      );
      setOrganigrammes((prev) =>
        prev.map((item) =>
          item.id_organigramme === data.organigramme.id_organigramme
            ? data.organigramme
            : item,
        ),
      );
      if (orgaMeta?.id_organigramme === data.organigramme.id_organigramme) {
        setOrgaMeta(data.organigramme);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : estFige
            ? "Erreur lors du gel"
            : "Erreur lors du dégel",
      );
    } finally {
      setLoading(false);
    }
  };

  const decodeBase64 = (contentBase64: string) => {
    const binary = atob(contentBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const svgToPngBlob = async (svgText: string) => {
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Impossible de convertir le SVG en PNG"));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;

      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas indisponible pour l'export PNG");
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Impossible de générer le PNG"));
        }, "image/png");
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!authLogin || !orgaMeta) return;
    setExportLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{
        fileName: string;
        mimeType: string;
        contentBase64: string;
      }>(`/organigrammes/${orgaMeta.id_organigramme}/export?format=${format === "PNG" ? "SVG" : format}&${buildTreeQuery().replace(/^\?/, "")}`, {
        login: authLogin,
      });

      const bytes = decodeBase64(data.contentBase64);

      if (format === "PNG") {
        const svgText = new TextDecoder().decode(bytes);
        const pngBlob = await svgToPngBlob(svgText);
        const pngFileName = data.fileName.replace(/\.svg$/i, ".png");
        downloadBlob(pngBlob, pngFileName);
        return;
      }

      downloadBlob(new Blob([bytes], { type: data.mimeType }), data.fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur export");
    } finally {
      setExportLoading(false);
    }
  };

  const isGenerated = Boolean(orgaMeta);
  const isFrozen = orgaMeta?.est_fige || false;

  const currentGeneratedOrganigramme = useMemo(
    () =>
      organigrammes.find((organigramme) => String(organigramme.id_organigramme) === selectedOrgaId) ??
      orgaMeta ??
      null,
    [organigrammes, orgaMeta, selectedOrgaId],
  );
  const generatedOrganigrammes = useMemo(() => {
    const normalizedSearch = generatedSearch.trim().toLowerCase();

    return organigrammes
      .map((organigramme) => {
        const rootEntite = entiteMap.get(organigramme.id_entite_racine);
        return {
          ...organigramme,
          rootEntite,
          rootName: rootEntite?.nom ?? `Racine ${organigramme.id_entite_racine}`,
          rootType: rootEntite?.type_entite ?? null,
          rootCode: rootEntite?.code_composante ?? null,
        };
      })
      .filter((organigramme) => {
        if (
          generatedTypeFilter !== "ALL" &&
          organigramme.rootType !== generatedTypeFilter
        ) {
          return false;
        }

        if (
          generatedStatusFilter === "FROZEN" &&
          !organigramme.est_fige
        ) {
          return false;
        }

        if (
          generatedStatusFilter === "ACTIVE" &&
          organigramme.est_fige
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return (
          organigramme.rootName.toLowerCase().includes(normalizedSearch) ||
          String(organigramme.id_entite_racine).includes(normalizedSearch) ||
          String(organigramme.id_organigramme).includes(normalizedSearch) ||
          (organigramme.rootCode || "").toLowerCase().includes(normalizedSearch)
        );
      });
  }, [entiteMap, generatedSearch, generatedStatusFilter, generatedTypeFilter, organigrammes]);

  const visibleGeneratedOrganigrammes = useMemo(() => {
    if (generatedVisibleCount === "ALL") {
      return generatedOrganigrammes;
    }

    return generatedOrganigrammes.slice(0, Number(generatedVisibleCount));
  }, [generatedOrganigrammes, generatedVisibleCount]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-slate-900 mb-2">Organigramme — {currentYear.year}</h2>
        <p className="text-slate-600">
          Visualisez et exportez les organigrammes de structures, ainsi qu’une vue personnes avec rôles et rattachements filtrables.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-slate-900 mb-4">Contrôles de l'organigramme</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="text-sm text-slate-600 mb-2">Organigramme généré ?</div>
            <div className="flex flex-col gap-1">
              {isGenerated ? (
                <>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium w-fit">
                    Oui
                  </span>
                  {orgaMeta?.generated_at && (
                    <span className="text-xs text-slate-500">
                      Dernier généré le {new Date(orgaMeta.generated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                    </span>
                  )}
                </>
              ) : (
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium w-fit">
                  Non
                </span>
              )}
            </div>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="text-sm text-slate-600 mb-2">Organigramme figé ?</div>
            <div className="flex items-center gap-2">
              {isFrozen ? (
                <>
                  <Lock className="w-5 h-5 text-red-600" />
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    Oui
                  </span>
                </>
              ) : (
                <>
                  <Unlock className="w-5 h-5 text-green-600" />
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Non
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="text-sm text-slate-600 mb-2">Portée de génération</div>
            <div className="text-sm text-slate-900 font-medium">
              {canGenerate
                ? canGenerateAllRoots
                  ? "Toutes les structures"
                  : "Votre structure et ses sous-structures"
                : "Consultation seule"}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Vue affichée
            </label>
            <div className="flex flex-wrap gap-2">
              {([
                { id: "structures", label: "Structures" },
                { id: "personnes", label: "Personnes" },
              ] as const).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    if (currentGeneratedOrganigramme) {
                      handleOpenGeneratedOrganigramme(currentGeneratedOrganigramme, mode.id);
                      return;
                    }
                    setViewMode(mode.id);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    viewMode === mode.id
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Recherche racine
              </label>
              <input
                type="text"
                value={rootSearch}
                onChange={(e) => setRootSearch(e.target.value)}
                placeholder="Nom, code ou ID de structure..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Filtrer par type de structure
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="ALL">Toutes</option>
                <option value="COMPOSANTE">Composante</option>
                <option value="DEPARTEMENT">Département</option>
                <option value="MENTION">Mention</option>
                <option value="PARCOURS">Parcours</option>
                <option value="NIVEAU">Niveau</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Sélectionner la structure racine
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Cette liste est limitée aux structures que vous pouvez générer. Pour consulter d’autres organigrammes déjà créés, utilisez la bibliothèque ci-dessous.
            </p>
            <select
              value={selectedRoot}
              onChange={(e) => setSelectedRoot(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              {rootOptions.length === 0 && <option value="">Aucune structure</option>}
              {rootOptions.map((entite) => (
                <option key={entite.id_entite} value={entite.id_entite}>
                  #{entite.id_entite} — {entite.nom} ({entite.type_entite})
                </option>
              ))}
            </select>
          </div>

          {viewMode === "personnes" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Recherche personne
                  </label>
                  <input
                    type="text"
                    value={personSearch}
                    onChange={(e) => setPersonSearch(e.target.value)}
                    placeholder="Nom, login, rôle, email ou ID..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Rôle
                  </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="">Tous les rôles</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.libelle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                {HIERARCHY_LEVELS.map((level) => {
                  const options = hierarchyOptions[level.key];
                  return (
                    <div key={level.key}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {level.label}
                      </label>
                      <select
                        value={hierarchyFilters[level.key]}
                        onChange={(e) =>
                          setHierarchyFilters((prev) =>
                            updateHierarchyFilters(prev, level.key, e.target.value),
                          )
                        }
                        disabled={options.length === 0}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        <option value="">{HIERARCHY_EMPTY_LABELS[level.key]}</option>
                        {options.map((entite) => (
                          <option key={entite.id_entite} value={entite.id_entite}>
                            {entite.type_entite === "COMPOSANTE" && entite.code_composante
                              ? `${entite.nom} (${entite.code_composante})`
                              : entite.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleViewOrganigramme}
              disabled={loading || organigrammes.length === 0}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
              title={
                organigrammes.length === 0
                  ? "Aucun organigramme enregistré pour cette année"
                  : "Charger un organigramme déjà généré et appliquer les filtres courants"
              }
            >
              <Eye className="w-5 h-5" />
              Afficher / appliquer les filtres
            </button>
            {canGenerate && (
              <button
                onClick={() => {
                  if (!selectedRoot) {
                    setError("Sélectionnez une structure racine");
                    return;
                  }
                  handleGenerate();
                }}
                disabled={loading || !selectedRoot}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                <GitBranch className="w-5 h-5" />
                Générer l'organigramme
              </button>
            )}
            {tree && canFreeze && orgaMeta && (
              <button
                onClick={() => handleSetFreezeState(orgaMeta.id_organigramme, !isFrozen)}
                disabled={loading}
                className={`px-6 py-2 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 ${
                  isFrozen
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isFrozen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                {isFrozen ? "Défiger l'organigramme" : "Figer l'organigramme"}
              </button>
            )}
          </div>
        </div>

        {isFrozen && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>Organigramme figé :</strong> vous pouvez le défiger ou générer une nouvelle version si nécessaire.
            </p>
          </div>
        )}

        {!canGenerate && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
            <p className="text-sm text-orange-800">
              <strong>Génération non autorisée :</strong> Vous pouvez consulter l’existant, y compris la vue personnes filtrée.
            </p>
            {organigrammes.length > 0 && (
              <button
                onClick={handleViewOrganigramme}
                disabled={loading}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 text-sm"
                title="Charger le dernier organigramme généré"
              >
                <Eye className="w-4 h-4" />
                Voir l'organigramme
              </button>
            )}
          </div>
        )}
      </div>

      {tree ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 overflow-x-auto">
          {viewMode === "personnes" && tree.kind !== "personne" ? (
            <div className="min-w-max pb-6 flex gap-8">
              {(tree.children ?? []).map((child) => (
                <OrgNode key={child.id_node} node={child} level={0} />
              ))}
            </div>
          ) : (
            <div className="min-w-max pb-6"><OrgNode node={tree} level={0} /></div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 text-slate-600">
            <FileDown className="w-5 h-5" />
            {viewMode === "personnes"
              ? "Aucune donnée personne ne correspond aux filtres courants."
              : "Aucun organigramme généré pour cette année."}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <h3 className="text-slate-900">Organigrammes déjà générés</h3>
              <p className="text-sm text-slate-500 mt-1">
                Retrouvez rapidement un organigramme existant, filtrez la liste, puis ouvrez-le directement en vue structures ou personnes.
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-2">
              <div className="text-sm text-slate-500">
                {visibleGeneratedOrganigrammes.length} visibles sur {generatedOrganigrammes.length} résultat(s) filtré(s) et {organigrammes.length} au total
              </div>
              <div className="w-full md:w-40">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre visible
                </label>
                <select
                  value={generatedVisibleCount}
                  onChange={(e) =>
                    setGeneratedVisibleCount(
                      e.target.value as "5" | "10" | "20" | "ALL",
                    )
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="ALL">Tous</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Recherche rapide
              </label>
              <input
                type="text"
                value={generatedSearch}
                onChange={(e) => setGeneratedSearch(e.target.value)}
                placeholder="Nom, code, ID racine ou ID organigramme..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type de racine
              </label>
              <select
                value={generatedTypeFilter}
                onChange={(e) => setGeneratedTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="ALL">Tous les types</option>
                <option value="COMPOSANTE">Composante</option>
                <option value="DEPARTEMENT">Département</option>
                <option value="MENTION">Mention</option>
                <option value="PARCOURS">Parcours</option>
                <option value="NIVEAU">Niveau</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Statut
              </label>
              <select
                value={generatedStatusFilter}
                onChange={(e) =>
                  setGeneratedStatusFilter(e.target.value as "ALL" | "ACTIVE" | "FROZEN")
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="ALL">Tous</option>
                <option value="ACTIVE">Non figés</option>
                <option value="FROZEN">Figés</option>
              </select>
            </div>
          </div>
        </div>

        {organigrammes.length === 0 && (
          <div className="text-sm text-slate-500">Aucun organigramme généré pour cette année.</div>
        )}
        {organigrammes.length > 0 && generatedOrganigrammes.length === 0 && (
          <div className="text-sm text-slate-500">
            Aucun organigramme ne correspond aux filtres de cette bibliothèque.
          </div>
        )}
        {generatedOrganigrammes.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {visibleGeneratedOrganigrammes.map((organigramme) => {
              const isCurrent = selectedOrgaId === String(organigramme.id_organigramme);
              return (
                <div
                  key={organigramme.id_organigramme}
                  className={`rounded-xl border p-4 transition-colors ${
                    isCurrent
                      ? "border-indigo-300 bg-indigo-50/60"
                      : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="text-base font-semibold text-slate-900">
                        {organigramme.rootName}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        #{organigramme.id_entite_racine} · {levelLabel(organigramme.rootType)}
                        {organigramme.rootCode ? ` · code ${organigramme.rootCode}` : ""}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        organigramme.est_fige
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {organigramme.est_fige ? "Figé" : "Disponible"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                    <div className="rounded-lg bg-white border border-slate-200 p-3">
                      <div className="text-slate-500 text-xs mb-1">Généré le</div>
                      <div className="text-slate-900 font-medium">
                        {new Date(organigramme.generated_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 p-3">
                      <div className="text-slate-500 text-xs mb-1">Identifiant</div>
                      <div className="text-slate-900 font-medium">
                        Organigramme #{organigramme.id_organigramme}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenGeneratedOrganigramme(organigramme, "structures")}
                      disabled={loading}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm transition-colors disabled:opacity-60"
                    >
                      Voir en structures
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenGeneratedOrganigramme(organigramme, "personnes")}
                      disabled={loading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors disabled:opacity-60"
                    >
                      Voir en personnes
                    </button>
                    {canFreeze && (
                      <button
                        type="button"
                        onClick={() =>
                          handleSetFreezeState(
                            organigramme.id_organigramme,
                            !organigramme.est_fige,
                          )
                        }
                        disabled={loading}
                        className={`px-4 py-2 text-white rounded-lg text-sm transition-colors disabled:opacity-60 ${
                          organigramme.est_fige
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {organigramme.est_fige ? "Défiger" : "Figer"}
                      </button>
                    )}
                    {isCurrent && (
                      <span className="px-3 py-2 text-xs rounded-lg bg-white border border-indigo-200 text-indigo-700">
                        Organigramme actuellement affiché
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-slate-900 mb-4">Exports</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {(["PDF", "PNG", "SVG", "CSV", "JSON"] as const).map((format) => (
            <button
              key={format}
              onClick={() => {
                handleExport(format);
              }}
              disabled={!orgaMeta || exportLoading}
              className="p-4 border-2 border-slate-200 rounded-lg text-left text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-6 h-6 mb-2" />
              Export {format}
              <div className="text-xs text-slate-400">
                {!orgaMeta
                  ? "Générez un organigramme d'abord"
                  : "Export disponible"}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrgNode({ node, level = 0 }: { node: ApiOrgNode; level?: number }) {
  const [expanded, setExpanded] = useState(true);
  const [hovered, setHovered] = useState(false);
  const isPersonNode = node.kind === "personne";

  const colorVariants: Record<number, { box: string; badge: string; connector: string }> = {
    0: { box: "bg-indigo-600 border-indigo-700 text-white",   badge: "bg-indigo-800/40 text-indigo-100", connector: "#6366f1" },
    1: { box: "bg-blue-500 border-blue-600 text-white",       badge: "bg-blue-700/40 text-blue-100",    connector: "#3b82f6" },
    2: { box: "bg-emerald-500 border-emerald-600 text-white", badge: "bg-emerald-700/40 text-emerald-100", connector: "#10b981" },
    3: { box: "bg-amber-500 border-amber-600 text-white",     badge: "bg-amber-700/40 text-amber-100",  connector: "#f59e0b" },
  };
  const personVariant = {
    box: "bg-slate-700 border-slate-800 text-white",
    badge: "bg-slate-900/40 text-slate-100",
    connector: "#475569",
  };

  const { box, badge, connector } = isPersonNode ? personVariant : colorVariants[Math.min(level, 3)];
  const hasChildren = (node.children?.length ?? 0) > 0;
  const hasResps = !isPersonNode && (node.responsables?.length ?? 0) > 0;
  const hasPersonDetails = isPersonNode && Boolean(
    node.structure_nom || node.email_institutionnel || node.email_secondaire,
  );

  return (
    <div className="flex flex-col items-center">
      {/* Node box */}
      <div className="relative">
        <div
          className={`relative px-4 py-2.5 rounded-xl border-2 shadow-md cursor-pointer select-none transition-all duration-150
            ${box}
            ${hovered ? "scale-105 shadow-lg z-10" : ""}
            min-w-[160px] max-w-[220px] text-center`}
          onClick={() => hasChildren && setExpanded((v) => !v)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          title={hasChildren ? (expanded ? "Réduire" : "Développer") : undefined}
        >
          {/* Name */}
          <div className="font-semibold text-sm leading-tight truncate">{node.nom}</div>
          {/* Type badge */}
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge}`}>
            {isPersonNode ? node.role_label || "Personne" : levelLabel(node.type_entite)}
          </span>
          {/* Expand/collapse indicator */}
          {hasChildren && (
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-500 text-xs shadow-sm z-10">
              {expanded ? "−" : "+"}
            </div>
          )}
        </div>

        {/* Tooltip on hover */}
        {hovered && hasResps && (
          <div
            className="absolute z-50 top-full mt-4 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-xl shadow-xl p-3 min-w-[220px] pointer-events-none"
            onMouseEnter={() => setHovered(true)}
          >
            <div className="text-xs font-semibold text-slate-700 mb-2">Responsables</div>
            <div className="space-y-1.5">
              {node.responsables!.map((resp) => (
                <div key={`${resp.nom}-${resp.id_role}`} className="flex flex-col">
                  <span className="text-sm font-medium text-slate-800">{resp.prenom} {resp.nom}</span>
                  {resp.email_institutionnel && (
                    <span className="text-xs text-indigo-500 truncate">{resp.email_institutionnel}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {hovered && hasPersonDetails && (
          <div className="absolute z-50 top-full mt-4 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-xl shadow-xl p-3 min-w-[220px] pointer-events-none">
            <div className="text-xs font-semibold text-slate-700 mb-2">Fiche personne</div>
            <div className="space-y-1.5">
              {node.role_label && (
                <div className="text-sm text-slate-700">Rôle : {node.role_label}</div>
              )}
              {node.structure_nom && (
                <div className="text-xs text-slate-500">Affiliation : {node.structure_nom}</div>
              )}
              {node.email_institutionnel && (
                <div className="text-xs text-indigo-600 truncate">
                  Mail institutionnel : {node.email_institutionnel}
                </div>
              )}
              {node.email_secondaire && (
                <div className="text-xs text-slate-600 truncate">
                  Autre mail : {node.email_secondaire}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="flex justify-center mt-8">
          <div className="relative">
            {/* Horizontal bar */}
            <div
              className="absolute top-0 left-0 right-0 h-px -translate-y-4"
              style={{ background: connector }}
            />
            <div className="flex gap-6">
              {node.children!.map((child) => (
                <div key={child.id_node} className="relative flex flex-col items-center">
                  {/* Vertical connector down to child */}
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-4 -translate-y-4"
                    style={{ background: connector }}
                  />
                  <OrgNode node={child} level={level + 1} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
