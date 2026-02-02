import { useEffect, useMemo, useState } from "react";
import { Shield, Check, X, FileText, AlertCircle, Plus } from "lucide-react";
import { AcademicYear } from "../types";
import { apiFetch } from "../lib/api";

interface ManageRolesProps {
  currentYear: AcademicYear;
  authLogin: string | null;
}

type ApiRole = {
  id_role?: string;
  id?: string;
  libelle: string;
  description?: string | null;
  niveau_hierarchique?: number;
  niveauHierarchique?: number;
  is_global?: boolean;
  isGlobal?: boolean;
};

type ApiRoleRequest = {
  id_demande_role: number;
  role_propose: string;
  description: string | null;
  justificatif: string | null;
  statut: "EN_ATTENTE" | "VALIDEE" | "REFUSEE";
  date_creation: string;
  date_decision: string | null;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const formatDate = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR");
};

const getRoleId = (role: ApiRole) => role.id_role || role.id || "";
const getRoleLevel = (role: ApiRole) =>
  role.niveau_hierarchique ?? role.niveauHierarchique ?? 999;
const isRoleGlobal = (role: ApiRole) => role.is_global ?? role.isGlobal ?? true;

export function ManageRoles({ currentYear, authLogin }: ManageRolesProps) {
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [requests, setRequests] = useState<ApiRoleRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    roleName: "",
    description: "",
    justificatif: "",
  });

  const loadData = async () => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      const rolesData = await apiFetch<ApiRole[] | { items: ApiRole[] }>("/roles", {
        login: authLogin,
      });
      const roleItems = Array.isArray(rolesData) ? rolesData : rolesData.items || [];
      const sortedRoles = [...roleItems].sort(
        (a, b) => getRoleLevel(a) - getRoleLevel(b),
      );
      setRoles(sortedRoles);

      try {
        const requestsData = await apiFetch<{ items: ApiRoleRequest[] }>("/roles/requests", {
          login: authLogin,
        });
        setRequests(requestsData.items || []);
      } catch (err) {
        setRequests([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [authLogin, currentYear.id]);

  const globalRoles = useMemo(
    () => roles.filter((role) => isRoleGlobal(role)),
    [roles],
  );
  const customRoles = useMemo(
    () => roles.filter((role) => !isRoleGlobal(role)),
    [roles],
  );

  const handleSubmitRequest = async () => {
    if (!authLogin) return;
    if (!newRequest.roleName.trim() || !newRequest.description.trim()) {
      setError("Veuillez renseigner le role et la description");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiFetch("/roles/requests", {
        method: "POST",
        body: JSON.stringify({
          role_propose: newRequest.roleName.trim(),
          description: newRequest.description.trim(),
          justificatif: newRequest.justificatif.trim() || null,
        }),
        login: authLogin,
      });

      setShowRequestForm(false);
      setNewRequest({ roleName: "", description: "", justificatif: "" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la demande");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewRequest = async (request: ApiRoleRequest, statut: "VALIDEE" | "REFUSEE") => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      const roleId = slugify(request.role_propose);
      await apiFetch(`/roles/requests/${request.id_demande_role}`, {
        method: "PATCH",
        body: JSON.stringify({
          statut,
          role_id: roleId || request.role_propose,
          libelle: request.role_propose,
        }),
        login: authLogin,
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la validation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-slate-900 mb-2">Gestion des roles</h2>
        <p className="text-slate-600">Roles preetablis et demandes de roles specifiques</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Roles preetablis (globaux)
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Roles communs a toutes les composantes
          </p>
        </div>
        <div className="p-6">
          {loading && globalRoles.length === 0 ? (
            <div className="text-slate-500">Chargement...</div>
          ) : (
            <div className="space-y-3">
              {globalRoles.map((role) => (
                <div
                  key={getRoleId(role)}
                  className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-slate-900 font-medium">{role.libelle}</h4>
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">
                        Niveau {getRoleLevel(role)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {role.description || getRoleId(role)}
                    </p>
                  </div>
                  <div className="ml-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Actif
                    </span>
                  </div>
                </div>
              ))}
              {globalRoles.length === 0 && (
                <div className="text-slate-500">Aucun role global</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            Roles specifiques
          </h3>
          <p className="text-sm text-slate-600 mt-1">Roles valides par services centraux</p>
        </div>
        <div className="p-6">
          {customRoles.length === 0 ? (
            <div className="text-slate-500">Aucun role specifique</div>
          ) : (
            <div className="space-y-3">
              {customRoles.map((role) => (
                <div key={getRoleId(role)} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-slate-900 font-medium">{role.libelle}</div>
                      <div className="text-sm text-slate-600">
                        {role.description || getRoleId(role)}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                      Specifique
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              Demandes de roles
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Roles propres a certaines composantes - validation par services centraux
            </p>
          </div>
          <button
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouvelle demande
          </button>
        </div>

        {showRequestForm && (
          <div className="p-6 border-b border-slate-200 bg-orange-50">
            <h4 className="text-slate-900 mb-4">Demander un role specifique</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom du role propose <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRequest.roleName}
                  onChange={(e) => setNewRequest({ ...newRequest, roleName: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Ex: Responsable Qualite"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Decrivez le role et la justification"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Justificatif</label>
                <textarea
                  value={newRequest.justificatif}
                  onChange={(e) => setNewRequest({ ...newRequest, justificatif: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Informations complementaires"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSubmitRequest}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  Soumettre
                </button>
                <button
                  onClick={() => setShowRequestForm(false)}
                  className="flex items-center gap-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {requests.length === 0 ? (
            <div className="text-slate-500">Aucune demande</div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id_demande_role}
                  className="border border-slate-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-slate-900 font-medium mb-1">{request.role_propose}</div>
                      <div className="text-sm text-slate-600">{request.description}</div>
                    </div>
                    <StatusBadge status={request.statut} />
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Demande du {formatDate(request.date_creation)}
                  </div>
                  {request.statut === "EN_ATTENTE" && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleReviewRequest(request, "VALIDEE")}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Valider
                      </button>
                      <button
                        onClick={() => handleReviewRequest(request, "REFUSEE")}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Refuser
                      </button>
                    </div>
                  )}
                  {request.statut !== "EN_ATTENTE" && request.date_decision && (
                    <div className="text-xs text-slate-500 mt-2">Decision le {formatDate(request.date_decision)}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ApiRoleRequest["statut"] }) {
  if (status === "VALIDEE") {
    return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">Validee</span>;
  }
  if (status === "REFUSEE") {
    return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">Refusee</span>;
  }
  return (
    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">En attente</span>
  );
}
