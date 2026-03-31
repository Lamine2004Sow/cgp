import { useEffect, useMemo, useState } from "react";
import { User, UserRole, AcademicYear, EntiteStructure, canGenerateOrgChart, getRoleLabelSafe } from "../types";
import { Download, GitBranch, Lock, Unlock, FileDown, Eye } from "lucide-react";
import { apiFetch } from "../lib/api";

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
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  id_role: string;
};

type ApiOrgNode = {
  id_entite: number;
  nom: string;
  type_entite: string;
  children?: ApiOrgNode[];
  responsables?: ApiResponsable[];
};

const levelLabel = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized === "composante") return "Composante";
  if (normalized === "departement") return "Département";
  if (normalized === "mention") return "Mention";
  if (normalized === "parcours") return "Parcours";
  if (normalized === "niveau") return "Niveau";
  return type;
};

export function OrgChart({ userRole, currentYear, authLogin, entites, currentUser }: OrgChartProps) {
  const [selectedRoot, setSelectedRoot] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [tree, setTree] = useState<ApiOrgNode | null>(null);
  const [orgaMeta, setOrgaMeta] = useState<ApiOrganigramme | null>(null);
  const [organigrammes, setOrganigrammes] = useState<ApiOrganigramme[]>([]);
  const [selectedOrgaId, setSelectedOrgaId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = canGenerateOrgChart(userRole);
  const canFreeze = userRole === "services-centraux";
  const isTopLevel =
    userRole === "services-centraux" ||
    userRole === "directeur-composante" ||
    userRole === "directeur-administratif" ||
    userRole === "directeur-administratif-adjoint";

  const entiteMap = useMemo(() => {
    const map = new Map<number, EntiteStructure>();
    entites.forEach((entite) => map.set(entite.id_entite, entite));
    return map;
  }, [entites]);

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
    const filteredByType =
      selectedType === "ALL" ? byYear : byYear.filter((entite) => entite.type_entite === selectedType);
    if (isTopLevel) return filteredByType;

    const allowedRoots = currentUser.roles
      .filter((role) => role.year === currentYear.year)
      .map((role) => role.entiteId);

    if (allowedRoots.length === 0) return [];

    return filteredByType.filter((entite) =>
      allowedRoots.some((allowedId) => isDescendant(entite.id_entite, allowedId)),
    );
  }, [entites, currentYear.id, selectedType, currentUser.roles, currentYear.year, isTopLevel, entiteMap]);

  useEffect(() => {
    if (rootOptions.length && !selectedRoot) {
      setSelectedRoot(String(rootOptions[0].id_entite));
    }
    if (!rootOptions.find((entite) => String(entite.id_entite) === selectedRoot)) {
      setSelectedRoot(rootOptions[0]?.id_entite ? String(rootOptions[0].id_entite) : "");
    }
  }, [rootOptions, selectedRoot]);

  const loadLatest = async () => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      const orgaList = await apiFetch<{ items: ApiOrganigramme[] }>(
        `/organigrammes?yearId=${currentYear.id}`,
        { login: authLogin },
      );
      setOrganigrammes(orgaList.items || []);
      if (orgaList.items?.length) {
        setSelectedOrgaId(String(orgaList.items[0].id_organigramme));
      }

      const data = await apiFetch<{ organigramme: ApiOrganigramme | null; arbre: ApiOrgNode }>(
        `/organigrammes/latest?yearId=${currentYear.id}`,
        { login: authLogin },
      );
      setTree(data.arbre || null);
      setOrgaMeta(data.organigramme || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
      setTree(null);
      setOrgaMeta(null);
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
      const data = await apiFetch<{ organigramme: ApiOrganigramme; arbre: ApiOrgNode }>(
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
      setTree(data.arbre);
      setOrgaMeta(data.organigramme);
      setSelectedOrgaId(String(data.organigramme.id_organigramme));
      // Rafraîchir la liste sans écraser l'orgaMeta courant
      const orgaList = await apiFetch<{ items: ApiOrganigramme[] }>(
        `/organigrammes?yearId=${currentYear.id}`,
        { login: authLogin },
      );
      setOrganigrammes(orgaList.items || []);
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
      const data = await apiFetch<{ organigramme: ApiOrganigramme; arbre: ApiOrgNode }>(
        `/organigrammes/${orgaId}/tree`,
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

  const handleFreeze = async () => {
    if (!authLogin || !orgaMeta) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ organigramme: ApiOrganigramme }>(
        `/organigrammes/${orgaMeta.id_organigramme}/freeze`,
        {
          method: "PATCH",
          login: authLogin,
        },
      );
      setOrgaMeta(data.organigramme);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du gel");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "PDF" | "CSV" | "JSON") => {
    if (!authLogin || !orgaMeta) return;
    setExportLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{
        fileName: string;
        mimeType: string;
        contentBase64: string;
      }>(`/organigrammes/${orgaMeta.id_organigramme}/export?format=${format}`, {
        login: authLogin,
      });

      const binary = atob(data.contentBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur export");
    } finally {
      setExportLoading(false);
    }
  };

  const isGenerated = Boolean(orgaMeta);
  const isFrozen = orgaMeta?.est_fige || false;

  const rootNameById = useMemo(() => {
    const map = new Map<number, string>();
    entites.forEach((e) => map.set(e.id_entite, e.nom));
    return map;
  }, [entites]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-slate-900 mb-2">Organigramme — {currentYear.year}</h2>
        <p className="text-slate-600">
          Visualisez et générez les organigrammes hiérarchiques de votre structure (composante, département, mention, parcours).
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
              {canGenerate ? "Selon votre rôle" : "Consultation seule"}
            </div>
          </div>
        </div>

        {canGenerate && !isFrozen && (
          <div className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sélectionner la structure racine
              </label>
              <select
                value={selectedRoot}
                onChange={(e) => setSelectedRoot(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {rootOptions.length === 0 && <option value="">Aucune structure</option>}
                {rootOptions.map((entite) => (
                  <option key={entite.id_entite} value={entite.id_entite}>
                    {entite.nom} ({entite.type_entite})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleViewOrganigramme}
                disabled={loading || organigrammes.length === 0}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
                title={
                  organigrammes.length === 0
                    ? "Aucun organigramme enregistré pour cette année"
                    : "Charger un organigramme déjà généré (sans en créer un nouveau)"
                }
              >
                <Eye className="w-5 h-5" />
                Voir l'organigramme
              </button>
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
              {tree && canFreeze && !isFrozen && orgaMeta && (
                <button
                  onClick={handleFreeze}
                  disabled={loading}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  <Lock className="w-5 h-5" />
                  Figer l'organigramme
                </button>
              )}
            </div>
          </div>
        )}

        {isFrozen && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>Organigramme figé :</strong> Aucune modification possible.
            </p>
          </div>
        )}

        {!canGenerate && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
            <p className="text-sm text-orange-800">
              <strong>Génération non autorisée :</strong> Vous pouvez uniquement consulter.
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
          <div className="min-w-max pb-6"><OrgNode node={tree} level={0} /></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 text-slate-600">
            <FileDown className="w-5 h-5" />
            Aucun organigramme généré pour cette année.
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-900">Historique des organigrammes</h3>
          <select
            value={selectedOrgaId}
            onChange={(e) => handleLoadOrganigramme(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="">Sélectionner</option>
            {organigrammes.map((orga) => (
              <option key={orga.id_organigramme} value={orga.id_organigramme}>
                {new Date(orga.generated_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })} — {rootNameById.get(orga.id_entite_racine) ?? `Racine ${orga.id_entite_racine}`}
              </option>
            ))}
          </select>
        </div>
        {organigrammes.length === 0 && (
          <div className="text-sm text-slate-500">Aucun organigramme généré pour cette année.</div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-slate-900 mb-4">Exports</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["PDF", "CSV", "JSON"] as const).map((format) => (
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

  const colorVariants: Record<number, { box: string; badge: string; connector: string }> = {
    0: { box: "bg-indigo-600 border-indigo-700 text-white",   badge: "bg-indigo-800/40 text-indigo-100", connector: "#6366f1" },
    1: { box: "bg-blue-500 border-blue-600 text-white",       badge: "bg-blue-700/40 text-blue-100",    connector: "#3b82f6" },
    2: { box: "bg-emerald-500 border-emerald-600 text-white", badge: "bg-emerald-700/40 text-emerald-100", connector: "#10b981" },
    3: { box: "bg-amber-500 border-amber-600 text-white",     badge: "bg-amber-700/40 text-amber-100",  connector: "#f59e0b" },
  };

  const { box, badge, connector } = colorVariants[Math.min(level, 3)];
  const hasChildren = (node.children?.length ?? 0) > 0;
  const hasResps = (node.responsables?.length ?? 0) > 0;

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
            {levelLabel(node.type_entite)}
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
                  <span className="text-xs text-slate-500">{getRoleLabelSafe(resp.id_role)}</span>
                  {resp.email_institutionnel && (
                    <span className="text-xs text-indigo-500 truncate">{resp.email_institutionnel}</span>
                  )}
                </div>
              ))}
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
                <div key={child.id_entite} className="relative flex flex-col items-center">
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
