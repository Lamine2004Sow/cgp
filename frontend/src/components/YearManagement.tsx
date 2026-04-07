import { useEffect, useMemo, useState } from "react";
import { AcademicYear, EntiteStructure, getAcademicYearStatusLabel } from "../types";
import {
  Archive,
  Calendar,
  FolderTree,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { downloadBase64File } from "../lib/standard-workbook";

interface YearManagementProps {
  currentYear: AcademicYear;
  authLogin: string | null;
  onRefresh?: () => Promise<void> | void;
  onNavigateToImport?: () => void;
}

type ApiYear = {
  id_annee: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  statut: "EN_COURS" | "PREPARATION" | "ARCHIVEE";
  id_annee_source?: number | null;
};

type ManagedYear = AcademicYear & {
  sourceId: number | null;
  sourceLabel: string | null;
  startDate: string;
  endDate: string;
};

const mapYearStatus = (status: ApiYear["statut"]): AcademicYear["status"] => {
  if (status === "EN_COURS") return "en-cours";
  if (status === "PREPARATION") return "en-preparation";
  return "archivee";
};

const getNextYearValues = (label: string) => {
  const match = label.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    const today = new Date();
    const year = today.getFullYear();
    return {
      label: `${year + 1}-${year + 2}`,
      startDate: `${year + 1}-09-01`,
      endDate: `${year + 2}-08-31`,
    };
  }

  const nextStart = Number.parseInt(match[2], 10);
  const nextEnd = nextStart + 1;
  return {
    label: `${nextStart}-${nextEnd}`,
    startDate: `${nextStart}-09-01`,
    endDate: `${nextEnd}-08-31`,
  };
};

export function YearManagement({
  currentYear,
  authLogin,
  onRefresh,
  onNavigateToImport,
}: YearManagementProps) {
  const [years, setYears] = useState<ManagedYear[]>([]);
  const [selectedSourceYearId, setSelectedSourceYearId] = useState<string>(currentYear.id);
  const [sourceEntites, setSourceEntites] = useState<EntiteStructure[]>([]);
  const [structureSearch, setStructureSearch] = useState("");
  const [copyAffectations, setCopyAffectations] = useState(true);
  const [copyMode, setCopyMode] = useState<"all" | "selected">("all");
  const [selectedRootIds, setSelectedRootIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCreatedWithoutAffectations, setLastCreatedWithoutAffectations] = useState(false);

  const loadYears = async () => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: ApiYear[] }>("/years", { login: authLogin });
      const labelById = new Map(data.items.map((year) => [year.id_annee, year.libelle]));
      const mapped = data.items.map((year) => ({
        id: String(year.id_annee),
        year: year.libelle,
        status: mapYearStatus(year.statut),
        isFrozen: false,
        sourceId: year.id_annee_source ?? null,
        sourceLabel: year.id_annee_source ? labelById.get(year.id_annee_source) ?? null : null,
        startDate: year.date_debut,
        endDate: year.date_fin,
      }));
      setYears(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadYears();
  }, [authLogin]);

  useEffect(() => {
    if (!authLogin || selectedSourceYearId === "0") {
      setSourceEntites([]);
      setSelectedRootIds(new Set());
      return;
    }

    apiFetch<{ items: EntiteStructure[] }>(`/entites?yearId=${selectedSourceYearId}`, {
      login: authLogin,
    })
      .then((data) => setSourceEntites(data.items || []))
      .catch(() => setSourceEntites([]));
  }, [authLogin, selectedSourceYearId]);

  const selectedSourceYear = useMemo(
    () => years.find((year) => year.id === selectedSourceYearId) ?? null,
    [selectedSourceYearId, years],
  );

  const nextYearDraft = useMemo(
    () => getNextYearValues(selectedSourceYear?.year ?? currentYear.year),
    [currentYear.year, selectedSourceYear?.year],
  );

  const sourceEntiteMap = useMemo(() => {
    const map = new Map<number, EntiteStructure>();
    sourceEntites.forEach((entite) => map.set(entite.id_entite, entite));
    return map;
  }, [sourceEntites]);

  const selectableStructures = useMemo(() => {
    const normalizedSearch = structureSearch.trim().toLowerCase();

    const getDepth = (entite: EntiteStructure) => {
      let depth = 0;
      let current = entite;
      while (current.id_entite_parent) {
        const parent = sourceEntiteMap.get(current.id_entite_parent);
        if (!parent) break;
        depth += 1;
        current = parent;
      }
      return depth;
    };

    return [...sourceEntites]
      .filter((entite) => {
        if (!normalizedSearch) return true;
        return (
          entite.nom.toLowerCase().includes(normalizedSearch) ||
          String(entite.id_entite).includes(normalizedSearch) ||
          entite.code_composante?.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((left, right) => {
        const depthDiff = getDepth(left) - getDepth(right);
        if (depthDiff !== 0) return depthDiff;
        return left.nom.localeCompare(right.nom, "fr", { sensitivity: "base" });
      })
      .map((entite) => ({
        ...entite,
        depth: getDepth(entite),
      }));
  }, [sourceEntiteMap, sourceEntites, structureSearch]);

  const toggleSelectedRoot = (entiteId: number) => {
    setSelectedRootIds((prev) => {
      const next = new Set(prev);
      if (next.has(entiteId)) next.delete(entiteId);
      else next.add(entiteId);
      return next;
    });
  };

  const handleCloneYear = async () => {
    if (!authLogin) return;
    if (copyMode === "selected" && selectedRootIds.size === 0) {
      setError("Sélectionnez au moins une structure à recopier.");
      return;
    }

    setLoading(true);
    setError(null);
    setLastCreatedWithoutAffectations(false);
    try {
      const sourceId = selectedSourceYearId || "0";
      await apiFetch(`/years/${sourceId}/clone`, {
        method: "POST",
        body: JSON.stringify({
          libelle: nextYearDraft.label,
          date_debut: nextYearDraft.startDate,
          date_fin: nextYearDraft.endDate,
          statut: "PREPARATION",
          copy_affectations: copyAffectations,
          root_entite_ids:
            selectedSourceYearId !== "0" && copyMode === "selected"
              ? Array.from(selectedRootIds)
              : undefined,
        }),
        login: authLogin,
      });
      setLastCreatedWithoutAffectations(!copyAffectations);
      setCopyMode("all");
      setSelectedRootIds(new Set());
      await loadYears();
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    yearId: string,
    statut: "EN_COURS" | "ARCHIVEE" | "PREPARATION",
  ) => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/years/${yearId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ statut }),
        login: authLogin,
      });
      await loadYears();
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteYear = async (year: ManagedYear) => {
    if (!authLogin) return;
    const confirmed = window.confirm(
      `Supprimer l'année ${year.year} ? Un fichier de sauvegarde Excel standardisé sera téléchargé automatiquement avant suppression.`,
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{
        year: ApiYear;
        backup: { fileName: string; mimeType: string; contentBase64: string };
      }>(`/years/${year.id}`, {
        method: "DELETE",
        login: authLogin,
      });

      downloadBase64File(
        data.backup.contentBase64,
        data.backup.fileName,
        data.backup.mimeType,
      );

      await loadYears();
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 mb-2">Gestion des années universitaires</h2>
          <p className="text-slate-600">Réservé aux Services centraux</p>
        </div>
        <button
          onClick={handleCloneYear}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60"
        >
          <Plus className="w-5 h-5" />
          Créer une année
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {lastCreatedWithoutAffectations && onNavigateToImport && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
          <Upload className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <p className="text-indigo-900 font-medium">Année créée avec une reprise partielle</p>
            <p className="text-indigo-700 text-sm">
              Vous pouvez maintenant compléter cette année avec le classeur Excel standardisé depuis l’onglet Import / Export.
            </p>
            <button
              onClick={() => {
                setLastCreatedWithoutAffectations(false);
                onNavigateToImport();
              }}
              className="mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
            >
              Aller à l'import
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div>
          <h3 className="text-slate-900 mb-2">Préparer une nouvelle année</h3>
          <p className="text-slate-600 text-sm">
            Vous pouvez recopier toute l’année précédente, ou seulement certaines structures, puis compléter le reste plus tard par import Excel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Année source
            </label>
            <select
              value={selectedSourceYearId}
              onChange={(e) => {
                setSelectedSourceYearId(e.target.value);
                setSelectedRootIds(new Set());
              }}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="0">Aucune source (année vide)</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.year} ({getAcademicYearStatusLabel(year.status)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nouvelle année créée
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="font-medium text-slate-900">{nextYearDraft.label}</div>
              <div className="text-slate-500">
                du {nextYearDraft.startDate} au {nextYearDraft.endDate}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
            <input
              type="radio"
              name="copyMode"
              checked={copyMode === "all"}
              onChange={() => setCopyMode("all")}
              className="h-4 w-4 text-indigo-600"
              disabled={selectedSourceYearId === "0"}
            />
            <div>
              <div className="font-medium text-slate-900">Recopier toute la base source</div>
              <div className="text-sm text-slate-500">
                Toutes les structures de l’année source seront reprises.
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
            <input
              type="radio"
              name="copyMode"
              checked={copyMode === "selected"}
              onChange={() => setCopyMode("selected")}
              className="h-4 w-4 text-indigo-600"
              disabled={selectedSourceYearId === "0"}
            />
            <div>
              <div className="font-medium text-slate-900">Recopier seulement certaines structures</div>
              <div className="text-sm text-slate-500">
                Les autres pourront être importées plus tard.
              </div>
            </div>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={copyAffectations}
            onChange={(e) => setCopyAffectations(e.target.checked)}
            className="h-4 w-4 text-indigo-600 rounded"
          />
          Recopier aussi les affectations et les contacts associés
        </label>

        {copyMode === "selected" && selectedSourceYearId !== "0" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <div className="flex items-start gap-3">
              <FolderTree className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-slate-900">Structures à reprendre</div>
                <div className="text-sm text-slate-500">
                  Les sous-structures seront reprises avec leur hiérarchie. Les ancêtres nécessaires seront conservés pour garder un arbre cohérent.
                </div>
              </div>
            </div>

            <input
              type="text"
              value={structureSearch}
              onChange={(e) => setStructureSearch(e.target.value)}
              placeholder="Rechercher par nom, code ou identifiant..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
            />

            <div className="max-h-[320px] overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
              {selectableStructures.length === 0 && (
                <div className="px-4 py-3 text-sm text-slate-500">
                  Aucune structure trouvée pour cette année source.
                </div>
              )}
              {selectableStructures.map((entite) => (
                <label
                  key={entite.id_entite}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedRootIds.has(entite.id_entite)}
                    onChange={() => toggleSelectedRoot(entite.id_entite)}
                    className="h-4 w-4 text-indigo-600 rounded"
                  />
                  <div
                    className="min-w-0"
                    style={{ paddingLeft: `${entite.depth * 16}px` }}
                  >
                    <div className="text-sm font-medium text-slate-900 truncate">
                      #{entite.id_entite} — {entite.nom}
                    </div>
                    <div className="text-xs text-slate-500">
                      {entite.type_entite}
                      {entite.code_composante ? ` · ${entite.code_composante}` : ""}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="text-sm text-slate-500">
              {selectedRootIds.size} structure(s) sélectionnée(s)
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-slate-900">Années existantes</h3>
            <p className="text-sm text-slate-500 mt-1">
              Archivez, activez ou supprimez une année. En cas de suppression, un fichier Excel standardisé est téléchargé automatiquement.
            </p>
          </div>
        </div>
        {loading && years.length === 0 ? (
          <div className="text-slate-500">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Année
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Période
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {years.map((year) => (
                  <tr key={year.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" />
                        <span className="font-medium text-slate-900">{year.year}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                          year.status === "en-cours"
                            ? "bg-green-100 text-green-700"
                            : year.status === "en-preparation"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {getAcademicYearStatusLabel(year.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {year.sourceLabel || (year.id === currentYear.id ? "Année courante" : "-")}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {year.startDate} → {year.endDate}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        {year.status !== "en-cours" && (
                          <button
                            onClick={() => handleStatusChange(year.id, "EN_COURS")}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                          >
                            Passer en cours
                          </button>
                        )}
                        {year.status === "en-cours" && (
                          <button
                            onClick={() => handleStatusChange(year.id, "ARCHIVEE")}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs hover:bg-slate-200"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archiver
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteYear(year)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Supprimer avec sauvegarde
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
