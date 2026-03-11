import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  User,
  Building2,
  BookOpen,
  Shuffle,
  HelpCircle,
  XCircle,
} from "lucide-react";
import { UserRole, AcademicYear, EntiteStructure } from "../types";
import { apiFetch } from "../lib/api";

interface ErrorReportsProps {
  userRole: UserRole;
  currentYear: AcademicYear;
  authLogin: string | null;
  entites: EntiteStructure[];
  currentUserId: string;
  onNavigate?: (view: string, params?: Record<string, unknown>) => void;
}

// ── Types de signalement ──────────────────────────────────────────────────────

const SIGNALEMENT_TYPES = [
  {
    value: "ERREUR_INFO_PERSONNE",
    label: "Erreur sur une personne",
    desc: "Nom, email, téléphone, bureau incorrect",
    icon: User,
    color: "text-purple-600",
    needsUser: true,
  },
  {
    value: "MAUVAISE_AFFECTATION",
    label: "Mauvaise affectation",
    desc: "Personne affectée à la mauvaise formation ou structure",
    icon: Shuffle,
    color: "text-orange-600",
    needsUser: true,
    needsEntite: true,
  },
  {
    value: "ERREUR_STRUCTURE",
    label: "Erreur sur une structure",
    desc: "Informations incorrectes sur une composante, département…",
    icon: Building2,
    color: "text-blue-600",
    needsEntite: true,
  },
  {
    value: "ERREUR_MENTION",
    label: "Erreur sur une formation",
    desc: "Mention, parcours, niveau mal renseigné",
    icon: BookOpen,
    color: "text-green-600",
    needsEntite: true,
  },
  {
    value: "AUTRE",
    label: "Autre",
    desc: "Toute autre erreur non catégorisée",
    icon: HelpCircle,
    color: "text-slate-500",
  },
] as const;

type SignalementTypeValue = (typeof SIGNALEMENT_TYPES)[number]["value"];

// ── Types API ─────────────────────────────────────────────────────────────────

type ApiSignalement = {
  id_signalement: number;
  auteur_id: number;
  traitant_id: number | null;
  cloture_par_id: number | null;
  id_entite_cible: number | null;
  id_user_cible: number | null;
  description: string;
  type_signalement: SignalementTypeValue;
  escalade_sc: boolean;
  statut: "OUVERT" | "EN_COURS" | "CLOTURE";
  date_creation: string;
  date_prise_en_charge: string | null;
  date_traitement: string | null;
  commentaire_prise_en_charge: string | null;
  commentaire_cloture: string | null;
  auteur_nom?: string | null;
  traitant_nom?: string | null;
  cloture_nom?: string | null;
  user_cible_nom?: string | null;
  user_cible_login?: string | null;
  entite_nom?: string | null;
  entite_type?: string | null;
};

type ApiUser = { id_user: number; nom: string; prenom: string; login: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusMap = {
  OUVERT: { label: "Ouvert", color: "bg-orange-100 text-orange-700", icon: Clock },
  EN_COURS: { label: "En cours", color: "bg-blue-100 text-blue-700", icon: Clock },
  CLOTURE: { label: "Clôturé", color: "bg-green-100 text-green-700", icon: CheckCircle },
};

function getTypeInfo(type: string) {
  return SIGNALEMENT_TYPES.find((t) => t.value === type) ?? SIGNALEMENT_TYPES[SIGNALEMENT_TYPES.length - 1];
}

/** Construit la liste des composantes racines depuis toutes les entites */
function getRootComposantes(entites: EntiteStructure[]) {
  return entites.filter((e) => e.type_entite === "COMPOSANTE");
}

/** Retourne les entites appartenant au sous-arbre d'une composante (par id) */
function getEntitesInComposante(entites: EntiteStructure[], composanteId: number): EntiteStructure[] {
  const result = new Set<number>();
  const queue = [composanteId];
  const byParent = new Map<number, number[]>();
  entites.forEach((e) => {
    if (e.id_entite_parent) {
      if (!byParent.has(e.id_entite_parent)) byParent.set(e.id_entite_parent, []);
      byParent.get(e.id_entite_parent)!.push(e.id_entite);
    }
  });
  while (queue.length) {
    const id = queue.shift()!;
    result.add(id);
    (byParent.get(id) ?? []).forEach((child) => queue.push(child));
  }
  return entites.filter((e) => result.has(e.id_entite));
}

// ── Composant principal ───────────────────────────────────────────────────────

export function ErrorReports({
  userRole,
  currentYear,
  authLogin,
  entites,
  currentUserId,
  onNavigate,
}: ErrorReportsProps) {
  const [reports, setReports] = useState<ApiSignalement[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "OUVERT" | "EN_COURS" | "CLOTURE">("all");
  const [filterComposante, setFilterComposante] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closingComment, setClosingComment] = useState("");

  const [form, setForm] = useState({
    type: "AUTRE" as SignalementTypeValue,
    description: "",
    entiteId: "",
    userId: "",
  });

  const isSC = userRole === "services-centraux" || userRole === "administrateur";
  const isManager =
    userRole === "directeur-composante" ||
    userRole === "directeur-administratif" ||
    userRole === "directeur-administratif-adjoint";
  const canManage = isSC || isManager;

  const composantes = useMemo(() => getRootComposantes(entites), [entites]);

  const filteredEntites = useMemo(() => {
    if (!filterComposante) return entites;
    return getEntitesInComposante(entites, Number(filterComposante));
  }, [entites, filterComposante]);

  // Entites disponibles dans le formulaire (filtrées par composante sélectionnée)
  const formEntites = useMemo(() => {
    if (isSC && filterComposante) return filteredEntites;
    return entites;
  }, [entites, filteredEntites, isSC, filterComposante]);

  const selectedType = useMemo(() => getTypeInfo(form.type), [form.type]);

  const loadData = async () => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      const [reportsData, usersData] = await Promise.all([
        apiFetch<{ items: ApiSignalement[] }>("/signalements", { login: authLogin }),
        apiFetch<{ items: ApiUser[] }>(`/users?yearId=${currentYear.id}&pageSize=500`, {
          login: authLogin,
        }),
      ]);
      setReports(reportsData.items || []);
      setUsers(usersData.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [authLogin, currentYear.id]);

  const handleSubmit = async () => {
    if (!authLogin) return;
    if (!form.description.trim()) {
      setError("La description est obligatoire");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/signalements", {
        method: "POST",
        body: JSON.stringify({
          type_signalement: form.type,
          description: form.description.trim(),
          id_entite_cible: form.entiteId ? Number(form.entiteId) : null,
          id_user_cible: form.userId ? Number(form.userId) : null,
        }),
        login: authLogin,
      });
      setShowForm(false);
      setForm({ type: "AUTRE", description: "", entiteId: "", userId: "" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du signalement");
    } finally {
      setLoading(false);
    }
  };

  const handleTake = async (id: number) => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/signalements/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ statut: "EN_COURS" }),
        login: authLogin,
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (id: number) => {
    if (!authLogin || !closingComment.trim()) {
      setError("Le commentaire de clôture est obligatoire");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/signalements/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ statut: "CLOTURE", commentaire: closingComment.trim() }),
        login: authLogin,
      });
      setClosingId(null);
      setClosingComment("");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleEscalade = async (id: number) => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/signalements/${id}/escalade`, { method: "PATCH", login: authLogin });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'escalade");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (filterStatus !== "all" && r.statut !== filterStatus) return false;
      if (filterComposante && r.id_entite_cible) {
        const inScope = filteredEntites.some((e) => e.id_entite === r.id_entite_cible);
        if (!inScope) return false;
      }
      return true;
    });
  }, [reports, filterStatus, filterComposante, filteredEntites]);

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-slate-900 mb-1">Signalements</h2>
          <p className="text-slate-600 text-sm">
            Signalez une erreur dans l'annuaire.
            {canManage && " En tant que responsable, vous pouvez prendre en charge et clôturer les signalements de votre périmètre."}
            {isSC && " Les services centraux voient tous les signalements et reçoivent les escalades."}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
        >
          <AlertTriangle className="w-5 h-5" />
          Nouveau signalement
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Formulaire de création */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
          <h3 className="text-slate-900">Nouveau signalement</h3>

          {/* Sélection du type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Type d'erreur <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {SIGNALEMENT_TYPES.map((t) => {
                const Icon = t.icon;
                const selected = form.type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.value, userId: "", entiteId: "" })}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      selected
                        ? "border-orange-500 bg-orange-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className={`flex items-center gap-2 font-medium text-sm ${t.color}`}>
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Personne ciblée */}
          {"needsUser" in selectedType && selectedType.needsUser && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Personne concernée <span className="text-red-500">*</span>
              </label>
              <select
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Sélectionner une personne</option>
                {users.map((u) => (
                  <option key={u.id_user} value={u.id_user}>
                    {u.prenom} {u.nom} ({u.login})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Structure ciblée */}
          {"needsEntite" in selectedType && selectedType.needsEntite && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Structure concernée
              </label>
              <select
                value={form.entiteId}
                onChange={(e) => setForm({ ...form, entiteId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Sélectionner une structure</option>
                {formEntites.map((e) => (
                  <option key={e.id_entite} value={e.id_entite}>
                    {e.nom} ({e.type_entite})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description de l'erreur <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              placeholder="Décrivez précisément l'erreur et la correction attendue…"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-60"
            >
              <AlertTriangle className="w-4 h-4" />
              Envoyer
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des signalements */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <h3 className="text-slate-900 mr-auto">Signalements</h3>

          {/* Filtre composante (SC uniquement) */}
          {isSC && composantes.length > 0 && (
            <select
              value={filterComposante}
              onChange={(e) => setFilterComposante(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">Toutes les composantes</option>
              {composantes.map((c) => (
                <option key={c.id_entite} value={c.id_entite}>
                  {c.nom}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="OUVERT">Ouverts</option>
            <option value="EN_COURS">En cours</option>
            <option value="CLOTURE">Clôturés</option>
          </select>
        </div>

        {loading && reports.length === 0 ? (
          <div className="text-slate-500">Chargement…</div>
        ) : filteredReports.length === 0 ? (
          <div className="text-slate-500 py-6 text-center">
            {reports.length === 0 ? "Aucun signalement" : "Aucun signalement correspondant aux filtres"}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <SignalementCard
                key={report.id_signalement}
                report={report}
                currentUserId={currentUserId}
                isManager={isManager}
                isSC={isSC}
                closingId={closingId}
                closingComment={closingComment}
                onTake={handleTake}
                onClose={handleClose}
                onEscalade={handleEscalade}
                onSetClosing={(id, comment) => {
                  setClosingId(id);
                  setClosingComment(comment);
                }}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Carte d'un signalement ────────────────────────────────────────────────────

function SignalementCard({
  report,
  currentUserId,
  isManager,
  isSC,
  closingId,
  closingComment,
  onTake,
  onClose,
  onEscalade,
  onSetClosing,
  onNavigate,
}: {
  report: ApiSignalement;
  currentUserId: string;
  isManager: boolean;
  isSC: boolean;
  closingId: number | null;
  closingComment: string;
  onTake: (id: number) => void;
  onClose: (id: number) => void;
  onEscalade: (id: number) => void;
  onSetClosing: (id: number | null, comment: string) => void;
  onNavigate?: (view: string, params?: Record<string, unknown>) => void;
}) {
  const status = statusMap[report.statut];
  const StatusIcon = status.icon;
  const typeInfo = getTypeInfo(report.type_signalement);
  const TypeIcon = typeInfo.icon;
  const isMine = report.traitant_id && String(report.traitant_id) === currentUserId;
  const isClosing = closingId === report.id_signalement;
  const canManage = isSC || isManager;

  // Lien "Corriger" selon le type
  const handleFix = () => {
    if (!onNavigate) return;
    switch (report.type_signalement) {
      case "ERREUR_INFO_PERSONNE":
        // Aller sur la fiche de la personne cible
        if (report.id_user_cible) {
          onNavigate("manage-responsibles", { focusUserId: report.id_user_cible });
        } else {
          onNavigate("manage-responsibles");
        }
        break;
      case "MAUVAISE_AFFECTATION":
        onNavigate("manage-responsibles", {
          focusEntiteId: report.id_entite_cible,
          focusUserId: report.id_user_cible,
        });
        break;
      case "ERREUR_STRUCTURE":
      case "ERREUR_MENTION":
        onNavigate("manage-structures", { focusEntiteId: report.id_entite_cible });
        break;
      default:
        onNavigate("manage-responsibles");
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 ${
        report.escalade_sc ? "border-red-300 bg-red-50/30" : "border-slate-200"
      }`}
    >
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`flex items-center gap-1 text-sm font-medium ${typeInfo.color}`}>
              <TypeIcon className="w-4 h-4" />
              {typeInfo.label}
            </span>
            {report.escalade_sc && (
              <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                <ArrowUpCircle className="w-3 h-3" />
                Escaladé aux SC
              </span>
            )}
          </div>
          <p className="text-slate-800 text-sm">{report.description}</p>
        </div>
        <span className={`shrink-0 px-3 py-1 rounded-full text-xs flex items-center gap-1 ${status.color}`}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>

      {/* Métadonnées */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>#{report.id_signalement}</span>
        <span>{new Date(report.date_creation).toLocaleDateString("fr-FR")}</span>
        <span>Par : <span className="font-medium">{report.auteur_nom ?? `#${report.auteur_id}`}</span></span>
        {report.user_cible_nom && (
          <span>Personne : <span className="font-medium text-slate-700">{report.user_cible_nom}</span></span>
        )}
        {report.entite_nom && (
          <span>Structure : <span className="font-medium text-slate-700">{report.entite_nom}</span></span>
        )}
        {report.statut !== "OUVERT" && report.traitant_nom && (
          <span>
            Traité par : <span className="font-medium">{report.traitant_nom}</span>
            {report.date_prise_en_charge && (
              <> le {new Date(report.date_prise_en_charge).toLocaleDateString("fr-FR")}</>
            )}
          </span>
        )}
      </div>

      {/* Notes prise en charge */}
      {report.commentaire_prise_en_charge && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2.5 text-xs text-blue-800">
          <span className="font-medium">Note : </span>{report.commentaire_prise_en_charge}
        </div>
      )}

      {/* Commentaire clôture */}
      {report.statut === "CLOTURE" && report.commentaire_cloture && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded p-2.5 text-xs text-green-800">
          <span className="font-medium">Clôture ({report.cloture_nom}) : </span>{report.commentaire_cloture}
        </div>
      )}

      {/* Actions */}
      {canManage && (
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Bouton Corriger (lien direct) */}
          {onNavigate && report.statut !== "CLOTURE" && (
            <button
              onClick={handleFix}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Aller corriger
            </button>
          )}

          {/* Prendre en charge */}
          {report.statut === "OUVERT" && (
            <button
              onClick={() => onTake(report.id_signalement)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Prendre en charge
            </button>
          )}

          {/* Escalader (DC uniquement, si pas déjà escaladé) */}
          {isManager && !isSC && !report.escalade_sc && report.statut !== "CLOTURE" && (
            <button
              onClick={() => onEscalade(report.id_signalement)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition-colors"
              title="Transmettre aux services centraux"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              Escalader aux SC
            </button>
          )}

          {/* Clôturer (si en cours et assigné à moi, ou SC) */}
          {report.statut === "EN_COURS" && (isMine || isSC) && !isClosing && (
            <button
              onClick={() => onSetClosing(report.id_signalement, "")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Clôturer
            </button>
          )}
        </div>
      )}

      {/* Zone clôture */}
      {isClosing && (
        <div className="mt-3 space-y-2">
          <textarea
            value={closingComment}
            onChange={(e) => onSetClosing(report.id_signalement, e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500"
            placeholder="Décrivez la correction apportée (obligatoire)…"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => onClose(report.id_signalement)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Confirmer la clôture
            </button>
            <button
              onClick={() => onSetClosing(null, "")}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
