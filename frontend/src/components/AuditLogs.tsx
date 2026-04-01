import { useCallback, useEffect, useState } from "react";
import { Download, Shield, Filter } from "lucide-react";
import type { AcademicYear } from "../types";
import type { EntiteStructure } from "../types";
import { apiFetch } from "../lib/api";
import { FilterBar } from "./ui/filter-bar";
import { readQueryParam, writeQueryParams } from "../lib/url-state";

interface AuditLogsProps {
  authLogin: string | null;
  currentYear: AcademicYear | null;
  entites: EntiteStructure[];
}

type AuditItem = {
  id_log: number;
  horodatage: string;
  type_action: string;
  cible_type: string;
  cible_id: string | null;
  ancienne_valeur?: string | null;
  nouvelle_valeur?: string | null;
  auteur_login: string | null;
  auteur_nom: string | null;
  auteur_prenom: string | null;
};

type UserOption = { id: string; label: string };

export function AuditLogs({ authLogin, currentYear, entites }: AuditLogsProps) {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  const [filters, setFilters] = useState({
    /** "user" = fiche responsable, "entite" = structure (licence, etc.) */
    targetKind: "" as "" | "user" | "entite",
    targetId: "",
    userId: "",
    action: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    const kind = readQueryParam("au_kind");
    const target = readQueryParam("au_target");
    const user = readQueryParam("au_user");
    const action = readQueryParam("au_action");
    const start = readQueryParam("au_start");
    const end = readQueryParam("au_end");
    const opened = readQueryParam("au_open");

    setFilters({
      targetKind: kind === "user" || kind === "entite" ? kind : "",
      targetId: target || "",
      userId: user || "",
      action: action || "",
      startDate: start || "",
      endDate: end || "",
    });
    setShowFilters(opened === "1");
    setFiltersHydrated(true);
  }, []);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("pageSize", "200");
    if (filters.targetId) params.set("targetId", filters.targetId);
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.action) params.set("action", filters.action);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    return params.toString();
  }, [filters]);

  const load = useCallback(async () => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      const q = buildQuery();
      const data = await apiFetch<{ items: AuditItem[]; total: number }>(
        `/audit?${q}`,
        { login: authLogin },
      );
      setItems(data.items || []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [authLogin, buildQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!authLogin || !currentYear?.id) return;
    let mounted = true;
    apiFetch<{ items: { id_user: number; login: string; nom: string; prenom: string }[] }>(
      `/users?yearId=${currentYear.id}&pageSize=500`,
      { login: authLogin },
    )
      .then((res) => {
        if (!mounted) return;
        const list = res.items || [];
        setUsers(
          list.map((u) => ({
            id: String(u.id_user),
            label: `${u.prenom} ${u.nom} (${u.login})`,
          })),
        );
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [authLogin, currentYear?.id]);

  const handleExport = async () => {
    if (!authLogin) return;
    setError(null);
    try {
      const q = buildQuery();
      const data = await apiFetch<{ csv: string }>(`/audit/export?${q}`, {
        login: authLogin,
      });
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-${filters.targetId || filters.userId || "export"}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur export");
    }
  };

  const clearFilters = () => {
    setFilters({
      targetKind: "",
      targetId: "",
      userId: "",
      action: "",
      startDate: "",
      endDate: "",
    });
  };

  const hasActiveFilters =
    filters.targetKind ||
    filters.targetId ||
    filters.userId ||
    filters.action ||
    filters.startDate ||
    filters.endDate;

  useEffect(() => {
    if (!filtersHydrated) return;
    writeQueryParams({
      au_kind: filters.targetKind,
      au_target: filters.targetId,
      au_user: filters.userId,
      au_action: filters.action,
      au_start: filters.startDate,
      au_end: filters.endDate,
      au_open: showFilters ? "1" : "",
    });
  }, [filters, showFilters, filtersHydrated]);

  const allStructuresForFilter = entites;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 mb-2">Journal d'audit</h2>
          <p className="text-slate-600">
            Traçabilité des actions sensibles. Filtrez par fiche responsable, structure (ex. licence) ou dates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              hasActiveFilters
                ? "bg-indigo-100 text-indigo-700"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {hasActiveFilters && (
              <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
                actifs
              </span>
            )}
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-slate-900 mb-4">Filtres spécifiques</h3>
          <FilterBar
            fields={[
              {
                key: "target-kind",
                label: "Type de cible",
                type: "select",
                value: filters.targetKind,
                onChange: (value) =>
                  setFilters((prev) => ({
                    ...prev,
                    targetKind: value as "" | "user" | "entite",
                    targetId: "",
                  })),
                options: [
                  { value: "", label: "Aucune cible" },
                  { value: "user", label: "Fiche d'un responsable" },
                  { value: "entite", label: "Structure" },
                ],
              },
              {
                key: "target-id",
                label:
                  filters.targetKind === "entite"
                    ? "Structure"
                    : filters.targetKind === "user"
                      ? "Responsable"
                      : "Cible",
                type: "select",
                value: filters.targetId,
                onChange: (value) => setFilters((prev) => ({ ...prev, targetId: value })),
                disabled: filters.targetKind === "",
                options:
                  filters.targetKind === "user"
                    ? [
                        { value: "", label: "Sélectionner un responsable" },
                        ...users.map((u) => ({ value: u.id, label: u.label })),
                      ]
                    : filters.targetKind === "entite"
                      ? [
                          { value: "", label: "Sélectionner une structure" },
                          ...allStructuresForFilter.map((e) => ({
                            value: String(e.id_entite),
                            label: `${e.nom} (${e.type_entite})`,
                          })),
                        ]
                      : [{ value: "", label: "Choisir d'abord un type de cible" }],
              },
              {
                key: "author",
                label: "Auteur de l'action",
                type: "select",
                value: filters.userId,
                onChange: (value) => setFilters((prev) => ({ ...prev, userId: value })),
                options: [
                  { value: "", label: "Tous" },
                  ...users.map((u) => ({ value: u.id, label: u.label })),
                ],
              },
              {
                key: "action",
                label: "Type d'action",
                type: "select",
                value: filters.action,
                onChange: (value) => setFilters((prev) => ({ ...prev, action: value })),
                options: [
                  { value: "", label: "Toutes" },
                  { value: "CREATE", label: "Création" },
                  { value: "UPDATE", label: "Modification" },
                  { value: "DELETE", label: "Suppression" },
                ],
              },
            ]}
            hasActiveFilters={Boolean(hasActiveFilters)}
            onReset={clearFilters}
          />

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date début</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date fin</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Changer le type de cible réinitialise automatiquement le sous-filtre associé.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        {loading ? (
          <div className="p-6 text-slate-500">Chargement...</div>
        ) : (
          <>
            {hasActiveFilters && (
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                {total} résultat(s)
              </div>
            )}
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Auteur</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Action</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Cible</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item) => (
                  <tr key={item.id_log} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {new Date(item.horodatage).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {item.auteur_login || `${item.auteur_prenom || ""} ${item.auteur_nom || ""}`.trim() || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <Shield className="w-4 h-4 text-indigo-600" />
                        {item.type_action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {item.cible_type}
                      {item.cible_id ? ` #${item.cible_id}` : ""}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                      {item.ancienne_valeur || item.nouvelle_valeur
                        ? [item.ancienne_valeur, item.nouvelle_valeur].filter(Boolean).join(" → ")
                        : "—"}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                      Aucun log disponible
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
