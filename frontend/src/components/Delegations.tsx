import { useEffect, useMemo, useState } from "react";
import { UserRole, AcademicYear, EntiteStructure } from "../types";
import {
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { FilterBar } from "./ui/filter-bar";
import { readQueryParam, writeQueryParams } from "../lib/url-state";
import {
  EMPTY_HIERARCHY_FILTERS,
  HIERARCHY_LEVELS,
  type HierarchyFilters,
  getFilteredEntites,
  getHierarchyOptions,
  matchesEntiteHierarchy,
  updateHierarchyFilters,
} from "../lib/entite-hierarchy";

interface DelegationsProps {
  userRole: UserRole;
  currentYear: AcademicYear;
  authLogin: string | null;
  currentUserId: string;
  entites: EntiteStructure[];
}

type ApiDelegation = {
  id_delegation: number;
  delegant_id: number;
  delegataire_id: number;
  id_entite: number;
  id_role: string | null;
  type_droit: string | null;
  date_debut: string;
  date_fin: string | null;
  statut: "ACTIVE" | "ANNULEE" | "EXPIREE";
  delegant_nom?: string | null;
  delegataire_nom?: string | null;
  entite_nom?: string | null;
};

type ApiUser = {
  id_user: number;
  nom: string;
  prenom: string;
  login: string;
};

const rightsOptions = [
  { value: "view", label: "Lecture" },
  { value: "manage_responsables", label: "Gestion responsables" },
  { value: "assign_role", label: "Affectation rôles" },
  { value: "delegate", label: "Déléguer" },
  { value: "generate_org", label: "Générer organigramme" },
  { value: "export_data", label: "Export" },
  { value: "import_data", label: "Import" },
  { value: "audit_view", label: "Audit" },
];

const rightsLabelMap = rightsOptions.reduce<Record<string, string>>((acc, right) => {
  acc[right.value] = right.label;
  return acc;
}, {});

const todayIso = () => new Date().toISOString().slice(0, 10);

const HIERARCHY_EMPTY_LABELS: Record<keyof HierarchyFilters, string> = {
  composanteId: "Toutes les composantes",
  departementId: "Tous les départements",
  mentionId: "Toutes les mentions",
  parcoursId: "Tous les parcours",
  niveauId: "Tous les niveaux",
};

export function Delegations({
  userRole,
  currentYear,
  authLogin,
  currentUserId,
  entites,
}: DelegationsProps) {
  const [delegations, setDelegations] = useState<ApiDelegation[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [newDelegation, setNewDelegation] = useState({
    delegateeId: "",
    scopeEntite: "",
    right: "",
    startDate: todayIso(),
    endDate: "",
  });
  const isSC = userRole === "services-centraux" || userRole === "administrateur";
  const canCreate =
    userRole === "directeur-composante" ||
    userRole === "directeur-administratif" ||
    userRole === "directeur-administratif-adjoint";
  const canExport = isSC;

  const [hierarchyFilters, setHierarchyFilters] = useState<HierarchyFilters>(EMPTY_HIERARCHY_FILTERS);
  const hasActiveFilters = Boolean(
    search || filterActive !== "all" || Object.values(hierarchyFilters).some(Boolean),
  );
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  const yearEntites = useMemo(
    () => entites.filter((entite) => String(entite.id_annee) === currentYear.id),
    [entites, currentYear.id],
  );
  const hierarchyOptions = useMemo(
    () => getHierarchyOptions(yearEntites, hierarchyFilters, currentYear.id),
    [yearEntites, hierarchyFilters, currentYear.id],
  );
  const scopedEntites = useMemo(
    () => getFilteredEntites(yearEntites, hierarchyFilters, currentYear.id),
    [yearEntites, hierarchyFilters, currentYear.id],
  );

  const loadData = async () => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      const [delegationsData, usersData] = await Promise.all([
        apiFetch<{ items: ApiDelegation[] }>("/delegations", { login: authLogin }),
        apiFetch<{ items: ApiUser[] }>(`/users?yearId=${currentYear.id}&pageSize=500`, { login: authLogin }),
      ]);
      setDelegations(delegationsData.items || []);
      setUsers(
        (usersData.items || []).map((user) => ({
          id_user: user.id_user,
          nom: user.nom,
          prenom: user.prenom,
          login: user.login,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [authLogin, currentYear.id]);

  useEffect(() => {
    const active = readQueryParam("dg_active");
    const q = readQueryParam("dg_q");
    const comp = readQueryParam("dg_comp");
    const dept = readQueryParam("dg_dept");
    const mention = readQueryParam("dg_mention");
    const parcours = readQueryParam("dg_parcours");
    const niveau = readQueryParam("dg_niveau");
    if (active === "all" || active === "active" || active === "inactive") {
      setFilterActive(active);
    }
    setSearch(q || "");
    setHierarchyFilters({
      composanteId: comp || "",
      departementId: dept || "",
      mentionId: mention || "",
      parcoursId: parcours || "",
      niveauId: niveau || "",
    });
    setFiltersHydrated(true);
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;
    writeQueryParams({
      dg_q: search,
      dg_active: filterActive,
      dg_comp: hierarchyFilters.composanteId,
      dg_dept: hierarchyFilters.departementId,
      dg_mention: hierarchyFilters.mentionId,
      dg_parcours: hierarchyFilters.parcoursId,
      dg_niveau: hierarchyFilters.niveauId,
    });
  }, [search, filterActive, hierarchyFilters, filtersHydrated]);

  const filteredDelegations = useMemo(() => {
    return delegations.filter((delegation) => {
      const active = delegation.statut === "ACTIVE";
      if (filterActive === "active" && !active) return false;
      if (filterActive === "inactive" && active) return false;
      if (
        Object.values(hierarchyFilters).some(Boolean) &&
        !matchesEntiteHierarchy(yearEntites, delegation.id_entite, hierarchyFilters, currentYear.id)
      ) {
        return false;
      }

      const normalizedSearch = search.trim().toLowerCase();
      if (!normalizedSearch) {
        return true;
      }

      const delegatedRight =
        delegation.id_role ||
        rightsLabelMap[delegation.type_droit || ""] ||
        delegation.type_droit ||
        "";

      return (
        String(delegation.id_delegation).includes(normalizedSearch) ||
        String(delegation.id_entite).includes(normalizedSearch) ||
        delegation.delegant_nom?.toLowerCase().includes(normalizedSearch) ||
        delegation.delegataire_nom?.toLowerCase().includes(normalizedSearch) ||
        delegation.entite_nom?.toLowerCase().includes(normalizedSearch) ||
        delegatedRight.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [delegations, filterActive, hierarchyFilters, yearEntites, currentYear.id, search]);

  const resetFilters = () => {
    setSearch("");
    setHierarchyFilters(EMPTY_HIERARCHY_FILTERS);
    setFilterActive("all");
  };

  const handleCreateDelegation = async () => {
    if (!authLogin) return;
    if (!newDelegation.delegateeId || !newDelegation.scopeEntite || !newDelegation.right) {
      setError("Veuillez renseigner les champs requis");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiFetch("/delegations", {
        method: "POST",
        body: JSON.stringify({
          delegataire_id: Number(newDelegation.delegateeId),
          id_entite: Number(newDelegation.scopeEntite),
          type_droit: newDelegation.right,
          date_debut: newDelegation.startDate,
          date_fin: newDelegation.endDate || null,
        }),
        login: authLogin,
      });

      setShowCreateForm(false);
      setNewDelegation({
        delegateeId: "",
        scopeEntite: "",
        right: "",
        startDate: todayIso(),
        endDate: "",
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (delegationId: number) => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/delegations/${delegationId}/revoke`, { method: "PATCH", login: authLogin });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'annulation");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!authLogin || !canExport) return;
    setExporting(true);
    setError(null);
    try {
      const data = await apiFetch<{ csv: string }>("/delegations/export", { login: authLogin });
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `delegations-${currentYear.year}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur export");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 mb-2">Gestion des délégations</h2>
          <p className="text-slate-600">
            {canCreate
              ? "Créer et consulter les délégations de droits (DC, DA, DA adjoint). Services centraux : export CSV."
              : "Consulter les délégations et exporter en CSV (Services centraux)."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canExport && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-60"
            >
              <Eye className="w-5 h-5" />
              Export CSV
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Créer une délégation
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {showCreateForm && canCreate && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Fermer la fenêtre de création de délégation"
            onClick={() => setShowCreateForm(false)}
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
          />
          <div className="relative flex min-h-full items-center justify-center p-4">
            <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <h3 className="text-slate-900 mb-4">Nouvelle délégation</h3>
              <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Délégataire <span className="text-red-500">*</span>
                </label>
                <select
                  value={newDelegation.delegateeId}
                  onChange={(e) => setNewDelegation({ ...newDelegation, delegateeId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {users
                    .filter((user) => String(user.id_user) !== currentUserId)
                    .map((user) => (
                      <option key={user.id_user} value={user.id_user}>
                        {user.prenom} {user.nom} ({user.login})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Périmètre (structure) <span className="text-red-500">*</span>
                </label>
                <select
                  value={newDelegation.scopeEntite}
                  onChange={(e) => setNewDelegation({ ...newDelegation, scopeEntite: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                  <option value="">Sélectionner une structure</option>
                  {scopedEntites.map((entite) => (
                    <option key={entite.id_entite} value={entite.id_entite}>
                      {entite.nom} ({entite.type_entite})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Droit délégué <span className="text-red-500">*</span>
              </label>
              <select
                value={newDelegation.right}
                onChange={(e) => setNewDelegation({ ...newDelegation, right: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="">Sélectionner un droit</option>
                {rightsOptions.map((right) => (
                  <option key={right.value} value={right.value}>
                    {right.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date debut
                </label>
                <input
                  type="date"
                  value={newDelegation.startDate}
                  onChange={(e) => setNewDelegation({ ...newDelegation, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date fin</label>
                <input
                  type="date"
                  value={newDelegation.endDate}
                  onChange={(e) => setNewDelegation({ ...newDelegation, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateDelegation}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                <UserPlus className="w-4 h-4" />
                Enregistrer
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="flex items-center gap-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Annuler
              </button>
            </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-slate-900 mb-4">Délégations existantes</h3>

        <FilterBar
          className="mb-4"
          fields={[
            {
              key: "search",
              label: "Recherche",
              type: "search",
              value: search,
              onChange: (value) => setSearch(value),
              placeholder: "ID, délégant, délégataire, structure ou droit...",
            },
            {
              key: "status",
              label: "Statut",
              type: "select",
              value: filterActive,
              onChange: (value) => setFilterActive(value as "all" | "active" | "inactive"),
              options: [
                { value: "all", label: "Toutes" },
                { value: "active", label: "Actives" },
                { value: "inactive", label: "Inactives" },
              ],
            },
            ...HIERARCHY_LEVELS.map((level) => {
              const options = hierarchyOptions[level.key];
              return {
                key: level.key,
                label: level.label,
                type: "select" as const,
                value: hierarchyFilters[level.key],
                onChange: (value: string) =>
                  setHierarchyFilters((prev) => updateHierarchyFilters(prev, level.key, value)),
                disabled: options.length === 0,
                options: [
                  { value: "", label: HIERARCHY_EMPTY_LABELS[level.key] },
                  ...options.map((entite) => ({
                    value: String(entite.id_entite),
                    label:
                      entite.type_entite === "COMPOSANTE" && entite.code_composante
                        ? `${entite.nom} (${entite.code_composante})`
                        : entite.nom,
                  })),
                ],
              };
            }),
          ]}
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        />

        {loading && delegations.length === 0 ? (
          <div className="text-slate-500">Chargement...</div>
        ) : filteredDelegations.length === 0 ? (
          <div className="text-slate-500">Aucune délégation</div>
        ) : (
          <div className="space-y-4">
            {filteredDelegations.map((delegation) => (
              <DelegationCard
                key={delegation.id_delegation}
                delegation={delegation}
                onRevoke={handleRevoke}
                canRevoke={isSC || String(delegation.delegant_id) === currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DelegationCard({
  delegation,
  onRevoke,
  canRevoke,
}: {
  delegation: ApiDelegation;
  onRevoke: (id: number) => void;
  canRevoke: boolean;
}) {
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const active = delegation.statut === "ACTIVE";
  const statusLabel = active ? "Active" : delegation.statut === "ANNULEE" ? "Annulée" : "Expirée";
  const StatusIcon = active ? CheckCircle : delegation.statut === "ANNULEE" ? XCircle : Clock;

  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-slate-900 font-medium">
            {delegation.delegant_nom || "Délégant"} {"->"} {delegation.delegataire_nom || "Délégataire"}
          </div>
          <div className="text-sm text-slate-600">
            {delegation.entite_nom || "Structure"} | Droit:{" "}
            {delegation.id_role ||
              rightsLabelMap[delegation.type_droit || ""] ||
              delegation.type_droit ||
              "-"}
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 ${
            active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          <StatusIcon className="w-3 h-3" />
          {statusLabel}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          Début : {delegation.date_debut}
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          Fin: {delegation.date_fin || "-"}
        </div>
        <div className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          ID: {delegation.id_delegation}
        </div>
      </div>
      {active && canRevoke && (
        <div className="mt-4">
          {confirmRevoke ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Confirmer la révocation ?</span>
              <button
                onClick={() => { onRevoke(delegation.id_delegation); setConfirmRevoke(false); }}
                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Confirmer
              </button>
              <button
                onClick={() => setConfirmRevoke(false)}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRevoke(true)}
              className="px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              Révoquer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
