import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronLeft, ChevronRight, GraduationCap, Mail, Phone, Users } from "lucide-react";
import { AcademicYear, EntiteStructure } from "../types";
import { apiFetch } from "../lib/api";
import { FilterBar } from "./ui/filter-bar";
import { readQueryParam, writeQueryParams } from "../lib/url-state";

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
  code_composante?: string | null;
  code_interne?: string | null;
};

type PagedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

const PAGE_SIZE = 20;

type ApiRole = { id: string; libelle: string };

export function DirectorySearch({ currentYear, authLogin, entites }: DirectorySearchProps) {
  const [activeTab, setActiveTab] = useState<SearchTab>("responsables");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [composanteFilter, setComposanteFilter] = useState("");
  const [typeEntiteFilter, setTypeEntiteFilter] = useState("");
  const [typeDiplomeFilter, setTypeDiplomeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responsables, setResponsables] = useState<ApiResponsable[]>([]);
  const [formations, setFormations] = useState<ApiFormation[]>([]);
  const [structures, setStructures] = useState<ApiStructure[]>([]);
  const [secretariats, setSecretariats] = useState<ApiStructure[]>([]);
  const [total, setTotal] = useState(0);
  const [allRoles, setAllRoles] = useState<ApiRole[]>([]);
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  // Composantes disponibles pour le filtre
  const composantes = useMemo(
    () => entites.filter((e) => e.type_entite === "COMPOSANTE"),
    [entites],
  );

  // Calcul des IDs enfants d'une composante sélectionnée (BFS sur l'arbre local)
  const entiteIds = useMemo((): string | undefined => {
    if (!composanteFilter) return undefined;
    const byParent = new Map<number, number[]>();
    entites.forEach((e) => {
      if (e.id_entite_parent) {
        if (!byParent.has(e.id_entite_parent)) byParent.set(e.id_entite_parent, []);
        byParent.get(e.id_entite_parent)!.push(e.id_entite);
      }
    });
    const result = new Set<number>();
    const queue = [Number(composanteFilter)];
    while (queue.length) {
      const id = queue.shift()!;
      result.add(id);
      (byParent.get(id) ?? []).forEach((c) => queue.push(c));
    }
    return Array.from(result).join(",");
  }, [composanteFilter, entites]);

  useEffect(() => {
    const tab = readQueryParam("ds_tab");
    const q = readQueryParam("ds_q");
    const role = readQueryParam("ds_role");
    const comp = readQueryParam("ds_comp");
    const type = readQueryParam("ds_type");
    const diplome = readQueryParam("ds_diplome");
    const p = readQueryParam("ds_page");

    if (tab === "responsables" || tab === "formations" || tab === "structures" || tab === "secretariats") {
      setActiveTab(tab);
    }
    setQuery(q || "");
    setRoleFilter(role || "");
    setComposanteFilter(comp || "");
    setTypeEntiteFilter(type || "");
    setTypeDiplomeFilter(diplome || "");
    setPage(p ? Number(p) : 1);
    setFiltersHydrated(true);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, query, roleFilter, composanteFilter, typeEntiteFilter, typeDiplomeFilter, currentYear.id]);

  useEffect(() => {
    // Réinitialiser les filtres spécifiques à chaque onglet au changement d'onglet
    if (activeTab !== "responsables") setRoleFilter("");
    if (activeTab !== "formations") {
      setTypeDiplomeFilter("");
      if (activeTab !== "structures") setTypeEntiteFilter("");
    }
  }, [activeTab]);

  // Charger tous les rôles une fois pour le filtre (décorrélé des résultats courants)
  useEffect(() => {
    if (!authLogin) return;
    apiFetch<ApiRole[]>("/roles", { login: authLogin })
      .then((items) => setAllRoles(items))
      .catch(() => setAllRoles([]));
  }, [authLogin]);

  useEffect(() => {
    if (!authLogin) return;
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("yearId", currentYear.id);
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));
        if (query.trim()) params.set("q", query.trim());
        if (entiteIds) params.set("entiteIds", entiteIds);
        if (activeTab === "responsables" && roleFilter) params.set("roleId", roleFilter);
        if ((activeTab === "formations" || activeTab === "structures") && typeEntiteFilter) {
          params.set("typeEntite", typeEntiteFilter);
        }
        if (activeTab === "formations" && typeDiplomeFilter) {
          params.set("typeDiplome", typeDiplomeFilter);
        }

        const path = `/search/${activeTab}?${params.toString()}`;
        const data = await apiFetch<PagedResponse<unknown>>(path, { login: authLogin });
        if (!mounted) return;

        setTotal(data.total ?? 0);

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
  }, [activeTab, authLogin, currentYear.id, query, roleFilter, entiteIds, typeEntiteFilter, typeDiplomeFilter, page]);

  const roleOptions = useMemo(
    () => allRoles.map((r) => ({ id: r.id, label: r.libelle })),
    [allRoles],
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasActiveFilters = Boolean(
    query.trim() || roleFilter || composanteFilter || typeEntiteFilter || typeDiplomeFilter,
  );

  const resetFilters = () => {
    setQuery("");
    setRoleFilter("");
    setComposanteFilter("");
    setTypeEntiteFilter("");
    setTypeDiplomeFilter("");
  };

  useEffect(() => {
    if (!filtersHydrated) return;
    writeQueryParams({
      ds_tab: activeTab,
      ds_q: query,
      ds_role: roleFilter,
      ds_comp: composanteFilter,
      ds_type: typeEntiteFilter,
      ds_diplome: typeDiplomeFilter,
      ds_page: page === 1 ? "" : page,
    });
  }, [activeTab, query, roleFilter, composanteFilter, typeEntiteFilter, typeDiplomeFilter, page, filtersHydrated]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-slate-900 mb-2">Recherche - {currentYear.year}</h2>
        <p className="text-slate-600">Recherche par onglets : responsables, formations, structures et secrétariats.</p>
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
            { id: "secretariats", label: "Secrétariats", icon: Mail },
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

        <FilterBar
          fields={[
            {
              key: "query",
              label: "Recherche",
              type: "search",
              value: query,
              onChange: (value) => setQuery(value),
              placeholder: "Nom, prénom, login, email, code composante…",
            },
            ...(composantes.length > 0
              ? [
                  {
                    key: "composante",
                    label: "Composante",
                    type: "select" as const,
                    value: composanteFilter,
                    onChange: (value: string) => setComposanteFilter(value),
                    options: [
                      { value: "", label: "Toutes les composantes" },
                      ...composantes.map((c) => ({
                        value: String(c.id_entite),
                        label: c.code_composante ? `${c.nom} (${c.code_composante})` : c.nom,
                      })),
                    ],
                  },
                ]
              : []),
            ...(activeTab === "responsables"
              ? [
                  {
                    key: "role",
                    label: "Rôle",
                    type: "select" as const,
                    value: roleFilter,
                    onChange: (value: string) => setRoleFilter(value),
                    options: [
                      { value: "", label: "Tous les rôles" },
                      ...roleOptions.map((role) => ({ value: role.id, label: role.label })),
                    ],
                  },
                ]
              : []),
            ...(activeTab === "formations"
              ? [
                  {
                    key: "typeFormation",
                    label: "Type",
                    type: "select" as const,
                    value: typeEntiteFilter,
                    onChange: (value: string) => setTypeEntiteFilter(value),
                    options: [
                      { value: "", label: "Tous les types" },
                      { value: "MENTION", label: "Mention" },
                      { value: "PARCOURS", label: "Parcours" },
                      { value: "NIVEAU", label: "Niveau / Année" },
                    ],
                  },
                  {
                    key: "typeDiplome",
                    label: "Diplôme",
                    type: "select" as const,
                    value: typeDiplomeFilter,
                    onChange: (value: string) => setTypeDiplomeFilter(value),
                    options: [
                      { value: "", label: "Tous les diplômes" },
                      { value: "Licence", label: "Licence" },
                      { value: "Master", label: "Master" },
                      { value: "BUT", label: "BUT" },
                      { value: "Ingénieur", label: "Ingénieur" },
                      { value: "DU", label: "DU" },
                    ],
                  },
                ]
              : []),
            ...(activeTab === "structures"
              ? [
                  {
                    key: "typeStructure",
                    label: "Type",
                    type: "select" as const,
                    value: typeEntiteFilter,
                    onChange: (value: string) => setTypeEntiteFilter(value),
                    options: [
                      { value: "", label: "Tous les types" },
                      { value: "COMPOSANTE", label: "Composante" },
                      { value: "DEPARTEMENT", label: "Département" },
                      { value: "MENTION", label: "Mention" },
                      { value: "PARCOURS", label: "Parcours" },
                      { value: "NIVEAU", label: "Niveau / Année" },
                    ],
                  },
                ]
              : []),
          ]}
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
        />
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        {loading && <div className="text-slate-500">Chargement...</div>}

        {!loading && activeTab === "responsables" && (
          <div className="space-y-3">
            {responsables.length === 0 && <div className="text-slate-500">Aucun résultat</div>}
            {responsables.map((item) => (
              <div key={item.id_affectation} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-900 font-medium">
                      {item.prenom} {item.nom}
                    </div>
                    <div className="text-sm text-indigo-700">{item.role_label}</div>
                    <div className="text-sm text-slate-600">
                      {item.entite_nom || `Entité ${item.id_entite}`} ({item.type_entite || "N/A"})
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
            {formations.length === 0 && <div className="text-slate-500">Aucun résultat</div>}
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
            {structures.length === 0 && <div className="text-slate-500">Aucun résultat</div>}
            {structures.map((item) => {
              const parent = item.id_entite_parent
                ? entites.find((e) => e.id_entite === item.id_entite_parent)
                : null;
              return (
                <div key={item.id_entite} className="border border-slate-200 rounded-lg p-4">
                  <div className="text-slate-900 font-medium flex items-baseline gap-2">
                    {item.nom} <span className="text-slate-500 text-sm">({item.type_entite})</span>
                    {(item.code_composante || item.code_interne) && (
                      <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {item.code_composante ?? item.code_interne}
                      </span>
                    )}
                  </div>
                  {parent && (
                    <div className="text-xs text-slate-500 mt-1">
                      Rattaché à : {parent.nom} ({parent.type_entite})
                    </div>
                  )}
                  {(item.tel_service || item.bureau_service) && (
                    <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-4">
                      {item.tel_service && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {item.tel_service}
                        </span>
                      )}
                      {item.bureau_service && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {item.bureau_service}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && activeTab === "secretariats" && (
          <div className="space-y-3">
            {secretariats.length === 0 && <div className="text-slate-500">Aucun résultat</div>}
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
                    <Building2 className="w-4 h-4" />
                    {item.bureau_service || "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
            <span className="text-sm text-slate-500">
              {total} résultat{total > 1 ? "s" : ""} — page {page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
