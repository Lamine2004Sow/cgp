import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  Edit2,
  ExternalLink,
  FileText,
  FolderTree,
  GitBranch,
  Hash,
  Link2,
  Mail,
  MapPin,
  Phone,
  UserCheck,
  Users,
  X,
  AlertCircle,
  UserCog,
} from "lucide-react";
import { AcademicYear, EntiteStructure, EntiteStructureDetail, canManageStructures, UserRole } from "../types";
import { apiFetch } from "../lib/api";
import { FilterBar } from "./ui/filter-bar";
import { readQueryParam, writeQueryParams } from "../lib/url-state";
import {
  EMPTY_HIERARCHY_FILTERS,
  HIERARCHY_LEVELS,
  type HierarchyFilters,
  getFilteredEntites,
  getHierarchyOptions,
  updateHierarchyFilters,
} from "../lib/entite-hierarchy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const TYPE_LABELS: Record<string, string> = {
  COMPOSANTE: "Composante (UFR / Institut / IUT)",
  DEPARTEMENT: "Département",
  MENTION: "Mention",
  PARCOURS: "Parcours",
  NIVEAU: "Niveau / Formation",
};

const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tous les types" },
  { value: "COMPOSANTE", label: "Composantes" },
  { value: "DEPARTEMENT", label: "Départements" },
  { value: "MENTION", label: "Mentions" },
  { value: "PARCOURS", label: "Parcours" },
  { value: "NIVEAU", label: "Niveaux / Formations" },
];

interface ManageStructuresProps {
  userRole: UserRole;
  currentYear: AcademicYear;
  entites: EntiteStructure[];
  authLogin: string | null;
  focusEntiteId?: number | null;
}

type ApiEntiteDetail = EntiteStructureDetail;

const HIERARCHY_EMPTY_LABELS: Record<keyof HierarchyFilters, string> = {
  composanteId: "Toutes les composantes",
  departementId: "Tous les départements",
  mentionId: "Toutes les mentions",
  parcoursId: "Tous les parcours",
  niveauId: "Tous les niveaux",
};

const typeBadgeClass: Record<EntiteStructure["type_entite"], string> = {
  COMPOSANTE: "bg-indigo-100 text-indigo-700",
  DEPARTEMENT: "bg-sky-100 text-sky-700",
  MENTION: "bg-emerald-100 text-emerald-700",
  PARCOURS: "bg-amber-100 text-amber-700",
  NIVEAU: "bg-violet-100 text-violet-700",
};

const formatEntiteLabel = (entite: Pick<EntiteStructure, "nom" | "type_entite" | "code_composante">) =>
  entite.type_entite === "COMPOSANTE" && entite.code_composante
    ? `${entite.nom} (${entite.code_composante})`
    : entite.nom;

export function ManageStructures({
  userRole,
  currentYear,
  entites,
  authLogin,
  focusEntiteId,
}: ManageStructuresProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ApiEntiteDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ApiEntiteDetail>>({});

  const canEdit = canManageStructures(userRole);
  const yearEntites = useMemo(
    () => entites.filter((e) => String(e.id_annee) === currentYear.id),
    [entites, currentYear.id],
  );

  const [search, setSearch] = useState("");
  const [hierarchyFilters, setHierarchyFilters] = useState<HierarchyFilters>(EMPTY_HIERARCHY_FILTERS);
  const [filterType, setFilterType] = useState<string>("");
  const [filtersHydrated, setFiltersHydrated] = useState(false);

  const hierarchyOptions = useMemo(
    () => getHierarchyOptions(yearEntites, hierarchyFilters, currentYear.id),
    [yearEntites, hierarchyFilters, currentYear.id],
  );

  const filteredList = useMemo(() => {
    let list = getFilteredEntites(yearEntites, hierarchyFilters, currentYear.id);
    if (filterType !== "") {
      list = list.filter((e) => e.type_entite === filterType);
    }
    const normalizedSearch = search.trim().toLowerCase();
    if (normalizedSearch) {
      list = list.filter(
        (entite) =>
          entite.nom.toLowerCase().includes(normalizedSearch) ||
          String(entite.id_entite).includes(normalizedSearch) ||
          entite.type_entite.toLowerCase().includes(normalizedSearch) ||
          entite.code_composante?.toLowerCase().includes(normalizedSearch),
      );
    }
    return list;
  }, [yearEntites, hierarchyFilters, currentYear.id, filterType, search]);

  const entiteMap = useMemo(
    () => new Map(yearEntites.map((entite) => [entite.id_entite, entite])),
    [yearEntites],
  );

  const parentEntite = useMemo(() => {
    if (!detail?.id_entite_parent) return null;
    return entiteMap.get(detail.id_entite_parent) ?? null;
  }, [detail?.id_entite_parent, entiteMap]);

  const hierarchyPath = useMemo(() => {
    if (!detail) return [];

    const path: EntiteStructure[] = [];
    let current: EntiteStructure | undefined = entiteMap.get(detail.id_entite);

    for (let depth = 0; depth < 16 && current; depth += 1) {
      path.unshift(current);
      if (!current.id_entite_parent) {
        break;
      }
      current = entiteMap.get(current.id_entite_parent);
    }

    return path;
  }, [detail, entiteMap]);

  const directChildren = useMemo(() => {
    if (!detail) return [];

    return yearEntites
      .filter((entite) => entite.id_entite_parent === detail.id_entite)
      .sort((left, right) => left.nom.localeCompare(right.nom, "fr", { sensitivity: "base" }));
  }, [detail, yearEntites]);

  const specificFields = useMemo(() => {
    if (!detail) return [];

    switch (detail.type_entite) {
      case "COMPOSANTE":
        return [
          { label: "Code composante", value: detail.code_composante },
          { label: "Type de composante", value: detail.type_composante },
          { label: "Campus", value: detail.campus },
          { label: "Mail fonctionnel", value: detail.mail_fonctionnel },
          { label: "Mail institutionnel", value: detail.mail_institutionnel },
          { label: "Site web", value: detail.site_web, kind: "link" as const },
        ];
      case "DEPARTEMENT":
        return [{ label: "Code interne", value: detail.code_interne }];
      case "MENTION":
        return [
          { label: "Type de diplôme", value: detail.type_diplome },
          { label: "Diplôme de référence", value: detail.diplome_libelle },
          {
            label: "Cycle",
            value: detail.cycle !== null && detail.cycle !== undefined ? String(detail.cycle) : null,
          },
        ];
      case "PARCOURS":
        return [{ label: "Code parcours", value: detail.code_parcours }];
      case "NIVEAU":
        return [{ label: "Libellé court", value: detail.libelle_court }];
      default:
        return [];
    }
  }, [detail]);

  const loadDetail = useCallback(
    async (id: number) => {
      if (!authLogin) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ item: ApiEntiteDetail }>(`/entites/${id}`, {
          login: authLogin,
        });
        setDetail(res.item);
        setForm({
          nom: res.item.nom,
          tel_service: res.item.tel_service ?? undefined,
          bureau_service: res.item.bureau_service ?? undefined,
          site_web: res.item.site_web ?? undefined,
          code_interne: res.item.code_interne ?? undefined,
          type_diplome: res.item.type_diplome ?? undefined,
          code_parcours: res.item.code_parcours ?? undefined,
          libelle_court: res.item.libelle_court ?? undefined,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur chargement");
        setDetail(null);
      } finally {
        setLoading(false);
      }
    },
    [authLogin],
  );

  useEffect(() => {
    if (selectedId !== null) loadDetail(selectedId);
    else {
      setDetail(null);
      setError(null);
      setEditModalOpen(false);
    }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (focusEntiteId) setSelectedId(focusEntiteId);
  }, [focusEntiteId]);

  useEffect(() => {
    const comp = readQueryParam("ms_comp");
    const dept = readQueryParam("ms_dept");
    const mention = readQueryParam("ms_mention");
    const parcours = readQueryParam("ms_parcours");
    const niveau = readQueryParam("ms_niveau");
    const type = readQueryParam("ms_type");
    const q = readQueryParam("ms_q");
    const sel = readQueryParam("ms_sel");

    setSearch(q || "");
    setHierarchyFilters({
      composanteId: comp || "",
      departementId: dept || "",
      mentionId: mention || "",
      parcoursId: parcours || "",
      niveauId: niveau || "",
    });
    setFilterType(type || "");
    setSelectedId(sel ? Number(sel) : null);
    setFiltersHydrated(true);
  }, []);

  useEffect(() => {
    if (!filtersHydrated) return;
    writeQueryParams({
      ms_q: search,
      ms_comp: hierarchyFilters.composanteId,
      ms_dept: hierarchyFilters.departementId,
      ms_mention: hierarchyFilters.mentionId,
      ms_parcours: hierarchyFilters.parcoursId,
      ms_niveau: hierarchyFilters.niveauId,
      ms_type: filterType,
      ms_sel: selectedId ?? "",
    });
  }, [search, hierarchyFilters, filterType, selectedId, filtersHydrated]);

  const handleSave = async () => {
    if (!authLogin || !selectedId || !detail) return;
    setSaving(true);
    setError(null);
    if (!form.nom?.trim()) {
      setError("Le nom de la structure est obligatoire");
      setSaving(false);
      return;
    }
    try {
      const payload: Record<string, string | null | undefined> = {
        nom: form.nom,
        tel_service: form.tel_service || null,
        bureau_service: form.bureau_service || null,
      };
      if (detail.type_entite === "COMPOSANTE") payload.site_web = form.site_web ?? null;
      if (detail.type_entite === "DEPARTEMENT") payload.code_interne = form.code_interne ?? null;
      if (detail.type_entite === "MENTION") payload.type_diplome = form.type_diplome ?? null;
      if (detail.type_entite === "PARCOURS") payload.code_parcours = form.code_parcours ?? null;
      if (detail.type_entite === "NIVEAU") payload.libelle_court = form.libelle_court ?? null;

      const res = await apiFetch<{ item: ApiEntiteDetail }>(`/entites/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        login: authLogin,
      });
      setDetail(res.item);
      setForm({
        nom: res.item.nom,
        tel_service: res.item.tel_service ?? undefined,
        bureau_service: res.item.bureau_service ?? undefined,
        site_web: res.item.site_web ?? undefined,
        code_interne: res.item.code_interne ?? undefined,
        type_diplome: res.item.type_diplome ?? undefined,
        code_parcours: res.item.code_parcours ?? undefined,
        libelle_court: res.item.libelle_court ?? undefined,
      });
      setEditModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l’enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (detail) {
      setForm({
        nom: detail.nom,
        tel_service: detail.tel_service ?? undefined,
        bureau_service: detail.bureau_service ?? undefined,
        site_web: detail.site_web ?? undefined,
        code_interne: detail.code_interne ?? undefined,
        type_diplome: detail.type_diplome ?? undefined,
        code_parcours: detail.code_parcours ?? undefined,
        libelle_court: detail.libelle_court ?? undefined,
      });
    }
    setEditModalOpen(false);
  };

  const resetFilters = () => {
    setSearch("");
    setHierarchyFilters(EMPTY_HIERARCHY_FILTERS);
    setFilterType("");
  };

  const hasActiveFilters = Boolean(
    search || filterType || Object.values(hierarchyFilters).some(Boolean),
  );

  const openEditModal = () => {
    if (!detail) return;
    setForm({
      nom: detail.nom,
      tel_service: detail.tel_service ?? undefined,
      bureau_service: detail.bureau_service ?? undefined,
      site_web: detail.site_web ?? undefined,
      code_interne: detail.code_interne ?? undefined,
      type_diplome: detail.type_diplome ?? undefined,
      code_parcours: detail.code_parcours ?? undefined,
      libelle_court: detail.libelle_court ?? undefined,
    });
    setEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-slate-900 mb-2">Fiches structures</h2>
        <p className="text-slate-600">
          Consulter et {canEdit ? "modifier" : "consulter"} les fiches des composantes, départements, mentions, parcours et niveaux.
          {canEdit && " (Services centraux : modification autorisée.)"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h2 className="font-medium text-slate-900">Structures ({currentYear.year})</h2>
            <FilterBar
              className="mt-3 border-none bg-transparent p-0 shadow-none"
              fields={[
                {
                  key: "search",
                  label: "Recherche",
                  type: "search",
                  value: search,
                  onChange: (value) => setSearch(value),
                  placeholder: "Nom, type ou ID de structure...",
                },
                ...HIERARCHY_LEVELS.map((level) => {
                  const options = hierarchyOptions[level.key];
                  return {
                    key: level.key,
                    label: level.label,
                    type: "select" as const,
                    value: hierarchyFilters[level.key],
                    onChange: (value: string) =>
                      setHierarchyFilters((prev) => updateHierarchyFilters(prev, level.key, value)),
                    disabled: options.length === 0,
                    options: [
                      { value: "", label: HIERARCHY_EMPTY_LABELS[level.key] },
                      ...options.map((entite) => ({
                        value: String(entite.id_entite),
                        label:
                          entite.type_entite === "COMPOSANTE" && entite.code_composante
                            ? `${entite.nom} (${entite.code_composante})`
                            : entite.nom,
                      })),
                    ],
                  };
                }),
                {
                  key: "type",
                  label: "Type",
                  type: "select",
                  value: filterType,
                  onChange: (value) => setFilterType(value),
                  options: TYPE_FILTER_OPTIONS,
                },
              ]}
              hasActiveFilters={hasActiveFilters}
              onReset={resetFilters}
            />
          </div>
          <ul className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100">
            {filteredList.length === 0 ? (
              <li className="p-4 text-slate-500 text-sm">Aucune structure ne correspond aux filtres.</li>
            ) : (
              filteredList.map((e) => (
                <li key={e.id_entite}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(e.id_entite)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                      selectedId === e.id_entite ? "bg-indigo-50 text-indigo-800" : "text-slate-700"
                    }`}
                  >
                    <span className="text-xs text-slate-500 block">{TYPE_LABELS[e.type_entite] ?? e.type_entite}</span>
                    <span className="font-medium">{e.nom}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedId === null ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Sélectionnez une structure dans la liste pour afficher sa fiche.</p>
            </div>
          ) : loading ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center text-slate-500">
              Chargement…
            </div>
          ) : !detail && error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
              {error}
            </div>
          ) : detail ? (
            <>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${typeBadgeClass[detail.type_entite]}`}>
                        {TYPE_LABELS[detail.type_entite] ?? detail.type_entite}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                        <Hash className="h-3.5 w-3.5" />
                        ID {detail.id_entite}
                      </span>
                      {detail.code_composante && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                          Code {detail.code_composante}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{detail.nom}</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {hierarchyPath.map((entite) => formatEntiteLabel(entite)).join(" / ") || "Structure racine"}
                      </p>
                    </div>
                  </div>
                  {canEdit && !editModalOpen && (
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Modifier la fiche
                    </button>
                  )}
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                    {error}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <SectionCard
                  title="Identification"
                  icon={<GitBranch className="w-5 h-5 text-indigo-600" />}
                >
                  <div className="grid grid-cols-1 gap-4">
                    <DetailField label="Nom de la structure" value={detail.nom} />
                    <DetailField label="Type" value={TYPE_LABELS[detail.type_entite] ?? detail.type_entite} />
                    <DetailField label="Année universitaire" value={currentYear.year} />
                    <DetailField label="ID structure" value={String(detail.id_entite)} />
                    <DetailField
                      label="Rattachement direct"
                      value={parentEntite ? formatEntiteLabel(parentEntite) : "Aucune structure parente"}
                    />
                    <DetailField
                      label="Chemin hiérarchique"
                      value={hierarchyPath.map((entite) => formatEntiteLabel(entite)).join(" / ")}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Coordonnées"
                  icon={<Building2 className="w-5 h-5 text-indigo-600" />}
                >
                  <div className="grid grid-cols-1 gap-4">
                    <DetailField label="Téléphone du service" value={detail.tel_service} />
                    <DetailField label="Bureau du service" value={detail.bureau_service} />
                  </div>
                </SectionCard>

                <SectionCard
                  title="Activité"
                  icon={<CalendarDays className="w-5 h-5 text-indigo-600" />}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
                    <StatCard
                      label="Sous-responsables"
                      value={detail.nombre_sous_responsables ?? 0}
                      icon={<Users className="w-4 h-4" />}
                    />
                    <StatCard
                      label="Délégations"
                      value={detail.nombre_delegations ?? 0}
                      icon={<UserCheck className="w-4 h-4" />}
                    />
                    <StatCard
                      label="Signalements"
                      value={detail.nombre_signalements ?? 0}
                      icon={<AlertCircle className="w-4 h-4" />}
                    />
                  </div>
                </SectionCard>
              </div>

              <SectionCard
                title="Informations spécifiques"
                icon={
                  detail.type_entite === "COMPOSANTE" ? (
                    <ExternalLink className="w-5 h-5 text-indigo-600" />
                  ) : detail.type_entite === "DEPARTEMENT" ? (
                    <Hash className="w-5 h-5 text-indigo-600" />
                  ) : detail.type_entite === "MENTION" ? (
                    <FolderTree className="w-5 h-5 text-indigo-600" />
                  ) : detail.type_entite === "PARCOURS" ? (
                    <Link2 className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <MapPin className="w-5 h-5 text-indigo-600" />
                  )
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {specificFields.map((field) => (
                    <DetailField
                      key={field.label}
                      label={field.label}
                      value={field.value}
                      kind={field.kind}
                    />
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Sous-structures directes"
                icon={<FolderTree className="w-5 h-5 text-indigo-600" />}
              >
                {directChildren.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Cette structure ne contient pas de sous-structure directe pour l'année {currentYear.year}.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      {directChildren.length} sous-structure{directChildren.length > 1 ? "s" : ""} directe{directChildren.length > 1 ? "s" : ""}.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {directChildren.map((child) => (
                        <button
                          key={child.id_entite}
                          type="button"
                          onClick={() => setSelectedId(child.id_entite)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
                        >
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${typeBadgeClass[child.type_entite]}`}>
                            {child.type_entite}
                          </span>
                          <span>{formatEntiteLabel(child)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <SectionCard
                  title="Responsables"
                  icon={<UserCog className="w-5 h-5 text-indigo-600" />}
                >
                  {(detail.responsables?.length ?? 0) === 0 ? (
                    <p className="text-sm text-slate-500">Aucun responsable affecté sur cette structure.</p>
                  ) : (
                    <div className="space-y-3">
                      {(detail.responsables ?? []).map((person) => (
                        <PersonCard key={`${person.id_user}-${person.id_role}`} person={person} />
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="Secrétariat"
                  icon={<Users className="w-5 h-5 text-indigo-600" />}
                >
                  {(detail.secretariat?.length ?? 0) === 0 ? (
                    <p className="text-sm text-slate-500">Aucune personne en secrétariat sur cette structure.</p>
                  ) : (
                    <div className="space-y-3">
                      {(detail.secretariat ?? []).map((person) => (
                        <PersonCard key={`${person.id_user}-${person.id_role}`} person={person} />
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>

              {canEdit && detail && (
                <Dialog open={editModalOpen} onOpenChange={(open: boolean) => { if (!open) handleCancelEdit(); }}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Modifier la fiche structure</DialogTitle>
                      <DialogDescription>
                        Les champs affichés dépendent du type de structure sélectionné.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                      <Field
                        label="Nom"
                        value={form.nom}
                        onChange={(v) => setForm((f) => ({ ...f, nom: v }))}
                      />
                      <Field
                        label="Téléphone du service"
                        value={form.tel_service}
                        onChange={(v) => setForm((f) => ({ ...f, tel_service: v }))}
                      />
                      <Field
                        label="Bureau du service"
                        value={form.bureau_service}
                        onChange={(v) => setForm((f) => ({ ...f, bureau_service: v }))}
                      />
                      {detail.type_entite === "COMPOSANTE" && (
                        <Field
                          label="Site web"
                          value={form.site_web}
                          onChange={(v) => setForm((f) => ({ ...f, site_web: v }))}
                        />
                      )}
                      {detail.type_entite === "DEPARTEMENT" && (
                        <Field
                          label="Code interne"
                          value={form.code_interne}
                          onChange={(v) => setForm((f) => ({ ...f, code_interne: v }))}
                        />
                      )}
                      {detail.type_entite === "MENTION" && (
                        <Field
                          label="Type de diplôme"
                          value={form.type_diplome}
                          onChange={(v) => setForm((f) => ({ ...f, type_diplome: v }))}
                        />
                      )}
                      {detail.type_entite === "PARCOURS" && (
                        <Field
                          label="Code parcours"
                          value={form.code_parcours}
                          onChange={(v) => setForm((f) => ({ ...f, code_parcours: v }))}
                        />
                      )}
                      {detail.type_entite === "NIVEAU" && (
                        <Field
                          label="Libellé court"
                          value={form.libelle_court}
                          onChange={(v) => setForm((f) => ({ ...f, libelle_court: v }))}
                        />
                      )}
                    </div>
                    <DialogFooter>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                      >
                        <X className="w-4 h-4" />
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {saving ? "Enregistrement…" : "Enregistrer"}
                      </button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-slate-900 font-medium mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailField({
  label,
  value,
  kind = "text",
}: {
  label: string;
  value: string | null | undefined;
  kind?: "text" | "email" | "link";
}) {
  const normalizedValue = value?.trim() ? value.trim() : "";

  const content =
    kind === "email" && normalizedValue ? (
      <a href={`mailto:${normalizedValue}`} className="text-indigo-600 hover:underline break-all">
        {normalizedValue}
      </a>
    ) : kind === "link" && normalizedValue ? (
      <a
        href={normalizedValue}
        target="_blank"
        rel="noreferrer"
        className="text-indigo-600 hover:underline break-all"
      >
        {normalizedValue}
      </a>
    ) : (
      <span className="text-slate-900 break-words">{normalizedValue || "Non renseigné"}</span>
    );

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
        {content}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function PersonCard({
  person,
}: {
  person: EntiteStructureDetail["responsables"][number];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="font-medium text-slate-900">
          {person.prenom} {person.nom}
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-600 border border-slate-200">
          {person.role_libelle}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-slate-700">
          <Mail className="w-4 h-4 text-slate-400" />
          <span>{person.email_institutionnel || "Email personnel non renseigné"}</span>
        </div>
        {person.contact?.email_fonctionnelle && (
          <div className="flex flex-wrap items-center gap-2 text-indigo-700">
            <Mail className="w-4 h-4" />
            <span>{person.contact.email_fonctionnelle}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-4 text-slate-600">
          <span className="inline-flex items-center gap-2">
            <Phone className="w-4 h-4 text-slate-400" />
            {person.telephone || "Tél. personnel non renseigné"}
          </span>
          {person.contact?.telephone && (
            <span className="inline-flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              {person.contact.telephone}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-4 text-slate-500">
          <span>{person.bureau ? `Bureau personnel: ${person.bureau}` : "Bureau personnel non renseigné"}</span>
          {person.contact?.bureau && (
            <span>{`Bureau fonctionnel: ${person.contact.bureau}`}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange?: (v: string) => void;
}) {
  const v = value ?? "";
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {onChange ? (
        <input
          type="text"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      ) : (
        <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900">
          {v || "—"}
        </div>
      )}
    </div>
  );
}
