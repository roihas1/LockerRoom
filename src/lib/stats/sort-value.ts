export type SortDir = "asc" | "desc";

/** Numeric sort key for made/attempted splits; null when unsortable. */
export function splitSortValue(made: number | null, attempted: number | null): number | null {
  if (made === null || attempted === null || attempted <= 0) return null;
  return made / attempted;
}

/** Nullable number compare; nulls always sort last. */
export function compareNum(a: number | null | undefined, b: number | null | undefined, dir: SortDir = "desc"): number {
  const aNull = a == null || Number.isNaN(a);
  const bNull = b == null || Number.isNaN(b);
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return dir === "desc" ? b - a : a - b;
}

/** Descending compare for nullable numbers (nulls last). */
export function compareDesc(a: number | null | undefined, b: number | null | undefined): number {
  return compareNum(a, b, "desc");
}

export function compareText(a: string, b: string, dir: SortDir = "asc", locale = "he"): number {
  const c = a.localeCompare(b, locale);
  return dir === "desc" ? -c : c;
}

export function toggleSortDir(dir: SortDir): SortDir {
  return dir === "desc" ? "asc" : "desc";
}
