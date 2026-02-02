import { useEffect, useState } from "react";
import { AcademicYear, getAcademicYearStatusLabel } from "../types";
import { Calendar, Plus, Copy } from "lucide-react";
import { apiFetch } from "../lib/api";

interface YearManagementProps {
  currentYear: AcademicYear;
  authLogin: string | null;
  onRefresh?: () => Promise<void> | void;
}

type ApiYear = {
  id_annee: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  statut: "EN_COURS" | "PREPARATION" | "ARCHIVEE";
  id_annee_source?: number | null;
};

const mapYearStatus = (status: ApiYear["statut"]): AcademicYear["status"] => {
  if (status === "EN_COURS") return "en-cours";
  if (status === "PREPARATION") return "en-preparation";
  return "archivee";
};

export function YearManagement({ currentYear, authLogin, onRefresh }: YearManagementProps) {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [copyAffectations, setCopyAffectations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadYears = async () => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: ApiYear[] }>("/years", { login: authLogin });
      const mapped = data.items.map((year) => ({
        id: String(year.id_annee),
        year: year.libelle,
        status: mapYearStatus(year.statut),
        isFrozen: false,
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

  const handleCloneYear = async () => {
    if (!authLogin) return;
    const match = currentYear.year.match(/^(\d{4})-(\d{4})$/);
    if (!match) {
      setError("Format d'annee invalide");
      return;
    }

    const nextStart = Number.parseInt(match[2], 10);
    const nextEnd = nextStart + 1;
    const libelle = `${nextStart}-${nextEnd}`;
    const date_debut = `${nextStart}-09-01`;
    const date_fin = `${nextEnd}-08-31`;

    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/years/${currentYear.id}/clone`, {
        method: "POST",
        body: JSON.stringify({
          libelle,
          date_debut,
          date_fin,
          statut: "PREPARATION",
          copy_affectations: copyAffectations,
        }),
        login: authLogin,
      });
      await loadYears();
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la creation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 mb-2">Gestion des annees universitaires</h2>
          <p className="text-slate-600">Reserve aux services centraux</p>
        </div>
        <button
          onClick={handleCloneYear}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60"
        >
          <Plus className="w-5 h-5" />
          Ouvrir annee suivante
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-900">Annees existantes</h3>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={copyAffectations}
              onChange={(e) => setCopyAffectations(e.target.checked)}
              className="h-4 w-4 text-indigo-600 rounded"
            />
            Copier les affectations
          </label>
        </div>
        {loading && years.length === 0 ? (
          <div className="text-slate-500">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Annee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Source
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
                      {year.id === currentYear.id ? "Annee courante" : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-start gap-3">
        <Copy className="w-5 h-5 text-indigo-600 mt-0.5" />
        <div>
          <p className="text-indigo-900 font-medium">Duplication de l'annee</p>
          <p className="text-indigo-700 text-sm">
            La duplication copie la structure des entites. Vous pouvez aussi copier les affectations
            pour preparer l'annee suivante.
          </p>
        </div>
      </div>
    </div>
  );
}
