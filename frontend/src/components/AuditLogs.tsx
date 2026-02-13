import { useEffect, useState } from "react";
import { Download, Shield } from "lucide-react";
import { apiFetch } from "../lib/api";

interface AuditLogsProps {
  authLogin: string | null;
}

type AuditItem = {
  id_log: number;
  horodatage: string;
  type_action: string;
  cible_type: string;
  cible_id: string | null;
  auteur_login: string | null;
  auteur_nom: string | null;
  auteur_prenom: string | null;
};

export function AuditLogs({ authLogin }: AuditLogsProps) {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!authLogin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ items: AuditItem[] }>("/audit?page=1&pageSize=100", {
        login: authLogin,
      });
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [authLogin]);

  const handleExport = async () => {
    if (!authLogin) return;
    setError(null);
    try {
      const data = await apiFetch<{ csv: string }>("/audit/export", { login: authLogin });
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "audit.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur export");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 mb-2">Journal d'audit</h2>
          <p className="text-slate-600">Traçabilité des actions sensibles</p>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        {loading ? (
          <div className="p-6 text-slate-500">Chargement...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Date</th>
                <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Auteur</th>
                <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Action</th>
                <th className="px-4 py-3 text-left text-xs uppercase text-slate-500">Cible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item.id_log} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {new Date(item.horodatage).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {item.auteur_login || `${item.auteur_prenom || ""} ${item.auteur_nom || ""}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <span className="inline-flex items-center gap-1">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      {item.type_action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {item.cible_type}
                    {item.cible_id ? ` #${item.cible_id}` : ""}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={4}>
                    Aucun log disponible
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
