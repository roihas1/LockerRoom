import { siteConfig } from "@/config/site";
import { fetchIbbaJson, IBBA_API } from "@/lib/league/ibba-fetch";

export interface StandingRow {
  teamId: number;
  name: string;
  pos: number;
  gp: number;
  w: number;
  l: number;
  pf: number;
  pa: number;
  diff: number;
  pts: number;
  isUs: boolean;
}

export interface LeagueTable {
  title: string;
  sourceUrl: string;
  rows: StandingRow[];
}

interface RawTable {
  title?: { rendered?: string };
  link?: string;
  data?: Record<string, Record<string, unknown>>;
}

const entities: Record<string, string> = { quot: '"', amp: "&", apos: "'", "#039": "'", lt: "<", gt: ">", nbsp: " " };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code: string) => (entities[`#${code}`] ?? String.fromCodePoint(Number(code))))
    .replace(/&([a-z]+);/gi, (m, name: string) => entities[name.toLowerCase()] ?? m);
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

export function parseLeagueTable(raw: RawTable, ourTeamId: number): LeagueTable {
  const rows: StandingRow[] = Object.entries(raw.data ?? {})
    // Key "0" holds the column labels, not a team.
    .filter(([id]) => id !== "0")
    // SportsPress keys: bf/ba/bd are season totals; pf/pa are per-game averages.
    .map(([id, r]) => ({
      teamId: Number(id),
      name: decodeEntities(String(r.name ?? "")),
      pos: num(r.pos),
      gp: num(r.gp),
      w: num(r.w),
      l: num(r.l),
      pf: num(r.bf),
      pa: num(r.ba),
      diff: num(r.bd),
      pts: num(r.pts),
      isUs: Number(id) === ourTeamId,
    }));

  rows.sort(
    (a, b) =>
      (a.pos || Infinity) - (b.pos || Infinity) ||
      b.pts - a.pts ||
      b.diff - a.diff ||
      a.name.localeCompare(b.name, "he"),
  );

  return {
    title: decodeEntities(raw.title?.rendered ?? ""),
    sourceUrl: raw.link ?? "https://ibasketball.co.il/",
    rows,
  };
}

export interface RankedRow extends StandingRow {
  rank: number;
}

/** Our row with one team on each side; at the top or bottom of the table both neighbors come from the same side. */
export function standingsAroundUs(rows: StandingRow[]): { rows: RankedRow[]; us: RankedRow; total: number } | null {
  const index = rows.findIndex((r) => r.isUs);
  if (index === -1) return null;
  const ranked = rows.map((r, i) => ({ ...r, rank: r.pos || i + 1 }));
  const start = Math.max(0, Math.min(index - 1, ranked.length - 3));
  return { rows: ranked.slice(start, start + 3), us: ranked[index]!, total: ranked.length };
}

/** Returns null when IBBA is unreachable so the page can render a fallback instead of failing. */
export async function getLeagueTable(): Promise<LeagueTable | null> {
  const { tableId, teamId } = siteConfig.league;
  const url = `${IBBA_API}/tables/${tableId}`;
  try {
    const raw = await fetchIbbaJson<RawTable>(url, { timeoutMs: 30_000, next: { revalidate: 1800 } });
    const table = parseLeagueTable(raw, teamId);
    return table.rows.length ? table : null;
  } catch (err) {
    console.error("[standings] getLeagueTable failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
