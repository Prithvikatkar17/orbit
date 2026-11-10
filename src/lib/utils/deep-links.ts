/**
 * Pure URL and Deep Link helper utilities for ORBIT.
 * Deterministic, browser-safe, and independent of React/Dexie.
 */

/**
 * Removes specified query parameter keys from a pathname and search parameters,
 * preserving all unrelated query parameters.
 *
 * @param pathname Current route pathname (e.g. "/tasks")
 * @param searchParams Current search parameters (URLSearchParams, string, or null/undefined)
 * @param keysToRemove Array of query parameter keys to remove
 * @returns Cleaned URL path with preserved query parameters (e.g. "/tasks" or "/tasks?filter=active")
 */
export function removeQueryParams(
  pathname: string,
  searchParams: URLSearchParams | string | null | undefined,
  keysToRemove: string[]
): string {
  if (!searchParams) return pathname;

  const params =
    typeof searchParams === "string"
      ? new URLSearchParams(searchParams)
      : new URLSearchParams(searchParams.toString());

  for (const key of keysToRemove) {
    params.delete(key);
  }

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

/**
 * Builds a deterministic canonical signature string for an extracted parameter map.
 * E.g. { eventId: "ev1", date: "2026-11-10" } -> "date=2026-11-10&eventId=ev1"
 */
export function buildDeepLinkSignature(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([, val]) => val !== undefined && val !== null && val.trim().length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v.trim())}`)
    .join("&");
}

/**
 * Validates whether an ID string is non-empty and non-whitespace.
 */
export function isValidRecordId(id: unknown): id is string {
  return typeof id === "string" && id.trim().length > 0;
}

/**
 * Validates a YYYY-MM-DD calendar date string.
 */
export function isValidDateString(date: unknown): date is string {
  if (typeof date !== "string") return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}
