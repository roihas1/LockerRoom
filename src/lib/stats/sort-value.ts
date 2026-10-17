/** Numeric sort key for made/attempted splits; null or 0 attempts sort last when descending. */
export function splitSortValue(made: number | null, attempted: number | null): number {
  if (made === null || attempted === null || attempted <= 0) return Number.NEGATIVE_INFINITY;
  return made / attempted;
}

/** Descending compare for nullable numbers (nulls last). */
export function compareDesc(a: number | null | undefined, b: number | null | undefined): number {
  const av = a ?? Number.NEGATIVE_INFINITY;
  const bv = b ?? Number.NEGATIVE_INFINITY;
  return bv - av;
}
