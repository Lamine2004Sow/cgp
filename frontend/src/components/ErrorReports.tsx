import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { UserRole, AcademicYear, EntiteStructure } from "../types";
import { apiFetch } from "../lib/api";

interface ErrorReportsProps {
  userRole: UserRole;
  currentYear: AcademicYear;
  authLogin: string | null;
  entites: EntiteStructure[];
  currentUserId: string;
}

type ApiSignalement = {
  id_signalement: number;
  auteur_id: number;
  traitant_id: number | null;
  cloture_par_id: number | null;
  id_entite_cible: number | null;
  description: string;
  statut: "OUVERT" | "EN_COURS" | "CLOTURE";
  date_creation: string;
  date_prise_en_charge: string | null;
  date_traitement: string | null;
  commentaire_prise_en_charge: string | null;
  commentaire_cloture: string | null;
  auteur_nom?: string | null;
  auteur_prenom?: string | null;
  traitant_nom?: string | null;
  traitant_prenom?: string | null;
  cloture_nom?: string | null;
  cloture_prenom?: string | null;
};

const statusMap = {
  OUVERT: { label: "Ouvert", color: "bg-orange-100 text-orange-700", icon: Clock },
  EN_COURS: { label: "En cours", color: "bg-blue-100 text-blue-700", icon: Clock },
  CLOTURE: { label: "Cloture", color: "bg-green-100 text-green-700", icon: CheckCircle },
};

export function ErrorReports({ userRole, currentYear, authLogin, entites, currentUserId }: ErrorReportsProps) {
  const [reports, setReports] = useState<ApiSignalement[]>([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "OUVERT" | "EN_COURS" | "CLOTURE">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ description: "", entiteId: "" });
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closingComment, setClosingComment] = useState("");

  const canManage =
    userRole === "directeur-composante" ||
    userRole === "directeur-administratif" ||
    userRole === "directeur-administratif-adjoint" ||
    userRole === "administrateur" ||
    userRole === "services-centraux";

  const loadReports = async () => {
    if (!authLogin || !canManage) return;
    setLoading(true);
    setError(null);
    try {
      const params = filterStatus === "all" ? "" : `?statut=${filterStatus}`;
      const data = await apiFetch<{ items: ApiSignalement[] }>(`/signalements${params}`, {
        login: authLogin,
      });
      setReports(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [authLogin, filterStatus]);

  const handleSubmitReport = async () => {
    if (!authLogin) return;
    if (!form.description.trim()) {
      setError("Veuillez renseigner la description");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiFetch("/signalements", {
        method: "POST",
        body: JSON.stringify({
          description: form.description.trim(),
          id_entite_cible: form.entiteId ? Number(form.entiteId) : null,
        }),
        login: authLogin,
      });
      setShowReportForm(false);
      setForm({ description: "", entiteId: "" });
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du signalement");
    } finally {
      setLoading(false);
    }
  };

  const handleTakeReport = async (reportId: number) => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/signalements/${reportId}`, {
        method: "PATCH",
        body: JSON.stringify({ statut: "EN_COURS" }),
        login: authLogin,
      });
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du traitement");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseReport = async (reportId: number) => {
    if (!authLogin) return;
    if (!closingComment.trim()) {
      setError("Le commentaire de cloture est obligatoire");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/signalements/${reportId}`, {
        method: "PATCH",
        body: JSON.stringify({ statut: "CLOTURE", commentaire: closingComment.trim() }),
        login: authLogin,
      });
      setClosingId(null);
      setClosingComment("");
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la cloture");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((report) => {
    if (filterStatus === "all") return true;
    return report.statut === filterStatus;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 mb-2">Signalements d'erreurs</h2>
          <p className="text-slate-600">Signaler une erreur dans l'annuaire</p>
        </div>
        <button
          onClick={() => setShowReportForm(!showReportForm)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
        >
          <AlertTriangle className="w-5 h-5" />
          Signaler une erreur
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {showReportForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-slate-900 mb-4">Nouveau signalement</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Structure cible</label>
              <select
                value={form.entiteId}
                onChange={(e) => setForm({ ...form, entiteId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">Selectionner une structure</option>
                {entites.map((entite) => (
                  <option key={entite.id_entite} value={entite.id_entite}>
                    {entite.nom} ({entite.type_entite})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Decrivez l'erreur constatee et la correction a apporter..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmitReport}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                <AlertTriangle className="w-4 h-4" />
                Envoyer
              </button>
              <button
                onClick={() => setShowReportForm(false)}
                className="flex items-center gap-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {canManage && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-900">Signalements recus</h3>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as "all" | "OUVERT" | "EN_COURS" | "CLOTURE")
              }
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="all">Tous</option>
              <option value="OUVERT">Ouverts</option>
              <option value="EN_COURS">En cours</option>
              <option value="CLOTURE">Clotures</option>
            </select>
          </div>

          {loading && reports.length === 0 ? (
            <div className="text-slate-500">Chargement...</div>
          ) : filteredReports.length === 0 ? (
            <div className="text-slate-500">Aucun signalement</div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => {
                const status = statusMap[report.statut];
                const StatusIcon = status.icon;
                const isMine = report.traitant_id && String(report.traitant_id) === currentUserId;
                const isClosing = closingId === report.id_signalement;
                const auteur = report.auteur_nom
                  ? `${report.auteur_prenom || ""} ${report.auteur_nom}`.trim()
                  : `Utilisateur ${report.auteur_id}`;
                const traitant = report.traitant_nom
                  ? `${report.traitant_prenom || ""} ${report.traitant_nom}`.trim()
                  : report.traitant_id
                  ? `Utilisateur ${report.traitant_id}`
                  : "-";
                const cloture = report.cloture_nom
                  ? `${report.cloture_prenom || ""} ${report.cloture_nom}`.trim()
                  : report.cloture_par_id
                  ? `Utilisateur ${report.cloture_par_id}`
                  : "-";
                return (
                  <div key={report.id_signalement} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-slate-900 font-medium mb-1">Signalement #{report.id_signalement}</div>
                        <div className="text-sm text-slate-600">{report.description}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-3 text-xs text-slate-500 space-y-1">
                      <div>Cree le {new Date(report.date_creation).toLocaleDateString("fr-FR")}</div>
                      <div>Auteur: {auteur}</div>
                      {report.statut !== "OUVERT" && <div>Pris en charge par: {traitant}</div>}
                      {report.statut === "CLOTURE" && <div>Cloture par: {cloture}</div>}
                    </div>

                    {report.statut === "OUVERT" && (
                      <div className="mt-4">
                        <button
                          onClick={() => handleTakeReport(report.id_signalement)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Clock className="w-4 h-4" />
                          Prendre en charge
                        </button>
                      </div>
                    )}

                    {report.statut === "EN_COURS" && isMine && (
                      <div className="mt-4 space-y-3">
                        <textarea
                          value={isClosing ? closingComment : ""}
                          onChange={(e) => {
                            setClosingId(report.id_signalement);
                            setClosingComment(e.target.value);
                          }}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          placeholder="Commentaire de cloture (obligatoire)"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCloseReport(report.id_signalement)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Cloturer
                          </button>
                          <button
                            onClick={() => {
                              setClosingId(null);
                              setClosingComment("");
                            }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}

                    {report.statut === "EN_COURS" && !isMine && (
                      <div className="mt-4 text-xs text-slate-500">En cours de traitement.</div>
                    )}

                    {report.statut === "CLOTURE" && report.commentaire_cloture && (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                        Commentaire: {report.commentaire_cloture}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
