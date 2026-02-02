import { useEffect, useMemo, useState } from "react";
import { User, UserRole, AcademicYear, EntiteStructure, canGenerateOrgChart } from "../types";
import { Download, GitBranch, Lock, Unlock, FileDown } from "lucide-react";
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
  if (normalized === "departement") return "Departement";
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
  const [error, setError] = useState<string | null>(null);

  const canGenerate = canGenerateOrgChart(userRole);
  const canFreeze = userRole === "services-centraux" || userRole === "administrateur";
  const isTopLevel =
    userRole === "services-centraux" ||
    userRole === "administrateur" ||
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
      await loadLatest();
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

  const isGenerated = Boolean(orgaMeta);
  const isFrozen = orgaMeta?.est_fige || false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-slate-900 mb-2">Organigramme - {currentYear.year}</h2>
        <p className="text-slate-600">Visualiser et generer les organigrammes hierarchiques</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-slate-900 mb-4">Controles de l'organigramme</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="text-sm text-slate-600 mb-2">Organigramme genere ?</div>
            <div className="flex items-center gap-2">
              {isGenerated ? (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Oui
                </span>
              ) : (
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
                  Non
                </span>
              )}
            </div>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="text-sm text-slate-600 mb-2">Organigramme fige ?</div>
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
            <div className="text-sm text-slate-600 mb-2">Portee de generation</div>
            <div className="text-sm text-slate-900 font-medium">
              {canGenerate ? "Selon votre role" : "Consultation seule"}
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
                <option value="DEPARTEMENT">Departement</option>
                <option value="MENTION">Mention</option>
                <option value="PARCOURS">Parcours</option>
                <option value="NIVEAU">Niveau</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Selectionner la structure racine
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

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!selectedRoot) {
                    setError("Selectionnez une structure racine");
                    return;
                  }
                  handleGenerate();
                }}
                disabled={loading || !selectedRoot}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                <GitBranch className="w-5 h-5" />
                Generer l'organigramme
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
              <strong>Organigramme fige :</strong> Aucune modification possible.
            </p>
          </div>
        )}

        {!canGenerate && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              <strong>Generation non autorisee :</strong> Vous pouvez uniquement consulter.
            </p>
          </div>
        )}
      </div>

      {tree ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 overflow-x-auto">
          <div className="min-w-max">{renderNode(tree)}</div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 text-slate-600">
            <FileDown className="w-5 h-5" />
            Aucun organigramme genere pour cette annee.
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
            <option value="">Selectionner</option>
            {organigrammes.map((orga) => (
              <option key={orga.id_organigramme} value={orga.id_organigramme}>
                {new Date(orga.generated_at).toLocaleDateString("fr-FR")} - racine {orga.id_entite_racine}
              </option>
            ))}
          </select>
        </div>
        {organigrammes.length === 0 && (
          <div className="text-sm text-slate-500">Aucun organigramme genere pour cette annee.</div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-slate-900 mb-4">Exports</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['PDF', 'SVG', 'PNG'].map((format) => (
            <button
              key={format}
              className="p-4 border-2 border-slate-200 rounded-lg text-left text-slate-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
            >
              <Download className="w-6 h-6 mb-2" />
              Export {format}
              <div className="text-xs text-slate-400">Fonctionnalite a connecter</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderNode(node: ApiOrgNode, level: number = 0): JSX.Element {
  const colors: Record<number, string> = {
    0: "bg-purple-100 border-purple-300 text-purple-900",
    1: "bg-blue-100 border-blue-300 text-blue-900",
    2: "bg-green-100 border-green-300 text-green-900",
    3: "bg-orange-100 border-orange-300 text-orange-900",
  };

  const colorClass = colors[Math.min(level, 3) as keyof typeof colors];

  return (
    <div className="flex flex-col items-center mb-6">
      <div className={`px-6 py-3 rounded-lg border-2 ${colorClass} shadow-sm min-w-[220px] text-center`}>
        <div className="font-medium">{node.nom}</div>
        <div className="text-xs opacity-75">{levelLabel(node.type_entite)}</div>
        {node.responsables && node.responsables.length > 0 && (
          <div className="mt-2 text-xs text-slate-700">
            {node.responsables.map((resp) => (
              <div key={`${resp.nom}-${resp.id_role}`}>
                {resp.prenom} {resp.nom} ({resp.id_role})
              </div>
            ))}
          </div>
        )}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="flex justify-center mt-6">
          <div className="relative">
            <div className="flex gap-8">
              {node.children.map((child) => (
                <div key={child.id_entite} className="relative">
                  <div className="absolute top-0 left-1/2 w-px h-6 bg-slate-300 -translate-x-1/2 -translate-y-6" />
                  {renderNode(child, level + 1)}
                </div>
              ))}
            </div>
            <div className="absolute top-0 left-0 right-0 h-px bg-slate-300 -translate-y-6" />
          </div>
        </div>
      )}
    </div>
  );
}
