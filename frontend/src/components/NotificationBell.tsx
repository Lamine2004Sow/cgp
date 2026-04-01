import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { apiFetch } from "../lib/api";

interface NotificationBellProps {
  authLogin: string | null;
}

type ApiNotification = {
  id_notif: number;
  message: string;
  lu: boolean;
  date_envoi: string;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export function NotificationBell({ authLogin }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.lu).length;

  const load = async () => {
    if (!authLogin) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ items: ApiNotification[] }>("/notifications?pageSize=20", {
        login: authLogin,
      });
      setNotifications(data.items || []);
    } catch {
      // silencieux si pas disponible
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLogin) return;
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [authLogin]);

  // Fermer en cliquant ailleurs
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkRead = async (id: number) => {
    if (!authLogin) return;
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH", login: authLogin });
      setNotifications((prev) =>
        prev.map((n) => (n.id_notif === id ? { ...n, lu: true } : n)),
      );
    } catch {
      // silencieux
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.lu);
    for (const n of unread) {
      await handleMarkRead(n.id_notif);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:underline"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {loading && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">Chargement...</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                Aucune notification
              </div>
            )}
            {!loading &&
              notifications.map((notif) => (
                <div
                  key={notif.id_notif}
                  className={`px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors ${
                    notif.lu ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 leading-snug">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(notif.date_envoi)}</p>
                  </div>
                  {!notif.lu && (
                    <button
                      onClick={() => handleMarkRead(notif.id_notif)}
                      className="shrink-0 mt-0.5 w-2 h-2 rounded-full bg-indigo-500 hover:bg-indigo-700 transition-colors"
                      title="Marquer comme lu"
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
