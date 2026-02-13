import { useEffect, useMemo, useState } from "react";
import { Building2, Filter, GraduationCap, Mail, Phone, Search, Users } from "lucide-react";
import { AcademicYear, EntiteStructure } from "../types";
import { apiFetch } from "../lib/api";

interface DirectorySearchProps {
  currentYear: AcademicYear;
  entites: EntiteStructure[];
  authLogin: string | null;
}

type SearchTab = "responsables" | "formations" | "structures" | "secretariats";

type ApiResponsable = {
  id_affectation: number;
  id_user: number;
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  role_id: string;
  role_label: string;
  id_entite: number;
  entite_nom: string | null;
  type_entite: string | null;
  id_annee: number;
};

type ApiFormation = {
  id_entite: number;
  id_annee: number;
  type_entite: string;
  nom: string;
  tel_service: string | null;
  bureau_service: string | null;
  responsables: Array<{
    id_user: number;
    nom: string;
    prenom: string;
    role_id: string;
    role_label: string;
  }>;
};

type ApiStructure = {
  id_entite: number;
  id_annee: number;
  id_entite_parent: number | null;
  type_entite: string;
  nom: string;
  tel_service: string | null;
  bureau_service: string | null;
};

export function DirectorySearch({ currentYear, authLogin }: DirectorySearchProps) {
  const [activeTab, setActiveTab] = useState<SearchTab>("responsables");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responsables, setResponsables] = useState<ApiResponsable[]>([]);
  const [formations, setFormations] = useState<ApiFormation[]>([]);
  const [structures, setStructures] = useState<ApiStructure[]>([]);
  const [secretariats, setSecretariats] = useState<ApiStructure[]>([]);

  useEffect(() => {
    if (!authLogin) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("yearId", currentYear.id);
        if (query.trim()) {
          params.set("q", query.trim());
        }
        if (activeTab === "responsables" && roleFilter) {
          params.set("roleId", roleFilter);
        }

        const path = `/search/${activeTab}?${params.toString()}`;
        const data = await apiFetch<{ items: unknown[] }>(path, { login: authLogin });
        if (!mounted) return;

        if (activeTab === "responsables") {
          setResponsables(data.items as ApiResponsable[]);
        } else if (activeTab === "formations") {
          setFormations(data.items as ApiFormation[]);
        } else if (activeTab === "structures") {
          setStructures(data.items as ApiStructure[]);
        } else {
          setSecretariats(data.items as ApiStructure[]);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Erreur de chargement");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [activeTab, authLogin, currentYear.id, query, roleFilter]);

  const roleOptions = useMemo(
    () =>
      Array.from(
        new Set(responsables.map((item) => `${item.role_id}|${item.role_label}`)),
      ).map((value) => {
        const [id, label] = value.split("|");
        return { id, label };
      }),
    [responsables],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-slate-900 mb-2">Recherche - {currentYear.year}</h2>
        <p className="text-slate-600">Acces par onglets: responsables, formations, structures et secretariats</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-wrap gap-2 mb-4">
          {([
            { id: "responsables", label: "Responsables", icon: Users },
            { id: "formations", label: "Formations", icon: GraduationCap },
            { id: "structures", label: "Structures", icon: Building2 },
            { id: "secretariats", label: "Secretariats", icon: Mail },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          {activeTab === "responsables" && (
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Tous les roles</option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        {loading && <div className="text-slate-500">Chargement...</div>}

        {!loading && activeTab === "responsables" && (
          <div className="space-y-3">
            {responsables.length === 0 && <div className="text-slate-500">Aucun resultat</div>}
            {responsables.map((item) => (
              <div key={item.id_affectation} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-900 font-medium">
                      {item.prenom} {item.nom}
                    </div>
                    <div className="text-sm text-indigo-700">{item.role_label}</div>
                    <div className="text-sm text-slate-600">
                      {item.entite_nom || `Entite ${item.id_entite}`} ({item.type_entite || "N/A"})
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">{item.email_institutionnel || "-"}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && activeTab === "formations" && (
          <div className="space-y-3">
            {formations.length === 0 && <div className="text-slate-500">Aucun resultat</div>}
            {formations.map((item) => (
              <div key={item.id_entite} className="border border-slate-200 rounded-lg p-4">
                <div className="text-slate-900 font-medium">
                  {item.nom} <span className="text-slate-500 text-sm">({item.type_entite})</span>
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Responsables:{" "}
                  {item.responsables.length
                    ? item.responsables
                        .map((resp) => `${resp.prenom} ${resp.nom} (${resp.role_label})`)
                        .join(" | ")
                    : "Aucun"}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && activeTab === "structures" && (
          <div className="space-y-3">
            {structures.length === 0 && <div className="text-slate-500">Aucun resultat</div>}
            {structures.map((item) => (
              <div key={item.id_entite} className="border border-slate-200 rounded-lg p-4">
                <div className="text-slate-900 font-medium">
                  {item.nom} <span className="text-slate-500 text-sm">({item.type_entite})</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">ID parent: {item.id_entite_parent ?? "-"}</div>
              </div>
            ))}
          </div>
        )}

        {!loading && activeTab === "secretariats" && (
          <div className="space-y-3">
            {secretariats.length === 0 && <div className="text-slate-500">Aucun resultat</div>}
            {secretariats.map((item) => (
              <div key={item.id_entite} className="border border-slate-200 rounded-lg p-4">
                <div className="text-slate-900 font-medium">
                  {item.nom} <span className="text-slate-500 text-sm">({item.type_entite})</span>
                </div>
                <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-4">
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {item.tel_service || "-"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Filter className="w-4 h-4" />
                    {item.bureau_service || "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
