import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Edit2,
  ExternalLink,
  FileText,
  Mail,
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
        <h1 className="text-2xl font-semibold text-slate-900">Fiches structures</h1>
        <p className="text-slate-600 mt-1">
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

        <div className="lg:col-span-2">
          {selectedId === null ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Sélectionnez une structure dans la liste pour afficher sa fiche.</p>
            </div>
          ) : loading ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center text-slate-500">
              Chargement…
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
              {error}
            </div>
          ) : detail ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className="text-xs text-slate-500">{TYPE_LABELS[detail.type_entite] ?? detail.type_entite}</span>
                  <h2 className="text-xl font-semibold text-slate-900">{detail.nom}</h2>
                </div>
                <div className="flex items-center gap-2">
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
              </div>

              {error && (
                <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}

              <div className="p-6 space-y-6">
                <section>
                  <h3 className="text-slate-900 font-medium mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    Informations générales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field
                      label="Nom"
                      value={detail.nom}
                    />
                    <Field
                      label="Téléphone du service"
                      value={detail.tel_service}
                    />
                    <Field
                      label="Bureau du service"
                      value={detail.bureau_service}
                    />
                  </div>
                </section>

                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
                      <Users className="w-4 h-4" />
                      Sous-responsables
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                      {detail.nombre_sous_responsables ?? 0}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
                      <UserCheck className="w-4 h-4" />
                      Délégations
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                      {detail.nombre_delegations ?? 0}
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
                      <AlertCircle className="w-4 h-4" />
                      Signalements
                    </div>
                    <div className="text-2xl font-semibold text-slate-900">
                      {detail.nombre_signalements ?? 0}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-slate-900 font-medium mb-4 flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-indigo-600" />
                    Responsable(s)
                  </h3>
                  {(detail.responsables?.length ?? 0) === 0 ? (
                    <p className="text-slate-500 text-sm">Aucun responsable affecté sur cette structure.</p>
                  ) : (
                    <ul className="space-y-3">
                      {(detail.responsables ?? []).map((p) => (
                        <li
                          key={`${p.id_user}-${p.id_role}`}
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 px-3 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <span className="font-medium text-slate-900">
                            {p.prenom} {p.nom}
                          </span>
                          <span className="text-sm text-slate-600">{p.role_libelle}</span>
                          {p.email_institutionnel && (
                            <span className="text-sm flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {p.email_institutionnel}
                            </span>
                          )}
                          {p.contact?.email_fonctionnelle && (
                            <span className="text-sm flex items-center gap-1 text-indigo-700">
                              <Mail className="w-3.5 h-3.5" />
                              Mail fonctionnel : {p.contact.email_fonctionnelle}
                            </span>
                          )}
                          {p.telephone && (
                            <span className="text-sm flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {p.telephone}
                            </span>
                          )}
                          {p.contact?.telephone && (
                            <span className="text-sm flex items-center gap-1 text-slate-600">
                              <Phone className="w-3.5 h-3.5" />
                              Tél. fonctionnel : {p.contact.telephone}
                            </span>
                          )}
                          {p.bureau && (
                            <span className="text-sm text-slate-500">Bureau {p.bureau}</span>
                          )}
                          {p.contact?.bureau && (
                            <span className="text-sm text-slate-500">
                              Bureau fonctionnel {p.contact.bureau}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section>
                  <h3 className="text-slate-900 font-medium mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Secrétariat
                  </h3>
                  {(detail.secretariat?.length ?? 0) === 0 ? (
                    <p className="text-slate-500 text-sm">Aucune personne en secrétariat sur cette structure.</p>
                  ) : (
                    <ul className="space-y-3">
                      {(detail.secretariat ?? []).map((p) => (
                        <li
                          key={`${p.id_user}-${p.id_role}`}
                          className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 px-3 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <span className="font-medium text-slate-900">
                            {p.prenom} {p.nom}
                          </span>
                          <span className="text-sm text-slate-600">{p.role_libelle}</span>
                          {p.email_institutionnel && (
                            <span className="text-sm flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {p.email_institutionnel}
                            </span>
                          )}
                          {p.contact?.email_fonctionnelle && (
                            <span className="text-sm flex items-center gap-1 text-indigo-700">
                              <Mail className="w-3.5 h-3.5" />
                              Mail fonctionnel : {p.contact.email_fonctionnelle}
                            </span>
                          )}
                          {p.telephone && (
                            <span className="text-sm flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {p.telephone}
                            </span>
                          )}
                          {p.contact?.telephone && (
                            <span className="text-sm flex items-center gap-1 text-slate-600">
                              <Phone className="w-3.5 h-3.5" />
                              Tél. fonctionnel : {p.contact.telephone}
                            </span>
                          )}
                          {p.bureau && (
                            <span className="text-sm text-slate-500">Bureau {p.bureau}</span>
                          )}
                          {p.contact?.bureau && (
                            <span className="text-sm text-slate-500">
                              Bureau fonctionnel {p.contact.bureau}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {detail.type_entite === "COMPOSANTE" && (
                  <section>
                    <h3 className="text-slate-900 font-medium mb-4 flex items-center gap-2">
                      <ExternalLink className="w-5 h-5 text-indigo-600" />
                      Composante
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field
                        label="Code composante"
                        value={detail.code_composante}
                      />
                      <Field
                        label="Type de composante"
                        value={detail.type_composante}
                      />
                      <Field
                        label="Campus"
                        value={detail.campus}
                      />
                      <Field
                        label="Mail fonctionnel"
                        value={detail.mail_fonctionnel}
                      />
                      <Field
                        label="Mail institutionnel"
                        value={detail.mail_institutionnel}
                      />
                      <Field
                        label="Site web"
                        value={detail.site_web}
                      />
                    </div>
                  </section>
                )}

                {detail.type_entite === "DEPARTEMENT" && (
                  <section>
                    <h3 className="text-slate-900 font-medium mb-4">Département</h3>
                    <Field
                      label="Code interne"
                      value={detail.code_interne}
                    />
                  </section>
                )}

                {detail.type_entite === "MENTION" && (
                  <section>
                    <h3 className="text-slate-900 font-medium mb-4">Mention</h3>
                    <Field
                      label="Type de diplôme"
                      value={detail.type_diplome}
                    />
                  </section>
                )}

                {detail.type_entite === "PARCOURS" && (
                  <section>
                    <h3 className="text-slate-900 font-medium mb-4">Parcours</h3>
                    <Field
                      label="Code parcours"
                      value={detail.code_parcours}
                    />
                  </section>
                )}

                {detail.type_entite === "NIVEAU" && (
                  <section>
                    <h3 className="text-slate-900 font-medium mb-4">Niveau / Formation</h3>
                    <Field
                      label="Libellé court"
                      value={detail.libelle_court}
                    />
                  </section>
                )}
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
            </div>
          ) : null}
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
