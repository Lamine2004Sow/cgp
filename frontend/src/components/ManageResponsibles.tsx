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
import { Plus, Edit, Trash2, Save, X, UserPlus, ShieldCheck, Users } from "lucide-react";
import { apiFetch } from "../lib/api";
import { FilterBar } from "./ui/filter-bar";
import { readQueryParam, writeQueryParams } from "../lib/url-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface ManageResponsiblesProps {
  userRole: UserRole;
  currentYear: AcademicYear;
  entites: EntiteStructure[];
  authLogin: string | null;
  focusUserId?: number | null;
}

type ApiUserRole = {
  id_affectation: number;
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
  email_institutionnel_secondaire: string | null;
  genre: string | null;
  categorie: string | null;
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

const GENDER_LABELS: Record<string, string> = {
  M: "Monsieur",
  F: "Madame",
};

const CATEGORY_LABELS: Record<string, string> = {
  EC: "Enseignant-chercheur",
  BIATSS: "BIATSS",
  ESAS: "ESAS",
  CONTRACTUEL: "Contractuel",
  VACATAIRE: "Vacataire",
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
const createEmptyAffectationForm = () => ({
  id_role: "",
  id_entite: "",
  date_debut: todayIso(),
  date_fin: "",
});
const createEmptyUser = () => ({
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

const getRoleId = (role: ApiRole) => role.id_role || role.id || "";

export function ManageResponsibles({
  userRole,
  currentYear,
  entites,
  authLogin,
  focusUserId,
}: ManageResponsiblesProps) {
  const [responsibles, setResponsibles] = useState<PersonRow[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditFormData | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showAffectationFor, setShowAffectationFor] = useState<string | null>(null);
  const [affectationForm, setAffectationForm] = useState(createEmptyAffectationForm);
  const [newUser, setNewUser] = useState(createEmptyUser);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterComposante, setFilterComposante] = useState<string>("");
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [confirmDeleteAffId, setConfirmDeleteAffId] = useState<number | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  const canEdit = canManageUsers(userRole);
  const canDelete = canDeleteUser(userRole);

  const entiteMap = useMemo(() => buildEntiteMap(entites), [entites]);
  const composantes = useMemo(
    () => entites.filter((e) => e.type_entite === "COMPOSANTE"),
    [entites],
  );
  const roleLabelMap = useMemo(
    () => new Map(roles.map((role) => [getRoleId(role), role.libelle])),
    [roles],
  );

  const editingPerson = useMemo(
    () => responsibles.find((person) => person.id === editingId) ?? null,
    [responsibles, editingId],
  );

  const affectationPerson = useMemo(
    () => responsibles.find((person) => person.id === showAffectationFor) ?? null,
    [responsibles, showAffectationFor],
  );

  const deleteUserTarget = useMemo(
    () => responsibles.find((person) => person.id === confirmDeleteUserId) ?? null,
    [responsibles, confirmDeleteUserId],
  );

  const deleteAffectationTarget = useMemo(() => {
    if (confirmDeleteAffId === null) return null;

    for (const person of responsibles) {
      const assignment = person.assignments.find(
        (item) => item.id_affectation === confirmDeleteAffId,
      );
      if (assignment) {
        return { person, assignment };
      }
    }

    return null;
  }, [confirmDeleteAffId, responsibles]);

  const filteredResponsibles = useMemo(() => {
    const q = search.toLowerCase().trim();
    return responsibles.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.login.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.secondaryEmail?.toLowerCase().includes(q) ||
        p.assignments.some((a) => {
          // Remonte la hiérarchie pour trouver un code_composante correspondant
          let current: EntiteStructure | undefined = entiteMap.get(a.id_entite);
          while (current) {
            if (current.code_composante?.toLowerCase().includes(q)) return true;
            if (!current.id_entite_parent) break;
            current = entiteMap.get(current.id_entite_parent);
          }
          return false;
        });
      const matchRole =
        !filterRole ||
        p.assignments.some((a) => a.role === filterRole);
      const matchComposante =
        !filterComposante ||
        p.assignments.some((a) => {
          const entite = entiteMap.get(a.id_entite);
          if (!entite) return false;
          // Cherche la composante dans la hiérarchie
          let current: typeof entite | undefined = entite;
          while (current) {
            if (String(current.id_entite) === filterComposante) return true;
            if (!current.id_entite_parent) break;
            current = entiteMap.get(current.id_entite_parent);
          }
          return false;
        });
      return matchSearch && matchRole && matchComposante;
    });
  }, [responsibles, search, filterRole, filterComposante, entiteMap]);

  const hasActiveFilters = Boolean(search || filterRole || filterComposante);

  const resetFilters = () => {
    setSearch("");
    setFilterRole("");
    setFilterComposante("");
  };

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
          secondaryEmail: user.email_institutionnel_secondaire || undefined,
          genre: user.genre || undefined,
          category: user.categorie || undefined,
          role: roleLabels.join(" / ") || "Sans rôle",
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

  useEffect(() => {
    setSearch(readQueryParam("mr_q"));
    setFilterRole(readQueryParam("mr_role"));
    setFilterComposante(readQueryParam("mr_comp"));
    setFiltersHydrated(true);
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;
    writeQueryParams({
      mr_q: search,
      mr_role: filterRole,
      mr_comp: filterComposante,
    });
  }, [search, filterRole, filterComposante, filtersHydrated]);

  useEffect(() => {
    if (!focusUserId || responsibles.length === 0) return;
    const targetId = String(focusUserId);
    const el = document.getElementById(`user-row-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedId(targetId);
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [focusUserId, responsibles]);

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
    setNewUser(createEmptyUser());
  };

  const closeEditDialog = () => {
    setEditingId(null);
    setFormData(null);
  };

  const closeAffectationDialog = () => {
    setShowAffectationFor(null);
    setAffectationForm(createEmptyAffectationForm());
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
      closeEditDialog();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise a jour");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!authLogin) return;
    if (!newUser.login.trim()) { setError("Le login est obligatoire"); return; }
    if (!newUser.nom.trim()) { setError("Le nom est obligatoire"); return; }
    if (!newUser.prenom.trim()) { setError("Le prénom est obligatoire"); return; }
    setError(null);
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
      setNewUser(createEmptyUser());
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la creation");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteUserId || !authLogin) return;
    setLoading(true);
    try {
      await apiFetch(`/users/${confirmDeleteUserId}`, { method: "DELETE", login: authLogin });
      setConfirmDeleteUserId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAffectation = async (affectationId: number) => {
    if (!authLogin) return;
    setLoading(true);
    try {
      await apiFetch(`/affectations/${affectationId}`, { method: "DELETE", login: authLogin });
      setConfirmDeleteAffId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression de l'affectation");
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
      closeAffectationDialog();
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
          <h2 className="text-slate-900 mb-2">
            {canEdit ? "Gérer les responsables" : "Consulter les responsables"}
          </h2>
          <p className="text-slate-600">
            {canEdit
              ? "Modifier les fiches et affectations des responsables de formation (UC3)."
              : "Liste des responsables — consultation seule. Les modifications sont réservées au directeur de composante et aux DA."}
          </p>
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

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nouveau responsable</DialogTitle>
            <DialogDescription>
              Créez une fiche et ajoutez une affectation initiale si nécessaire.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Login" value={newUser.login} onChange={(value) => setNewUser({ ...newUser, login: value })} />
            <Field label="Prénom" value={newUser.prenom} onChange={(value) => setNewUser({ ...newUser, prenom: value })} />
            <Field label="Nom" value={newUser.nom} onChange={(value) => setNewUser({ ...newUser, nom: value })} />
            <Field label="Email" value={newUser.email} onChange={(value) => setNewUser({ ...newUser, email: value })} />
            <Field label="Téléphone" value={newUser.telephone} onChange={(value) => setNewUser({ ...newUser, telephone: value })} />
            <Field label="Bureau" value={newUser.bureau} onChange={(value) => setNewUser({ ...newUser, bureau: value })} />
          </div>

          <div className="mt-2 border-t border-slate-200 pt-4">
            <h4 className="text-slate-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Affectation initiale (optionnelle)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Rôle"
                value={newUser.id_role}
                onChange={(value) => setNewUser({ ...newUser, id_role: value })}
                options={roles.map((role) => ({ value: getRoleId(role), label: role.libelle }))}
                placeholder="Sélectionner un rôle"
              />
              <Select
                label="Structure"
                value={newUser.id_entite}
                onChange={(value) => setNewUser({ ...newUser, id_entite: value })}
                options={entites.map((entite) => ({
                  value: String(entite.id_entite),
                  label: `${entite.nom} (${entite.type_entite})`,
                }))}
                placeholder="Sélectionner une structure"
              />
              <Field
                label="Date de début"
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

          <DialogFooter className="mt-6">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
            <button
              onClick={handleCreateUser}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FilterBar
        fields={[
          {
            key: "search",
            label: "Recherche",
            type: "search",
            value: search,
            onChange: (value) => setSearch(value),
            placeholder: "Rechercher par nom, login ou email...",
          },
          {
            key: "role",
            label: "Rôle",
            type: "select",
            value: filterRole,
            onChange: (value) => setFilterRole(value),
            options: [
              { value: "", label: "Tous les rôles" },
              ...roles.map((role) => ({ value: getRoleId(role), label: role.libelle })),
            ],
          },
          {
            key: "composante",
            label: "Composante",
            type: "select",
            value: filterComposante,
            onChange: (value) => setFilterComposante(value),
            options: [
              { value: "", label: "Toutes les composantes" },
              ...composantes.map((c) => ({
                value: String(c.id_entite),
                label: c.code_composante ? `${c.nom} (${c.code_composante})` : c.nom,
              })),
            ],
          },
        ]}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
      />

      <Dialog
        open={Boolean(editingId && formData)}
        onOpenChange={(open) => {
          if (!open) closeEditDialog();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier responsable</DialogTitle>
            <DialogDescription>
              {editingPerson
                ? `${editingPerson.name} (${editingPerson.login})`
                : "Mettez à jour les informations."}
            </DialogDescription>
          </DialogHeader>
          {formData && <EditForm formData={formData} setFormData={setFormData} />}
          <DialogFooter className="mt-6">
            <button
              onClick={closeEditDialog}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={loading || !formData}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(showAffectationFor && affectationPerson)}
        onOpenChange={(open) => {
          if (!open) closeAffectationDialog();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter une affectation</DialogTitle>
            <DialogDescription>
              {`${affectationPerson?.name} (${affectationPerson?.login})`}
            </DialogDescription>
          </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Rôle"
                value={affectationForm.id_role}
                onChange={(value) => setAffectationForm({ ...affectationForm, id_role: value })}
                options={roles.map((role) => ({ value: getRoleId(role), label: role.libelle }))}
                placeholder="Sélectionner un rôle"
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
                placeholder="Sélectionner une structure"
              />
              <Field
                label="Date de début"
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
            <DialogFooter className="mt-4">
              <button
                onClick={closeAffectationDialog}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
              <button
                onClick={() => showAffectationFor && handleAddAffectation(showAffectationFor)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Ajouter
              </button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading && responsibles.length === 0 ? (
        <div className="text-slate-500">Chargement...</div>
      ) : filteredResponsibles.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-200 flex flex-col items-center gap-3 text-slate-400">
          <Users className="w-12 h-12" />
          <p className="font-medium">
            {search || filterRole || filterComposante ? "Aucun résultat pour cette recherche" : "Aucun responsable pour cette année"}
          </p>
          {(search || filterRole || filterComposante) && (
            <button onClick={() => { setSearch(""); setFilterRole(""); setFilterComposante(""); }} className="text-sm text-indigo-600 hover:underline">
              Effacer les filtres
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-slate-500">{filteredResponsibles.length} résultat{filteredResponsibles.length > 1 ? "s" : ""}</div>
          {filteredResponsibles.map((person) => (
            <div
              key={person.id}
              id={`user-row-${person.id}`}
              className={`bg-white rounded-xl p-6 shadow-sm border transition-colors duration-500 ${
                highlightedId === person.id
                  ? "border-indigo-400 ring-2 ring-indigo-200"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="text-slate-900">{person.name}</h3>
                    <span className="text-xs text-slate-500">{person.login}</span>
                    {person.category && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {CATEGORY_LABELS[person.category] || person.category}
                      </span>
                    )}
                  </div>
                  <p className="text-indigo-600 text-sm mb-3">{person.role}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <span className="text-slate-500 text-sm">Civilité: </span>
                      <span className="text-slate-900">
                        {person.genre ? GENDER_LABELS[person.genre] || person.genre : "-"}
                      </span>
                    </div>
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
                      <span className="text-slate-500 text-sm">Email secondaire: </span>
                      <span className="text-slate-900">{person.secondaryEmail || "-"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-sm">Téléphone: </span>
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
                          <div key={`${assignment.id_affectation}`} className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                            <span>
                              {roleLabelMap.get(assignment.role) ||
                                getRoleLabel(assignment.role as UserRole) ||
                                assignment.role}{" "}
                              - {assignment.entite}
                            </span>
                            {canEdit && (
                              <button
                                onClick={() => setConfirmDeleteAffId(assignment.id_affectation)}
                                className="ml-1 text-slate-400 hover:text-red-600 transition-colors"
                                title="Supprimer cette affectation"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
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
                        onClick={() => setConfirmDeleteUserId(person.id)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowAffectationFor(person.id);
                        setAffectationForm(createEmptyAffectationForm());
                      }}
                      className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      <AlertDialog
        open={Boolean(confirmDeleteUserId && deleteUserTarget)}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteUserId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce responsable ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteUserTarget
                ? `La fiche ${deleteUserTarget.name} (${deleteUserTarget.login}) sera désactivée. Cette action est réversible uniquement via une intervention technique.`
                : "Cette action désactivera la fiche utilisateur."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(confirmDeleteAffId && deleteAffectationTarget)}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteAffId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette affectation ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAffectationTarget
                ? `${deleteAffectationTarget.person.name} perdra l'affectation ${roleLabelMap.get(deleteAffectationTarget.assignment.role) || getRoleLabel(deleteAffectationTarget.assignment.role as UserRole) || deleteAffectationTarget.assignment.role} sur ${deleteAffectationTarget.assignment.entite}.`
                : "Cette affectation sera supprimée pour l'année en cours."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                confirmDeleteAffId !== null && handleRemoveAffectation(confirmDeleteAffId)
              }
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              Supprimer l'affectation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
        label="Téléphone"
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
