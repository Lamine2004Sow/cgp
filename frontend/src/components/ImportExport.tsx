import { useState } from "react";
import { UserRole, AcademicYear, canImportData, canAccessFilteredQueries } from "../types";
import { Upload, Download, FileSpreadsheet, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { apiFetch } from "../lib/api";

interface ImportExportProps {
  userRole: UserRole;
  currentYear: AcademicYear;
  authLogin: string | null;
}

type ExportRow = {
  nom: string;
  prenom: string;
  email_institutionnel: string | null;
  role: string;
  entite: string;
  id_annee: number;
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

export function ImportExport({ userRole, currentYear, authLogin }: ImportExportProps) {
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const canImport = canImportData(userRole);
  const canQuery = canAccessFilteredQueries(userRole);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setTimeout(() => {
        setImportStatus("success");
        setImportMessage(`Fichier "${file.name}" importe avec succes.`);
      }, 1000);
    }
  };

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
        downloadFile(JSON.stringify(items, null, 2), `responsables-${currentYear.year}.json`, "application/json");
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
        <h2 className="text-slate-900 mb-2">Import/Export de donnees</h2>
        <p className="text-slate-600">Importer Excel (UC6) et exporter donnees (UC7)</p>
      </div>

      {canImport && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start gap-3 mb-6">
            <Upload className="w-6 h-6 text-indigo-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-slate-900 mb-2">UC6 : Importer les donnees initiales</h3>
              <p className="text-slate-600 mb-4">
                Importez les donnees depuis un fichier Excel. Formats : .xlsx, .xls
              </p>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-700 mb-1">Cliquez pour selectionner un fichier Excel</p>
                  <p className="text-slate-500 text-sm">ou glissez-deposez le fichier ici</p>
                </label>
              </div>

              {importStatus !== "idle" && (
                <div
                  className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                    importStatus === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                  }`}
                >
                  {importStatus === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <p className={importStatus === "success" ? "text-green-900" : "text-red-900"}>{importMessage}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-start gap-3 mb-6">
          <Download className="w-6 h-6 text-green-600 mt-1" />
          <div className="flex-1">
            <h3 className="text-slate-900 mb-2">UC7 : Exporter les donnees</h3>
            <p className="text-slate-600 mb-4">Exportez les donnees de l'annuaire</p>

            {exportError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                {exportError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleExport("CSV")}
                disabled={exportLoading}
                className="p-4 border-2 border-slate-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all text-left group disabled:opacity-60"
              >
                <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-slate-900 mb-1">Export CSV</h4>
                <p className="text-slate-600 text-sm">Format CSV pour traitement</p>
              </button>

              <button
                onClick={() => handleExport("JSON")}
                disabled={exportLoading}
                className="p-4 border-2 border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group disabled:opacity-60"
              >
                <FileText className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-slate-900 mb-1">Export JSON</h4>
                <p className="text-slate-600 text-sm">Format JSON pour APIs</p>
              </button>

              <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-left text-slate-400">
                <h4 className="text-slate-700 mb-1">Exports avances</h4>
                <p className="text-xs">Excel et filtres avances a brancher</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!canQuery && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          Les exports filtres sont reserves aux roles autorises.
        </div>
      )}
    </div>
  );
}
