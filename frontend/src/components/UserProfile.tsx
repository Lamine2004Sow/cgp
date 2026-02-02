import { useEffect, useState } from "react";
import { User, AcademicYear, UserRoleAssignment } from "../types";
import { Mail, Phone, Building, Edit2, Save, X, Briefcase, Calendar } from "lucide-react";
import { apiFetch } from "../lib/api";

interface UserProfileProps {
  user: User;
  currentYear: AcademicYear;
  authLogin: string | null;
  onUserUpdate: (updates: Partial<User>) => void;
}

type ApiUser = {
  id_user: number;
  login: string;
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  telephone: string | null;
  bureau: string | null;
};

export function UserProfile({ user, currentYear, authLogin, onUserUpdate }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempPhone, setTempPhone] = useState(user.phone || "");
  const [tempOffice, setTempOffice] = useState(user.office || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setTempPhone(user.phone || "");
      setTempOffice(user.office || "");
    }
  }, [user, isEditing]);

  const handleSave = async () => {
    if (!authLogin) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        telephone: tempPhone ? tempPhone : null,
        bureau: tempOffice ? tempOffice : null,
      };
      const data = await apiFetch<{ user: ApiUser }>(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        login: authLogin,
      });

      onUserUpdate({
        phone: data.user.telephone || undefined,
        office: data.user.bureau || undefined,
        email: data.user.email_institutionnel || "",
        firstName: data.user.prenom,
        lastName: data.user.nom,
        name: `${data.user.prenom} ${data.user.nom}`,
      });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise a jour");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTempPhone(user.phone || "");
    setTempOffice(user.office || "");
    setIsEditing(false);
  };

  const currentYearRoles = user.roles.filter((r) => r.year === currentYear.year);
  const otherRoles = user.roles.filter((r) => r.year !== currentYear.year);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 mb-2">Ma fiche personnelle</h2>
          <p className="text-slate-600">Consultez et modifiez vos informations personnelles</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Edit2 className="w-5 h-5" />
            Modifier ma fiche
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-slate-900 mb-6 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-indigo-600" />
          Informations personnelles
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Prenom</label>
            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900">
              {user.firstName}
            </div>
            <p className="text-xs text-slate-500 mt-1">Non modifiable (gere par le systeme)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nom</label>
            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900">
              {user.lastName}
            </div>
            <p className="text-xs text-slate-500 mt-1">Non modifiable (gere par le systeme)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email institutionnel
            </label>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-slate-900">{user.email || "Non renseigne"}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Non modifiable (email CAS)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Telephone</label>
            {isEditing ? (
              <input
                type="tel"
                value={tempPhone}
                onChange={(e) => setTempPhone(e.target.value)}
                className="w-full px-4 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="01 49 40 XX XX"
              />
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-slate-900">{user.phone || "Non renseigne"}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Bureau</label>
            {isEditing ? (
              <input
                type="text"
                value={tempOffice}
                onChange={(e) => setTempOffice(e.target.value)}
                className="w-full px-4 py-2 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ex: B203, A105..."
              />
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg">
                <Building className="w-4 h-4 text-slate-400" />
                <span className="text-slate-900">{user.office || "Non renseigne"}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Composante</label>
            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900">
              {user.component || "-"}
            </div>
            <p className="text-xs text-slate-500 mt-1">Non modifiable</p>
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-slate-900 mb-6 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Mes roles pour l'annee {currentYear.year}
        </h3>

        {currentYearRoles.length === 0 ? (
          <div className="text-center py-8 text-slate-500">Aucun role defini pour cette annee</div>
        ) : (
          <div className="space-y-4">
            {currentYearRoles.map((role, index) => (
              <RoleCard key={`${role.roleId}-${index}`} role={role} />
            ))}
          </div>
        )}
      </div>

      {otherRoles.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-slate-900 mb-6">Historique des roles (autres annees)</h3>
          <div className="space-y-3">
            {otherRoles.map((role, index) => (
              <div key={`${role.roleId}-${index}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="text-slate-900 font-medium">{role.roleName}</div>
                  <div className="text-sm text-slate-600">{role.structure}</div>
                </div>
                <div className="text-sm text-slate-500">{role.year}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-blue-900 font-medium mb-2">Informations importantes</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>- Vous pouvez modifier uniquement votre telephone et votre bureau</li>
          <li>- Les autres informations (nom, prenom, email) sont gerees automatiquement</li>
          <li>- Si vous constatez une erreur, utilisez le bouton "Signaler une erreur"</li>
        </ul>
      </div>
    </div>
  );
}

function RoleCard({ role }: { role: UserRoleAssignment }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-slate-900 font-medium mb-1">{role.roleName}</div>
          <div className="text-sm text-slate-600">
            {role.structure} ({role.structureType})
          </div>
        </div>
        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
          Niveau {role.hierarchyLevel}
        </span>
      </div>

      {role.functionalEmail && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500 mb-1">Email fonctionnel pour ce role</div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-indigo-600" />
            <a href={`mailto:${role.functionalEmail}`} className="text-indigo-600 hover:underline">
              {role.functionalEmail}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
