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

/** Retourne l'ensemble des id_entite descendants (récursif) d'une entité, dans la liste donnée */
function getDescendantIds(entites: EntiteStructure[], rootId: number): Set<number> {
  const byParent = new Map<number | null, number[]>();
  for (const e of entites) {
    const parent = e.id_entite_parent ?? null;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(e.id_entite);
  }
  const out = new Set<number>();
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const children = byParent.get(current) ?? [];
    for (const c of children) {
      if (!out.has(c)) {
        out.add(c);
        stack.push(c);
      }
    }
  }
  return out;
}

interface ManageStructuresProps {
  userRole: UserRole;
  currentYear: AcademicYear;
  entites: EntiteStructure[];
  authLogin: string | null;
  focusEntiteId?: number | null;
}

type ApiEntiteDetail = EntiteStructureDetail;

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
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ApiEntiteDetail>>({});

  const canEdit = canManageStructures(userRole);
  const yearEntites = useMemo(
    () => entites.filter((e) => String(e.id_annee) === currentYear.id),
    [entites, currentYear.id],
  );

  const [filterComposanteId, setFilterComposanteId] = useState<number | "">("");
  const [filterType, setFilterType] = useState<string>("");

  const composantes = useMemo(
    () => yearEntites.filter((e) => e.type_entite === "COMPOSANTE"),
    [yearEntites],
  );

  const filteredList = useMemo(() => {
    let list = yearEntites;
    if (filterComposanteId !== "") {
      const id = Number(filterComposanteId);
      const descendantIds = getDescendantIds(yearEntites, id);
      list = yearEntites.filter((e) => e.id_entite === id || descendantIds.has(e.id_entite));
    }
    if (filterType !== "") {
      list = list.filter((e) => e.type_entite === filterType);
    }
    return list;
  }, [yearEntites, filterComposanteId, filterType]);

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
      setIsEditing(false);
    }
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (focusEntiteId) setSelectedId(focusEntiteId);
  }, [focusEntiteId]);

  const handleSave = async () => {
    if (!authLogin || !selectedId || !detail) return;
    setSaving(true);
    setError(null);
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
      setIsEditing(false);
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
    setIsEditing(false);
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
          <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
            <h2 className="font-medium text-slate-900">Structures ({currentYear.label})</h2>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Composante</label>
              <select
                value={filterComposanteId === "" ? "" : String(filterComposanteId)}
                onChange={(e) => setFilterComposanteId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900"
              >
                <option value="">Toutes les composantes</option>
                {composantes.map((c) => (
                  <option key={c.id_entite} value={c.id_entite}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900"
              >
                {TYPE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
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
                  {canEdit && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Modifier la fiche
                    </button>
                  )}
                  {canEdit && isEditing && (
                    <>
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
                    </>
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
                      value={isEditing ? form.nom : detail.nom}
                      onChange={isEditing ? (v) => setForm((f) => ({ ...f, nom: v })) : undefined}
                    />
                    <Field
                      label="Téléphone du service"
                      value={isEditing ? form.tel_service : detail.tel_service}
                      onChange={isEditing ? (v) => setForm((f) => ({ ...f, tel_service: v })) : undefined}
                    />
                    <Field
                      label="Bureau du service"
                      value={isEditing ? form.bureau_service : detail.bureau_service}
                      onChange={isEditing ? (v) => setForm((f) => ({ ...f, bureau_service: v })) : undefined}
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
                          {p.telephone && (
                            <span className="text-sm flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {p.telephone}
                            </span>
                          )}
                          {p.bureau && (
                            <span className="text-sm text-slate-500">Bureau {p.bureau}</span>
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
                          {p.telephone && (
                            <span className="text-sm flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {p.telephone}
                            </span>
                          )}
                          {p.bureau && (
                            <span className="text-sm text-slate-500">Bureau {p.bureau}</span>
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
                    <Field
                      label="Site web"
                      value={isEditing ? form.site_web : detail.site_web}
                      onChange={isEditing ? (v) => setForm((f) => ({ ...f, site_web: v })) : undefined}
                    />
                  </section>
                )}

                {detail.type_entite === "DEPARTEMENT" && (
                  <section>
                    <h3 className="text-slate-900 font-medium mb-4">Département</h3>
                    <Field
                      label="Code interne"
                      value={isEditing ? form.code_interne : detail.code_interne}
                      onChange={isEditing ? (v) => setForm((f) => ({ ...f, code_interne: v })) : undefined}
                    />
                  </section>
                )}

                {detail.type_entite === "MENTION" && (
                  <section>
                    <h3 className="text-slate-900 font-medium mb-4">Mention</h3>
                    <Field
                      label="Type de diplôme"
                      value={isEditing ? form.type_diplome : detail.type_diplome}
                      onChange={isEditing ? (v) => setForm((f) => ({ ...f, type_diplome: v })) : undefined}
                    />
                  </section>
                )}

                {detail.type_entite === "PARCOURS" && (
                  <section>
                    <h3 className="text-slate-900 font-medium mb-4">Parcours</h3>
                    <Field
                      label="Code parcours"
                      value={isEditing ? form.code_parcours : detail.code_parcours}
                      onChange={isEditing ? (v) => setForm((f) => ({ ...f, code_parcours: v })) : undefined}
                    />
                  </section>
                )}

                {detail.type_entite === "NIVEAU" && (
                  <section>
                    <h3 className="text-slate-900 font-medium mb-4">Niveau / Formation</h3>
                    <Field
                      label="Libellé court"
                      value={isEditing ? form.libelle_court : detail.libelle_court}
                      onChange={isEditing ? (v) => setForm((f) => ({ ...f, libelle_court: v })) : undefined}
                    />
                  </section>
                )}
              </div>
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
