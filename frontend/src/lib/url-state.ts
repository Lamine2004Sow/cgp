export type QueryValue = string | number | null | undefined;

export function readQueryParam(key: string): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return params.get(key) ?? "";
}

export function writeQueryParams(
  entries: Record<string, QueryValue>,
  options?: { replace?: boolean },
): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);

  Object.entries(entries).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  });

  const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
  if (options?.replace === false) {
    window.history.pushState(null, "", next);
    return;
  }
  window.history.replaceState(null, "", next);
}
