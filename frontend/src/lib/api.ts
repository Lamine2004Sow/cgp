export type ApiOptions = {
  login?: string | null;
} & RequestInit;

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export const getStoredLogin = () => localStorage.getItem("auth_login");
export const setStoredLogin = (login: string) => localStorage.setItem("auth_login", login);
export const clearStoredLogin = () => localStorage.removeItem("auth_login");

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const login = options.login ?? getStoredLogin();
  if (login) {
    headers.set("x-user-login", login);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    throw new Error(
      "Serveur inaccessible. Vérifiez que le backend est démarré (ex. port 3001)."
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const rawMessage = errorBody?.message ?? errorBody?.error;
    const message = Array.isArray(rawMessage)
      ? rawMessage[0]
      : typeof rawMessage === "string"
        ? rawMessage
        : "Erreur API";
    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}
