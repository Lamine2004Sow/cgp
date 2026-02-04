import { useEffect, useMemo, useState } from "react";
import { Building2, Filter, GraduationCap, Mail, Phone, Search } from "lucide-react";
import { AcademicYear, EntiteStructure, ResponsiblePerson, getRoleLabel } from "../types";
import { apiFetch } from "../lib/api";

interface DirectorySearchProps {
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
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  telephone: string | null;
  bureau: string | null;
  roles: ApiUserRole[] | null;
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

export function DirectorySearch({ currentYear, entites, authLogin }: DirectorySearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterComponent, setFilterComponent] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [resultType, setResultType] = useState<"all" | "people" | "structures">("all");
  const [selectedPerson, setSelectedPerson] = useState<ResponsiblePerson | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<{
    id: string;
    name: string;
    type: EntiteStructure["type_entite"];
    component: string;
    department: string;
    formations: string[];
    phone?: string;
    office?: string;
  } | null>(null);
  const [people, setPeople] = useState<ResponsiblePerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entiteMap = useMemo(() => buildEntiteMap(entites), [entites]);

  useEffect(() => {
    if (!authLogin) return;
    let isActive = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ items: ApiUserRow[] }>(
          `/users?yearId=${currentYear.id}&pageSize=500`,
          { login: authLogin },
        );

        if (!isActive) return;

        const mapped = (data.items || []).flatMap((user) => {
          const userRoles = (user.roles || []).filter(
            (role) => role && role.id_annee === Number(currentYear.id),
          );
          if (!userRoles.length) {
            return [];
          }

          return userRoles.map((roleEntry) => {
            const hierarchy = resolveHierarchy(roleEntry.id_entite, entiteMap);
            const component = hierarchy.composante || hierarchy.departement || "";
            const department = hierarchy.departement || hierarchy.mention || component;
            const formations = [
              hierarchy.mention,
              hierarchy.parcours,
              hierarchy.niveau,
            ].filter(Boolean) as string[];

            const roleLabel = getRoleLabel(roleEntry.role as any) || roleEntry.role;

            return {
              id: `${user.id_user}-${roleEntry.id_entite}-${roleEntry.role}`,
              name: `${user.prenom} ${user.nom}`,
              firstName: user.prenom,
              lastName: user.nom,
              email: user.email_institutionnel || "",
              role: roleLabel,
              department: department || "-",
              component: component || "-",
              phone: user.telephone || undefined,
              office: user.bureau || undefined,
              formations: formations.length ? formations : [roleEntry.entite],
              year: currentYear.year,
              functionalEmails: [],
            } satisfies ResponsiblePerson;
          });
        });

        setPeople(mapped);
      } catch (err) {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        if (isActive) setLoading(false);
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [authLogin, currentYear.id, currentYear.year, entiteMap]);

  const structures = useMemo(() => {
    return entites.map((entite) => {
      const hierarchy = resolveHierarchy(entite.id_entite, entiteMap);
      const component = hierarchy.composante || (entite.type_entite === "COMPOSANTE" ? entite.nom : "");
      const department = hierarchy.departement || hierarchy.mention || component || "-";
      const formations = [
        hierarchy.mention,
        hierarchy.parcours,
        hierarchy.niveau,
      ].filter(Boolean) as string[];
      return {
        id: `entite-${entite.id_entite}`,
        name: entite.nom,
        type: entite.type_entite,
        component: component || "-",
        department: department || "-",
        formations: formations.length ? formations : [entite.nom],
        phone: entite.tel_service || undefined,
        office: entite.bureau_service || undefined,
      };
    });
  }, [entites, entiteMap]);

  const departments = Array.from(
    new Set(
      [...people.map((p) => p.department), ...structures.map((s) => s.department)].filter(Boolean),
    ),
  );
  const components = Array.from(
    new Set(
      [...people.map((p) => p.component), ...structures.map((s) => s.component)].filter(Boolean),
    ),
  );
  const roles = Array.from(new Set(people.map((p) => p.role)));

  const filteredData = people.filter((person) => {
    const matchesSearch =
      person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.formations.some((f) => f.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDepartment = filterDepartment === "all" || person.department === filterDepartment;
    const matchesComponent = filterComponent === "all" || person.component === filterComponent;
    const matchesRole = filterRole === "all" || person.role === filterRole;

    return matchesSearch && matchesDepartment && matchesComponent && matchesRole;
  });

  const filteredStructures = structures.filter((structure) => {
    const matchesSearch =
      structure.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      structure.component.toLowerCase().includes(searchTerm.toLowerCase()) ||
      structure.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      structure.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      structure.formations.some((f) => f.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDepartment = filterDepartment === "all" || structure.department === filterDepartment;
    const matchesComponent = filterComponent === "all" || structure.component === filterComponent;

    return matchesSearch && matchesDepartment && matchesComponent;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-slate-900 mb-2">Annuaire des Formations - {currentYear.year}</h2>
        <p className="text-slate-600">
          Recherchez et consultez les responsables, formations et structures avec filtres combinables
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-indigo-600" />
          <h3 className="text-slate-900 font-medium">Recherche et filtres</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, departement, formation, composante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <select
              value={resultType}
              onChange={(e) => {
                const next = e.target.value as "all" | "people" | "structures";
                setResultType(next);
                if (next === "structures") {
                  setFilterRole("all");
                  setSelectedPerson(null);
                }
                if (next === "people") {
                  setSelectedStructure(null);
                }
              }}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">Tous les resultats</option>
              <option value="people">Responsables</option>
              <option value="structures">Structures</option>
            </select>
          </div>
          <div>
            <select
              value={filterComponent}
              onChange={(e) => setFilterComponent(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">Toutes les composantes</option>
              {components.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">Tous les departements</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="lg:col-span-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              disabled={resultType === "structures"}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">Tous les roles</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          {(filterDepartment !== "all" || filterComponent !== "all" || filterRole !== "all") && (
            <button
              onClick={() => {
                setFilterDepartment("all");
                setFilterComponent("all");
                setFilterRole("all");
              }}
              className="px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
            >
              Reinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {(() => {
            const showPeople = resultType !== "structures";
            const showStructures = resultType !== "people" && filterRole === "all";
            return (
              <>
          {loading && (
            <div className="text-sm text-slate-500">Chargement des resultats...</div>
          )}
          {!loading &&
            ((showPeople && filteredData.length === 0) ||
              (showStructures && filteredStructures.length === 0) ||
              ((!showPeople || filteredData.length === 0) &&
                (!showStructures || filteredStructures.length === 0))) && (
            <div className="text-center py-12 text-slate-500">Aucun resultat</div>
          )}
          {showPeople &&
            filteredData.map((person) => (
              <div
                key={person.id}
                className={`bg-white rounded-xl p-6 shadow-sm border transition-colors cursor-pointer ${
                  selectedPerson?.id === person.id
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 hover:border-indigo-200"
                }`}
                onClick={() => {
                  setSelectedPerson(person);
                  setSelectedStructure(null);
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-slate-900 font-medium mb-1">{person.name}</h3>
                    <p className="text-indigo-600 text-sm font-medium">{person.role}</p>
                  </div>
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">
                    {person.component}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-4 h-4" />
                    {person.department}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <GraduationCap className="w-4 h-4" />
                    {person.formations[0] || "-"}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4" />
                    {person.email}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    {person.phone || "-"}
                  </div>
                </div>
              </div>
            ))}
          {showStructures &&
            filteredStructures.map((structure) => (
              <div
                key={structure.id}
                className={`bg-white rounded-xl p-6 shadow-sm border transition-colors cursor-pointer ${
                  selectedStructure?.id === structure.id
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 hover:border-indigo-200"
                }`}
                onClick={() => {
                  setSelectedStructure(structure);
                  setSelectedPerson(null);
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-slate-900 font-medium mb-1">{structure.name}</h3>
                    <p className="text-emerald-600 text-sm font-medium">
                      Structure {structure.type.toLowerCase()}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs">
                    {structure.component}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-4 h-4" />
                    {structure.department}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <GraduationCap className="w-4 h-4" />
                    {structure.formations[0] || "-"}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    {structure.phone || "-"}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Building2 className="w-4 h-4" />
                    {structure.office || "-"}
                  </div>
                </div>
              </div>
            ))}
              </>
            );
          })()}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 h-fit">
          <h3 className="text-slate-900 font-medium mb-4">Fiche detaillee</h3>
          {selectedPerson ? (
            <div className="space-y-4">
              <div>
                <div className="text-slate-900 font-medium text-lg">{selectedPerson.name}</div>
                <div className="text-indigo-600 text-sm">{selectedPerson.role}</div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-4 h-4" />
                  {selectedPerson.component}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <GraduationCap className="w-4 h-4" />
                  {selectedPerson.department}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${selectedPerson.email}`} className="text-indigo-600 hover:underline">
                    {selectedPerson.email}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4" />
                  {selectedPerson.phone || "Non renseigne"}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-2">Formations associees</div>
                <div className="space-y-1">
                  {selectedPerson.formations.map((formation) => (
                    <div key={formation} className="text-sm text-slate-700">
                      {formation}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedStructure ? (
            <div className="space-y-4">
              <div>
                <div className="text-slate-900 font-medium text-lg">{selectedStructure.name}</div>
                <div className="text-emerald-600 text-sm">
                  Structure {selectedStructure.type.toLowerCase()}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-4 h-4" />
                  {selectedStructure.component}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <GraduationCap className="w-4 h-4" />
                  {selectedStructure.department}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4" />
                  {selectedStructure.phone || "Non renseigne"}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-4 h-4" />
                  {selectedStructure.office || "Non renseigne"}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-2">Formations associees</div>
                <div className="space-y-1">
                  {selectedStructure.formations.map((formation) => (
                    <div key={formation} className="text-sm text-slate-700">
                      {formation}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">
              Selectionnez un responsable ou une structure pour afficher les details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
