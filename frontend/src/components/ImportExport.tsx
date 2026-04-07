import { useEffect, useMemo, useState } from "react";
import {
  AcademicYear,
  EntiteStructure,
  UserRole,
  canAccessFilteredQueries,
  canImportData,
} from "../types";
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderTree,
  RefreshCw,
  Upload,
  XCircle,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  STANDARD_WORKBOOK_VERSION,
  downloadBase64File,
  getWorkbookSourceScopes,
  parseStandardWorkbookXml,
  type StandardWorkbookPayload,
} from "../lib/standard-workbook";

interface ImportExportProps {
  userRole: UserRole;
  currentYear: AcademicYear;
  authLogin: string | null;
  entites: EntiteStructure[];
}

type ApiYear = {
  id_annee: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  statut: "EN_COURS" | "PREPARATION" | "ARCHIVEE";
};

type ExportRow = {
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  role: string;
  entite: string;
  id_annee: number;
};

type ImportRow = {
  login: string;
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  telephone: string | null;
  bureau: string | null;
  id_role: string;
  id_entite: number;
  id_annee: number;
  date_debut: string;
  date_fin: string | null;
};

type PreviewStatus = "new_user" | "update_user" | "duplicate_affectation" | "error";

type PreviewChange = { field: string; oldValue: string | null; newValue: string | null; major?: boolean };

type PreviewItem = {
  rowIndex: number;
  status: PreviewStatus;
  login: string;
  nom: string;
  prenom: string;
  id_role: string;
  id_entite: number;
  id_annee: number;
  entiteNom?: string | null;
  roleLabel?: string | null;
  changes?: PreviewChange[];
  error?: string;
};

type WorkbookPreviewStatus = "create" | "update" | "reuse" | "skip" | "warning" | "error";

type WorkbookPreviewItem = {
  sheet: string;
  sourceKey: string;
  label: string;
  status: WorkbookPreviewStatus;
  detail: string;
};

type WorkbookPreviewSummary = {
  total: number;
  create: number;
  update: number;
  reuse: number;
  skip: number;
  warning: number;
  error: number;
  targetYearId: number | null;
  targetYearLabel: string | null;
  targetYearWillBeCreated: boolean;
};

const toCsv = (rows: ExportRow[]) => {
  const header = ["nom", "prenom", "email", "role", "entite", "annee"].join(",");
  const body = rows
    .map((row) =>
      [
        row.nom,
        row.prenom,
        row.email_institutionnel || "",
        row.role,
        row.entite,
        row.id_annee,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
};

const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const statusLabel: Record<PreviewStatus, string> = {
  new_user: "Nouveau",
  update_user: "Mise à jour",
  duplicate_affectation: "Doublon",
  error: "Erreur",
};

const statusClass: Record<PreviewStatus, string> = {
  new_user: "bg-green-100 text-green-700",
  update_user: "bg-amber-100 text-amber-700",
  duplicate_affectation: "bg-slate-100 text-slate-600",
  error: "bg-red-100 text-red-700",
};

const workbookStatusClass: Record<WorkbookPreviewStatus, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-amber-100 text-amber-700",
  reuse: "bg-slate-100 text-slate-700",
  skip: "bg-slate-100 text-slate-500",
  warning: "bg-orange-100 text-orange-700",
  error: "bg-red-100 text-red-700",
};

const workbookStatusLabel: Record<WorkbookPreviewStatus, string> = {
  create: "Créer",
  update: "Mettre à jour",
  reuse: "Réutiliser",
  skip: "Ignorer",
  warning: "Attention",
  error: "Erreur",
};

export function ImportExport({
  userRole,
  currentYear,
  authLogin,
  entites,
}: ImportExportProps) {
  const [importStep, setImportStep] = useState<"upload" | "review" | "done">("upload");
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewSummary, setPreviewSummary] = useState<{
    total: number;
    newUser: number;
    updateUser: number;
    duplicateAffectation: number;
    error: number;
  } | null>(null);
  const [includedRows, setIncludedRows] = useState<Set<number>>(new Set());
  const [filterStatus, setFilterStatus] = useState<PreviewStatus | "all">("all");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const [years, setYears] = useState<ApiYear[]>([]);
  const [workbookExportMode, setWorkbookExportMode] = useState<"year" | "structure">("year");
  const [workbookExportEntiteId, setWorkbookExportEntiteId] = useState("");
  const [workbookFileName, setWorkbookFileName] = useState("");
  const [parsedWorkbook, setParsedWorkbook] = useState<StandardWorkbookPayload | null>(null);
  const [workbookSourceScopeId, setWorkbookSourceScopeId] = useState("");
  const [workbookTargetYearId, setWorkbookTargetYearId] = useState(currentYear.id);
  const [createTargetYear, setCreateTargetYear] = useState(false);
  const [workbookLoading, setWorkbookLoading] = useState(false);
  const [workbookError, setWorkbookError] = useState<string | null>(null);
  const [workbookPreviewItems, setWorkbookPreviewItems] = useState<WorkbookPreviewItem[]>([]);
  const [workbookPreviewSummary, setWorkbookPreviewSummary] = useState<WorkbookPreviewSummary | null>(null);
  const [workbookPreviewFilter, setWorkbookPreviewFilter] = useState<WorkbookPreviewStatus | "all">("all");
  const [workbookStep, setWorkbookStep] = useState<"idle" | "review" | "done">("idle");
  const [workbookMessage, setWorkbookMessage] = useState("");

  const canImport = canImportData(userRole);
  const canQuery = canAccessFilteredQueries(userRole);
  const canUseStandardWorkbook = userRole === "services-centraux";

  const currentYearEntites = useMemo(
    () => entites.filter((entite) => String(entite.id_annee) === currentYear.id),
    [currentYear.id, entites],
  );
  const workbookExportOptions = useMemo(
    () =>
      [...currentYearEntites].sort((left, right) =>
        left.nom.localeCompare(right.nom, "fr", { sensitivity: "base" }),
      ),
    [currentYearEntites],
  );
  const workbookSourceScopes = useMemo(
    () => (parsedWorkbook ? getWorkbookSourceScopes(parsedWorkbook) : []),
    [parsedWorkbook],
  );
  const filteredWorkbookPreview = useMemo(
    () =>
      workbookPreviewFilter === "all"
        ? workbookPreviewItems
        : workbookPreviewItems.filter((item) => item.status === workbookPreviewFilter),
    [workbookPreviewFilter, workbookPreviewItems],
  );

  useEffect(() => {
    if (!authLogin || !canUseStandardWorkbook) return;
    apiFetch<{ items: ApiYear[] }>("/years", { login: authLogin })
      .then((data) => setYears(data.items || []))
      .catch(() => setYears([]));
  }, [authLogin, canUseStandardWorkbook]);

  const parseCsvLine = (line: string) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
        continue;
      }
      current += char;
    }
    values.push(current.trim());
    return values.map((value) => value.replace(/^"(.*)"$/, "$1"));
  };

  const handleWorkbookDownload = async (template: boolean) => {
    if (!authLogin) return;
    setWorkbookLoading(true);
    setWorkbookError(null);
    try {
      const entiteId =
        workbookExportMode === "structure" && workbookExportEntiteId
          ? `&entiteId=${workbookExportEntiteId}`
          : "";
      const data = await apiFetch<{
        fileName: string;
        mimeType: string;
        contentBase64: string;
      }>(
        `/exports/workbook?yearId=${currentYear.id}${entiteId}&template=${template ? "true" : "false"}`,
        { login: authLogin },
      );
      downloadBase64File(data.contentBase64, data.fileName, data.mimeType);
    } catch (err) {
      setWorkbookError(err instanceof Error ? err.message : "Erreur d'export Excel");
    } finally {
      setWorkbookLoading(false);
    }
  };

  const handleWorkbookFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setWorkbookLoading(true);
    setWorkbookError(null);
    setWorkbookPreviewItems([]);
    setWorkbookPreviewSummary(null);
    setWorkbookStep("idle");
    setWorkbookMessage("");

    try {
      const content = await file.text();
      const workbook = parseStandardWorkbookXml(content);
      setParsedWorkbook(workbook);
      setWorkbookFileName(file.name);
      setWorkbookSourceScopeId(workbook.meta.scope_source_entite_id || "");
      setCreateTargetYear(false);
      setWorkbookTargetYearId(currentYear.id);
    } catch (err) {
      setParsedWorkbook(null);
      setWorkbookError(err instanceof Error ? err.message : "Classeur Excel invalide");
    } finally {
      setWorkbookLoading(false);
    }
  };

  const handleWorkbookPreview = async () => {
    if (!authLogin || !parsedWorkbook) return;

    setWorkbookLoading(true);
    setWorkbookError(null);
    setWorkbookMessage("");
    try {
      const data = await apiFetch<{
        items: WorkbookPreviewItem[];
        summary: WorkbookPreviewSummary;
      }>("/imports/workbook/preview", {
        method: "POST",
        body: JSON.stringify({
          workbook: parsedWorkbook,
          targetYearId: createTargetYear ? undefined : Number(workbookTargetYearId),
          createTargetYear,
          scopeSourceEntiteId: workbookSourceScopeId
            ? Number(workbookSourceScopeId)
            : undefined,
        }),
        login: authLogin,
      });

      setWorkbookPreviewItems(data.items || []);
      setWorkbookPreviewSummary(data.summary || null);
      setWorkbookStep("review");
    } catch (err) {
      setWorkbookError(err instanceof Error ? err.message : "Erreur d'analyse du classeur");
    } finally {
      setWorkbookLoading(false);
    }
  };

  const handleWorkbookConfirm = async () => {
    if (!authLogin || !parsedWorkbook) return;
    setWorkbookLoading(true);
    setWorkbookError(null);
    setWorkbookMessage("");
    try {
      const data = await apiFetch<{
        items: WorkbookPreviewItem[];
        summary: WorkbookPreviewSummary;
        result?: { targetYearId: number | null; targetYearLabel: string | null; processed: number };
      }>("/imports/workbook/confirm", {
        method: "POST",
        body: JSON.stringify({
          workbook: parsedWorkbook,
          targetYearId: createTargetYear ? undefined : Number(workbookTargetYearId),
          createTargetYear,
          scopeSourceEntiteId: workbookSourceScopeId
            ? Number(workbookSourceScopeId)
            : undefined,
        }),
        login: authLogin,
      });

      setWorkbookPreviewItems(data.items || []);
      setWorkbookPreviewSummary(data.summary || null);
      setWorkbookStep("done");
      setWorkbookMessage(
        data.result?.targetYearLabel
          ? `Import terminé dans l'année ${data.result.targetYearLabel}.`
          : "Import terminé.",
      );
    } catch (err) {
      setWorkbookError(err instanceof Error ? err.message : "Erreur d'import Excel");
    } finally {
      setWorkbookLoading(false);
    }
  };

  const resetWorkbookImport = () => {
    setParsedWorkbook(null);
    setWorkbookFileName("");
    setWorkbookSourceScopeId("");
    setWorkbookPreviewItems([]);
    setWorkbookPreviewSummary(null);
    setWorkbookPreviewFilter("all");
    setWorkbookStep("idle");
    setWorkbookMessage("");
    setWorkbookError(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !authLogin) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportStatus("error");
      setImportMessage("Utilisez un fichier CSV (ou exportez votre Excel en CSV).");
      return;
    }

    setImportStatus("loading");
    setImportMessage("Analyse du fichier...");

    try {
      const content = await file.text();
      const lines = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length < 2) throw new Error("Fichier CSV vide");

      const header = parseCsvLine(lines[0]).map((item) => item.toLowerCase());
      const idx = (name: string) => header.indexOf(name.toLowerCase());
      const required = ["login", "nom", "prenom", "id_role", "id_entite", "id_annee", "date_debut"];
      const missing = required.filter((field) => idx(field) === -1);
      if (missing.length > 0) throw new Error(`Colonnes manquantes : ${missing.join(", ")}`);

      const rows: ImportRow[] = lines.slice(1).map((line) => {
        const cols = parseCsvLine(line);
        return {
          login: cols[idx("login")] || "",
          nom: cols[idx("nom")] || "",
          prenom: cols[idx("prenom")] || "",
          email_institutionnel: cols[idx("email_institutionnel")] || null,
          telephone: cols[idx("telephone")] || null,
          bureau: cols[idx("bureau")] || null,
          id_role: cols[idx("id_role")] || "",
          id_entite: Number(cols[idx("id_entite")]),
          id_annee: Number(cols[idx("id_annee")]),
          date_debut: cols[idx("date_debut")] || "",
          date_fin: cols[idx("date_fin")] || null,
        };
      });

      setParsedRows(rows);
      const preview = await apiFetch<{ items: PreviewItem[]; summary: typeof previewSummary }>(
        "/imports/responsables/preview",
        { method: "POST", body: JSON.stringify({ rows }), login: authLogin },
      );
      setPreviewItems(preview.items);
      setPreviewSummary(preview.summary);
      const included = new Set<number>();
      preview.items.forEach((item) => {
        if (item.status !== "error" && item.status !== "duplicate_affectation") {
          included.add(item.rowIndex);
        }
      });
      setIncludedRows(included);
      setImportStep("review");
      setImportStatus("idle");
    } catch (err) {
      setImportStatus("error");
      setImportMessage(err instanceof Error ? err.message : "Erreur lors de l'analyse");
    }
  };

  const toggleRow = (rowIndex: number) => {
    setIncludedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  const setAllIncluded = (value: boolean) => {
    if (value) {
      const next = new Set<number>();
      previewItems.forEach((item) => {
        if (item.status !== "error") next.add(item.rowIndex);
      });
      setIncludedRows(next);
    } else {
      setIncludedRows(new Set());
    }
  };

  const handleConfirmImport = async () => {
    if (!authLogin || parsedRows.length === 0) return;
    const excludeIndices = previewItems.map((i) => i.rowIndex).filter((i) => !includedRows.has(i));
    setImportStatus("loading");
    setImportMessage("Import en cours...");
    try {
      const result = await apiFetch<{
        result: { imported_rows: number; created_users: number; created_affectations: number };
      }>("/imports/responsables/confirm", {
        method: "POST",
        body: JSON.stringify({ rows: parsedRows, excludeIndices }),
        login: authLogin,
      });
      setImportStatus("success");
      setImportMessage(
        `${result.result.imported_rows} ligne(s) importée(s) — ${result.result.created_users} utilisateur(s) créé(s), ${result.result.created_affectations} affectation(s) créée(s).`,
      );
      setImportStep("done");
    } catch (err) {
      setImportStatus("error");
      setImportMessage(err instanceof Error ? err.message : "Erreur lors de l'import");
    }
  };

  const resetImport = () => {
    setImportStep("upload");
    setImportStatus("idle");
    setImportMessage("");
    setParsedRows([]);
    setPreviewItems([]);
    setPreviewSummary(null);
    setIncludedRows(new Set());
    setFilterStatus("all");
  };

  const filteredPreview =
    filterStatus === "all"
      ? previewItems
      : previewItems.filter((i) => i.status === filterStatus);

  const countIncluded = previewItems.filter((i) => includedRows.has(i.rowIndex)).length;

  const handleExport = async (format: "CSV" | "JSON") => {
    if (!authLogin) return;
    setExportLoading(true);
    setExportError(null);
    try {
      const data = await apiFetch<{ items: ExportRow[] }>(
        `/exports/responsables?yearId=${currentYear.id}`,
        { login: authLogin },
      );
      const items = data.items || [];
      if (format === "JSON") {
        downloadFile(
          JSON.stringify(items, null, 2),
          `responsables-${currentYear.year}.json`,
          "application/json",
        );
      } else {
        downloadFile(toCsv(items), `responsables-${currentYear.year}.csv`, "text/csv");
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Erreur export");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-slate-900 mb-2">Import / Export de données</h2>
        <p className="text-slate-600">
          Le format recommandé est désormais le classeur Excel standardisé <code>{STANDARD_WORKBOOK_VERSION}</code>, avec aperçu de fusion avant import.
        </p>
      </div>

      {canUseStandardWorkbook && (
        <>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-start gap-3 mb-6">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600 mt-1" />
              <div className="flex-1 space-y-5">
                <div>
                  <h3 className="text-slate-900 mb-2">Classeur Excel standardisé</h3>
                  <p className="text-slate-600 text-sm">
                    Exportez l’année complète ou une structure précise dans un format cohérent, réimportable plus tard avec gestion des fusions et des conflits.
                  </p>
                </div>

                {workbookError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                    {workbookError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Portée de l'export
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setWorkbookExportMode("year")}
                        className={`px-4 py-2 rounded-lg text-sm ${
                          workbookExportMode === "year"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Toute l'année
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorkbookExportMode("structure")}
                        className={`px-4 py-2 rounded-lg text-sm ${
                          workbookExportMode === "structure"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Une structure
                      </button>
                    </div>
                  </div>

                  {workbookExportMode === "structure" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Structure à exporter
                      </label>
                      <select
                        value={workbookExportEntiteId}
                        onChange={(e) => setWorkbookExportEntiteId(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="">Sélectionner une structure</option>
                        {workbookExportOptions.map((entite) => (
                          <option key={entite.id_entite} value={entite.id_entite}>
                            #{entite.id_entite} — {entite.nom} ({entite.type_entite})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleWorkbookDownload(false)}
                    disabled={
                      workbookLoading ||
                      (workbookExportMode === "structure" && !workbookExportEntiteId)
                    }
                    className="p-4 border-2 border-slate-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-all text-left disabled:opacity-60"
                  >
                    <Download className="w-8 h-8 text-emerald-600 mb-2" />
                    <h4 className="text-slate-900 mb-1">Télécharger le classeur standard</h4>
                    <p className="text-slate-600 text-sm">
                      Export Excel XML prêt à être rouvert et réimporté.
                    </p>
                  </button>

                  <button
                    onClick={() => handleWorkbookDownload(true)}
                    disabled={workbookLoading}
                    className="p-4 border-2 border-slate-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left disabled:opacity-60"
                  >
                    <FolderTree className="w-8 h-8 text-indigo-600 mb-2" />
                    <h4 className="text-slate-900 mb-1">Télécharger un modèle vide</h4>
                    <p className="text-slate-600 text-sm">
                      Même format, sans données, pour préparer un import propre depuis Excel.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-start gap-3 mb-6">
              <Upload className="w-6 h-6 text-indigo-600 mt-1" />
              <div className="flex-1 space-y-5">
                <div>
                  <h3 className="text-slate-900 mb-2">Importer un classeur Excel standardisé</h3>
                  <p className="text-slate-600 text-sm">
                    Chargez un fichier Excel XML standardisé, choisissez l’année cible puis lancez un aperçu de fusion avant validation.
                  </p>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                  <input
                    type="file"
                    accept=".xml,.xls"
                    onChange={handleWorkbookFileUpload}
                    className="hidden"
                    id="workbook-upload"
                  />
                  <label htmlFor="workbook-upload" className="cursor-pointer">
                    <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 mb-1">
                      {workbookFileName || "Choisir un fichier Excel standardisé"}
                    </p>
                    <p className="text-slate-500 text-sm">
                      Format attendu : {STANDARD_WORKBOOK_VERSION}
                    </p>
                  </label>
                </div>

                {parsedWorkbook && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Année cible
                        </label>
                        <select
                          value={workbookTargetYearId}
                          onChange={(e) => setWorkbookTargetYearId(e.target.value)}
                          disabled={createTargetYear}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                        >
                          {years.map((year) => (
                            <option key={year.id_annee} value={year.id_annee}>
                              {year.libelle}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Périmètre du fichier
                        </label>
                        <select
                          value={workbookSourceScopeId}
                          onChange={(e) => setWorkbookSourceScopeId(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="">Tout le fichier</option>
                          {workbookSourceScopes.map((scope) => (
                            <option key={scope.id} value={scope.id}>
                              {scope.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={createTargetYear}
                          onChange={(e) => setCreateTargetYear(e.target.checked)}
                          className="h-4 w-4 text-indigo-600 rounded"
                        />
                        Créer l'année à partir du fichier
                      </label>
                    </div>

                    <div className="text-sm text-slate-500">
                      Source du fichier : {parsedWorkbook.meta.source_year_label || "non précisée"}
                      {parsedWorkbook.meta.scope_type === "STRUCTURE" &&
                        parsedWorkbook.meta.scope_entite_name
                        ? ` · portée : ${parsedWorkbook.meta.scope_entite_name}`
                        : ""}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleWorkbookPreview}
                        disabled={workbookLoading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-60"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Prévisualiser la fusion
                      </button>
                      <button
                        onClick={resetWorkbookImport}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Réinitialiser
                      </button>
                    </div>
                  </div>
                )}

                {workbookStep !== "idle" && workbookPreviewSummary && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-600">
                        <strong>{workbookPreviewSummary.total}</strong> action(s) —{" "}
                        <span className="text-green-600">{workbookPreviewSummary.create} création(s)</span>,{" "}
                        <span className="text-amber-600">{workbookPreviewSummary.update} mise(s) à jour</span>,{" "}
                        <span className="text-slate-600">{workbookPreviewSummary.reuse} réutilisation(s)</span>,{" "}
                        <span className="text-slate-500">{workbookPreviewSummary.skip} ignorée(s)</span>,{" "}
                        <span className="text-orange-600">{workbookPreviewSummary.warning} alerte(s)</span>
                        {workbookPreviewSummary.error > 0 && (
                          <>, <span className="text-red-600">{workbookPreviewSummary.error} erreur(s)</span></>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <select
                          value={workbookPreviewFilter}
                          onChange={(e) =>
                            setWorkbookPreviewFilter(
                              e.target.value as WorkbookPreviewStatus | "all",
                            )
                          }
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                        >
                          <option value="all">Tous</option>
                          <option value="create">Créer</option>
                          <option value="update">Mettre à jour</option>
                          <option value="reuse">Réutiliser</option>
                          <option value="skip">Ignorer</option>
                          <option value="warning">Alertes</option>
                          <option value="error">Erreurs</option>
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Feuille</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Élément</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Statut</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Détail</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {filteredWorkbookPreview.map((item) => (
                            <tr key={`${item.sheet}-${item.sourceKey}-${item.label}`} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-600 uppercase">{item.sheet}</td>
                              <td className="px-3 py-2 text-slate-700">
                                <div className="font-medium">{item.label}</div>
                                {item.sourceKey && (
                                  <div className="text-xs text-slate-500">{item.sourceKey}</div>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex px-2 py-0.5 rounded text-xs ${workbookStatusClass[item.status]}`}>
                                  {workbookStatusLabel[item.status]}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-600">{item.detail}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {workbookStep === "review" && (
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handleWorkbookConfirm}
                          disabled={workbookLoading || workbookPreviewSummary.error > 0}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirmer l'import
                        </button>
                        <button
                          onClick={resetWorkbookImport}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Annuler
                        </button>
                      </div>
                    )}

                    {workbookStep === "done" && (
                      <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <p className="text-green-900">{workbookMessage}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {canImport && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start gap-3 mb-6">
            <Upload className="w-6 h-6 text-indigo-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-slate-900 mb-2">Import CSV hérité des responsables</h3>
              <p className="text-slate-600 mb-4">
                Ancien flux conservé pour compatibilité. Colonnes CSV : login, nom, prenom, id_role, id_entite, id_annee, date_debut
                (optionnel : email_institutionnel, telephone, bureau, date_fin).
              </p>

              {importStep === "upload" && (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 mb-1">Choisir un fichier CSV</p>
                    <p className="text-slate-500 text-sm">Une revue des doublons et modifications s'affichera avant validation</p>
                  </label>
                </div>
              )}

              {importStep === "review" && previewSummary && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 rounded-lg">
                    <span className="text-sm text-slate-600">
                      <strong>{previewSummary.total}</strong> ligne(s) —{" "}
                      <span className="text-green-600">{previewSummary.newUser} nouveau(x)</span>,{" "}
                      <span className="text-amber-600">{previewSummary.updateUser} mise(s) à jour</span>,{" "}
                      <span className="text-slate-600">{previewSummary.duplicateAffectation} doublon(s)</span>
                      {previewSummary.error > 0 && (
                        <>, <span className="text-red-600">{previewSummary.error} erreur(s)</span></>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-500" />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as PreviewStatus | "all")}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                      >
                        <option value="all">Tous</option>
                        <option value="new_user">Nouveaux</option>
                        <option value="update_user">Mises à jour</option>
                        <option value="duplicate_affectation">Doublons</option>
                        <option value="error">Erreurs</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={countIncluded === previewItems.filter((i) => i.status !== "error").length}
                        onChange={(e) => setAllIncluded(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 rounded"
                      />
                      Tout inclure (sauf erreurs)
                    </label>
                  </div>

                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-600 w-10">Incl.</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Login</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Nom / Prénom</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Rôle</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Structure</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Statut</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Détail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredPreview.map((item) => (
                          <tr key={item.rowIndex} className="hover:bg-slate-50">
                            <td className="px-3 py-2">
                              {item.status !== "error" ? (
                                <input
                                  type="checkbox"
                                  checked={includedRows.has(item.rowIndex)}
                                  onChange={() => toggleRow(item.rowIndex)}
                                  className="h-4 w-4 text-indigo-600 rounded"
                                />
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-slate-700">{item.login}</td>
                            <td className="px-3 py-2 text-slate-700">{item.prenom} {item.nom}</td>
                            <td className="px-3 py-2 text-slate-600">{item.roleLabel ?? item.id_role}</td>
                            <td className="px-3 py-2 text-slate-600">{item.entiteNom ?? item.id_entite}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs ${statusClass[item.status]}`}>
                                {statusLabel[item.status]}
                              </span>
                            </td>
                            <td className="px-3 py-2 max-w-[200px]">
                              {item.error && (
                                <span className="text-red-600 text-xs">{item.error}</span>
                              )}
                              {item.changes && item.changes.length > 0 && (
                                <details className="text-xs text-slate-600">
                                  <summary className="cursor-pointer">Modifications</summary>
                                  <ul className="mt-1 space-y-0.5">
                                    {item.changes.map((c, k) => (
                                      <li key={k}>
                                        <span className={c.major ? "font-medium text-amber-700" : ""}>
                                          {c.field} : {c.oldValue ?? "—"} → {c.newValue ?? "—"}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </details>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleConfirmImport}
                      disabled={importStatus === "loading" || countIncluded === 0}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Valider l'import ({countIncluded} ligne(s))
                    </button>
                    <button
                      onClick={resetImport}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {importStep === "done" && (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-lg flex items-start gap-3 ${
                      importStatus === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                    }`}
                  >
                    {importStatus === "success" ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <p className={importStatus === "success" ? "text-green-900" : "text-red-900"}>
                      {importMessage}
                    </p>
                  </div>
                  <button
                    onClick={resetImport}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Nouvel import
                  </button>
                </div>
              )}

              {importStatus === "loading" && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-indigo-600 animate-pulse" />
                  <p className="text-indigo-900">{importMessage}</p>
                </div>
              )}
              {importStep === "upload" && importStatus === "error" && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <p className="text-red-900">{importMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {canQuery && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start gap-3 mb-6">
            <Download className="w-6 h-6 text-green-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-slate-900 mb-2">Exports hérités</h3>
              <p className="text-slate-600 mb-4">Exports rapides des responsables de l'année courante.</p>

              {exportError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                  {exportError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleExport("CSV")}
                  disabled={exportLoading}
                  className="p-4 border-2 border-slate-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all text-left group disabled:opacity-60"
                >
                  <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
                  <h4 className="text-slate-900 mb-1">Export CSV</h4>
                  <p className="text-slate-600 text-sm">Format historique</p>
                </button>
                <button
                  onClick={() => handleExport("JSON")}
                  disabled={exportLoading}
                  className="p-4 border-2 border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group disabled:opacity-60"
                >
                  <FileText className="w-8 h-8 text-blue-600 mb-2" />
                  <h4 className="text-slate-900 mb-1">Export JSON</h4>
                  <p className="text-slate-600 text-sm">Format technique</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!canUseStandardWorkbook && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          Le classeur Excel standardisé est réservé aux Services centraux. Les imports CSV hérités restent disponibles pour votre rôle.
        </div>
      )}

      {!canQuery && canImport && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          Les exports hérités sont réservés aux Services centraux ; ils sont donc masqués pour ce rôle.
        </div>
      )}
    </div>
  );
}
