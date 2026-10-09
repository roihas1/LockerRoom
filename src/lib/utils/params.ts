/** Parses a positive integer route id; returns null for anything else so pages can 404. */
export function parseId(raw: string | string[] | undefined): number | null {
  if (typeof raw !== "string" || !/^\d{1,12}$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
}

export function firstParam(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}
