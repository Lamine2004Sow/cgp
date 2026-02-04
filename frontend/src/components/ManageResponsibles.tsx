import { useEffect, useMemo, useState } from "react";
import {
  UserRole,
  ResponsiblePerson,
  AcademicYear,
  EntiteStructure,
  canManageUsers,
  canDeleteUser,
  getRoleLabel,
} from "../types";
import { Plus, Edit, Trash2, Save, X, UserPlus, ShieldCheck } from "lucide-react";
import { apiFetch } from "../lib/api";

interface ManageResponsiblesProps {
  userRole: UserRole;
  currentYear: AcademicYear;
  entites: EntiteStructure[];
  authLogin: string | null;
}

type ApiUserRole = {
  role: string;
  entite: string;
  id_entite: number;
  id_annee: number;
};

type ApiUserRow = {
  id_user: number;
  login: string;
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  telephone: string | null;
  bureau: string | null;
  roles: ApiUserRole[] | null;
};

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

type PersonRow = ResponsiblePerson & {
  assignments: ApiUserRole[];
  login: string;
};

type EditFormData = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  bureau: string;
};

const buildEntiteMap = (entites: EntiteStructure[]) => {
  const map = new Map<number, EntiteStructure>();
  entites.forEach((entite) => map.set(entite.id_entite, entite));
  return map;
};

const resolveHierarchy = (entiteId: number, entiteMap: Map<number, EntiteStructure>) => {
  let current = entiteMap.get(entiteId);
  const result: Record<string, string> = {};
  while (current) {
    const type = current.type_entite.toLowerCase();
    if (!result[type]) {
      result[type] = current.nom;
    }
    if (!current.id_entite_parent) break;
    current = entiteMap.get(current.id_entite_parent);
  }
  return result;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const getRoleId = (role: ApiRole) => role.id_role || role.id || "";

export function ManageResponsibles({
  userRole,
  currentYear,
  entites,
  authLogin,
}: ManageResponsiblesProps) {
  const [responsibles, setResponsibles] = useState<PersonRow[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditFormData | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showAffectationFor, setShowAffectationFor] = useState<string | null>(null);
  const [affectationForm, setAffectationForm] = useState({
    id_role: "",
    id_entite: "",
    date_debut: todayIso(),
    date_fin: "",
  });
  const [newUser, setNewUser] = useState({
    login: "",
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    bureau: "",
    id_role: "",
    id_entite: "",
    date_debut: todayIso(),
    date_fin: "",
  });

  const canEdit = canManageUsers(userRole);
  const canDelete = canDeleteUser(userRole);

  const entiteMap = useMemo(() => buildEntiteMap(entites), [entites]);
  const roleLabelMap = useMemo(
    () => new Map(roles.map((role) => [getRoleId(role), role.libelle])),
    [roles],
  );

  const loadData = async () => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      const [usersData, rolesData] = await Promise.all([
        apiFetch<{ items: ApiUserRow[] }>(`/users?yearId=${currentYear.id}&pageSize=500`, {
          login: authLogin,
        }),
        apiFetch<ApiRole[] | { items: ApiRole[] }>("/roles", { login: authLogin }),
      ]);

      const mapped = (usersData.items || []).map((user) => {
        const assignments = (user.roles || []).filter(
          (role) => role && role.id_annee === Number(currentYear.id),
        );

        const hierarchy = assignments.length
          ? resolveHierarchy(assignments[0].id_entite, entiteMap)
          : {};

        const component = hierarchy.composante || hierarchy.departement || "-";
        const department = hierarchy.departement || hierarchy.mention || "-";
        const formations = assignments.map((role) => role.entite).filter(Boolean);
        const roleLabels = assignments.map((role) =>
          roleLabelMap.get(role.role) || getRoleLabel(role.role as UserRole) || role.role,
        );

        return {
          id: String(user.id_user),
          login: user.login,
          name: `${user.prenom} ${user.nom}`,
          firstName: user.prenom,
          lastName: user.nom,
          email: user.email_institutionnel || "",
          role: roleLabels.join(" / ") || "Sans role",
          department,
          component,
          phone: user.telephone || undefined,
          office: user.bureau || undefined,
          formations,
          year: currentYear.year,
          assignments,
        } satisfies PersonRow;
      });

      setResponsibles(mapped);
      const roleItems = Array.isArray(rolesData) ? rolesData : rolesData.items || [];
      setRoles(roleItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [authLogin, currentYear.id, entiteMap]);

  const startEdit = (person: PersonRow) => {
    setEditingId(person.id);
    setFormData({
      prenom: person.firstName,
      nom: person.lastName,
      email: person.email,
      telephone: person.phone || "",
      bureau: person.office || "",
    });
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormData(null);
    setNewUser({
      login: "",
      prenom: "",
      nom: "",
      email: "",
      telephone: "",
      bureau: "",
      id_role: "",
      id_entite: "",
      date_debut: todayIso(),
      date_fin: "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !formData || !authLogin) return;
    setLoading(true);
    try {
      await apiFetch(`/users/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          prenom: formData.prenom,
          nom: formData.nom,
          email_institutionnel: formData.email || null,
          telephone: formData.telephone || null,
          bureau: formData.bureau || null,
        }),
        login: authLogin,
      });
      setEditingId(null);
      setFormData(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise a jour");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!authLogin) return;
    setLoading(true);
    try {
      const affectations =
        newUser.id_role && newUser.id_entite
          ? [
              {
                id_role: newUser.id_role,
                id_entite: Number(newUser.id_entite),
                id_annee: Number(currentYear.id),
                date_debut: newUser.date_debut,
                date_fin: newUser.date_fin || null,
              },
            ]
          : undefined;

      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          login: newUser.login,
          nom: newUser.nom,
          prenom: newUser.prenom,
          email_institutionnel: newUser.email || null,
          telephone: newUser.telephone || null,
          bureau: newUser.bureau || null,
          affectations,
        }),
        login: authLogin,
      });

      setIsAdding(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la creation");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!authLogin) return;
    if (!confirm("Etes-vous sur de vouloir supprimer ce responsable ?")) return;
    setLoading(true);
    try {
      await apiFetch(`/users/${id}`, { method: "DELETE", login: authLogin });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAffectation = async (userId: string) => {
    if (!authLogin) return;
    if (!affectationForm.id_role || !affectationForm.id_entite) {
      setError("Veuillez selectionner un role et une structure");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/affectations", {
        method: "POST",
        body: JSON.stringify({
          id_user: Number(userId),
          id_role: affectationForm.id_role,
          id_entite: Number(affectationForm.id_entite),
          id_annee: Number(currentYear.id),
          date_debut: affectationForm.date_debut,
          date_fin: affectationForm.date_fin || null,
        }),
        login: authLogin,
      });
      setShowAffectationFor(null);
      setAffectationForm({
        id_role: "",
        id_entite: "",
        date_debut: todayIso(),
        date_fin: "",
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout du role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 mb-2">Gerer les Responsables</h2>
          <p className="text-slate-600">Modifier les fiches des responsables de formation (UC3)</p>
        </div>
        {canEdit && (
          <button
            onClick={startAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter un responsable
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {isAdding && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-300">
          <h3 className="text-slate-900 mb-4">Nouveau responsable</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Login" value={newUser.login} onChange={(value) => setNewUser({ ...newUser, login: value })} />
            <Field label="Prenom" value={newUser.prenom} onChange={(value) => setNewUser({ ...newUser, prenom: value })} />
            <Field label="Nom" value={newUser.nom} onChange={(value) => setNewUser({ ...newUser, nom: value })} />
            <Field label="Email" value={newUser.email} onChange={(value) => setNewUser({ ...newUser, email: value })} />
            <Field label="Telephone" value={newUser.telephone} onChange={(value) => setNewUser({ ...newUser, telephone: value })} />
            <Field label="Bureau" value={newUser.bureau} onChange={(value) => setNewUser({ ...newUser, bureau: value })} />
          </div>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <h4 className="text-slate-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Affectation initiale (optionnelle)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Role"
                value={newUser.id_role}
                onChange={(value) => setNewUser({ ...newUser, id_role: value })}
                options={roles.map((role) => ({ value: getRoleId(role), label: role.libelle }))}
                placeholder="Selectionner un role"
              />
              <Select
                label="Structure"
                value={newUser.id_entite}
                onChange={(value) => setNewUser({ ...newUser, id_entite: value })}
                options={entites.map((entite) => ({
                  value: String(entite.id_entite),
                  label: `${entite.nom} (${entite.type_entite})`,
                }))}
                placeholder="Selectionner une structure"
              />
              <Field
                label="Date debut"
                type="date"
                value={newUser.date_debut}
                onChange={(value) => setNewUser({ ...newUser, date_debut: value })}
              />
              <Field
                label="Date fin (optionnel)"
                type="date"
                value={newUser.date_fin}
                onChange={(value) => setNewUser({ ...newUser, date_fin: value })}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreateUser}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
          </div>
        </div>
      )}

      {loading && responsibles.length === 0 ? (
        <div className="text-slate-500">Chargement...</div>
      ) : (
        <div className="space-y-4">
          {responsibles.map((person) => (
            <div key={person.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              {editingId === person.id && formData ? (
                <>
                  <EditForm formData={formData} setFormData={setFormData} />
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleSaveEdit}
                      disabled={loading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
                    >
                      <Save className="w-4 h-4" />
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Annuler
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="text-slate-900">{person.name}</h3>
                      <span className="text-xs text-slate-500">{person.login}</span>
                    </div>
                    <p className="text-indigo-600 text-sm mb-3">{person.role}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <span className="text-slate-500 text-sm">Composante: </span>
                        <span className="text-slate-900">{person.component}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-sm">Departement: </span>
                        <span className="text-slate-900">{person.department}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-sm">Email: </span>
                        <span className="text-slate-900">{person.email || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-sm">Telephone: </span>
                        <span className="text-slate-900">{person.phone || "-"}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-sm">Bureau: </span>
                        <span className="text-slate-900">{person.office || "-"}</span>
                      </div>
                    </div>

                    {person.assignments.length > 0 && (
                      <div>
                        <div className="text-xs text-slate-500 mb-2">Affectations ({currentYear.year})</div>
                        <div className="flex flex-wrap gap-2">
                          {person.assignments.map((assignment) => (
                            <span
                              key={`${assignment.role}-${assignment.id_entite}`}
                              className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs"
                            >
                              {roleLabelMap.get(assignment.role) ||
                                getRoleLabel(assignment.role as UserRole) ||
                                assignment.role}{" "}
                              - {assignment.entite}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => startEdit(person)}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(person.id)}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowAffectationFor(person.id);
                          setAffectationForm({
                            id_role: "",
                            id_entite: "",
                            date_debut: todayIso(),
                            date_fin: "",
                          });
                        }}
                        className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {showAffectationFor === person.id && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h4 className="text-slate-900 mb-3">Ajouter une affectation</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Role"
                      value={affectationForm.id_role}
                      onChange={(value) => setAffectationForm({ ...affectationForm, id_role: value })}
                      options={roles.map((role) => ({ value: getRoleId(role), label: role.libelle }))}
                      placeholder="Selectionner un role"
                    />
                    <Select
                      label="Structure"
                      value={affectationForm.id_entite}
                      onChange={(value) =>
                        setAffectationForm({ ...affectationForm, id_entite: value })
                      }
                      options={entites.map((entite) => ({
                        value: String(entite.id_entite),
                        label: `${entite.nom} (${entite.type_entite})`,
                      }))}
                      placeholder="Selectionner une structure"
                    />
                    <Field
                      label="Date debut"
                      type="date"
                      value={affectationForm.date_debut}
                      onChange={(value) => setAffectationForm({ ...affectationForm, date_debut: value })}
                    />
                    <Field
                      label="Date fin (optionnel)"
                      type="date"
                      value={affectationForm.date_fin}
                      onChange={(value) => setAffectationForm({ ...affectationForm, date_fin: value })}
                    />
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => handleAddAffectation(person.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Ajouter
                    </button>
                    <button
                      onClick={() => setShowAffectationFor(null)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-slate-700 text-sm mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-slate-700 text-sm mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      >
        <option value="">{placeholder || "Selectionner"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function EditForm({
  formData,
  setFormData,
}: {
  formData: EditFormData;
  setFormData: (data: EditFormData) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field
        label="Prenom"
        value={formData.prenom}
        onChange={(value) => setFormData({ ...formData, prenom: value })}
      />
      <Field
        label="Nom"
        value={formData.nom}
        onChange={(value) => setFormData({ ...formData, nom: value })}
      />
      <Field
        label="Email"
        value={formData.email}
        onChange={(value) => setFormData({ ...formData, email: value })}
      />
      <Field
        label="Telephone"
        value={formData.telephone}
        onChange={(value) => setFormData({ ...formData, telephone: value })}
      />
      <Field
        label="Bureau"
        value={formData.bureau}
        onChange={(value) => setFormData({ ...formData, bureau: value })}
      />
    </div>
  );
}
