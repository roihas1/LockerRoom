import { decodeHtml, type IbbaEvent } from "./ibba-diff.ts";

const API = "https://ibasketball.co.il/wp-json/sportspress/v2";

const IBBA_HEADERS: Record<string, string> = {
  Accept: "application/json",
  Referer: "https://ibasketball.co.il/",
  Origin: "https://ibasketball.co.il",
  "User-Agent":
    "Mozilla/5.0 (compatible; LockerRoom/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

let proxySiteUrl: string | null = null;
let proxySecret: string | null = null;

/** When set, IBBA 403 from Edge is retried via the Next.js /api/ibba/fetch proxy. */
export function setIbbaFetchContext(siteUrl: string | null, pushSecret: string | null): void {
  proxySiteUrl = siteUrl?.replace(/\/$/, "") || null;
  proxySecret = pushSecret;
}

export const IBBA = {
  teamId: 1498342,
  seasonId: 119888,
  leagueId: 119906,
  tableId: 1501342,
} as const;

async function fetchViaSiteProxy<T>(url: string, timeoutMs: number): Promise<T> {
  if (!proxySiteUrl || !proxySecret) throw new Error(`IBBA blocked and site proxy not configured`);
  const res = await fetch(`${proxySiteUrl}/api/ibba/fetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-push-secret": proxySecret },
    body: JSON.stringify({ url, timeoutMs }),
    signal: AbortSignal.timeout(timeoutMs + 15_000),
  });
  const payload = (await res.json().catch(() => null)) as { ok?: boolean; data?: T; error?: string } | null;
  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.error ?? `IBBA proxy ${res.status}`);
  }
  return payload.data as T;
}

export async function fetchJson<T>(url: string, timeoutMs = 120_000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: IBBA_HEADERS, signal: ctrl.signal });
    if (res.ok) return (await res.json()) as T;
    if (res.status === 403 && proxySiteUrl) {
      clearTimeout(t);
      return await fetchViaSiteProxy<T>(url, timeoutMs);
    }
    throw new Error(`IBBA ${res.status}: ${url}`);
  } finally {
    clearTimeout(t);
  }
}

type RawEvent = {
  id: number;
  date: string;
  status: string;
  teams: number[];
  venues: number[];
  results: Record<string, { points?: number }>;
  title?: { rendered?: string };
};

type RawVenue = { id: number; name?: string; title?: { rendered?: string } };

type RawTable = { data?: Record<string, { name?: string }> };

type RawList = { id: number; seasons?: number[]; data?: Record<string, Record<string, unknown>> | unknown[] };

export async function fetchTeamEvents(): Promise<IbbaEvent[]> {
  const url = `${API}/events?teams=${IBBA.teamId}&seasons=${IBBA.seasonId}&per_page=100`;
  const rows = await fetchJson<RawEvent[]>(url);
  const venueCache = new Map<number, string>();
  const teamNames = await fetchLeagueTeamNames();
  const out: IbbaEvent[] = [];
  for (const r of rows) {
    if (!r.teams?.length || r.teams.length < 2) continue;
    const vid = r.venues?.[0];
    let venueName: string | null = null;
    if (vid) {
      if (!venueCache.has(vid)) {
        const v = await fetchJson<RawVenue>(`${API}/venues/${vid}`, 60_000).catch(() => null);
        const n = v?.name ?? v?.title?.rendered ?? null;
        venueCache.set(vid, n ? decodeHtml(n) : "");
      }
      venueName = venueCache.get(vid) || null;
    }
    const [homeId, awayId] = r.teams as [number, number];
    const hp = Number(r.results?.[String(homeId)]?.points ?? 0);
    const ap = Number(r.results?.[String(awayId)]?.points ?? 0);
    out.push({
      id: r.id,
      date: r.date,
      status: r.status,
      teams: [homeId, awayId],
      venues: r.venues ?? [],
      venueName,
      teamNames,
      homePoints: hp,
      awayPoints: ap,
    });
  }
  return out;
}

export async function fetchLeagueTeamNames(): Promise<Record<number, string>> {
  const table = await fetchJson<RawTable>(`${API}/tables/${IBBA.tableId}`, 90_000);
  const names: Record<number, string> = {};
  for (const [id, row] of Object.entries(table.data ?? {})) {
    if (id === "0" || !row?.name) continue;
    names[Number(id)] = decodeHtml(String(row.name));
  }
  return names;
}

export async function fetchLeagueEvents(): Promise<IbbaEvent[]> {
  const url = `${API}/events?seasons=${IBBA.seasonId}&leagues=${IBBA.leagueId}&per_page=100`;
  const rows = await fetchJson<RawEvent[]>(url);
  const teamNames = await fetchLeagueTeamNames();
  return rows
    .filter((r) => r.teams?.length >= 2)
    .map((r) => {
      const [homeId, awayId] = r.teams as [number, number];
      return {
        id: r.id,
        date: r.date,
        status: r.status,
        teams: [homeId, awayId],
        venues: r.venues ?? [],
        venueName: null,
        teamNames,
        homePoints: Number(r.results?.[String(homeId)]?.points ?? 0),
        awayPoints: Number(r.results?.[String(awayId)]?.points ?? 0),
      };
    });
}

export async function fetchTeamLists(teamId: number): Promise<RawList[]> {
  const team = await fetchJson<{ lists?: number[] }>(`${API}/teams/${teamId}`, 60_000);
  const ids = (team.lists ?? []).slice(0, 8);
  const lists: RawList[] = [];
  for (const id of ids) {
    const list = await fetchJson<RawList>(`${API}/lists/${id}`, 60_000).catch(() => null);
    if (list) lists.push(list);
  }
  return lists;
}

export function parseListPlayers(list: RawList, teamId: number): Array<{
  playerId: number;
  teamId: number;
  name: string;
  number: string | null;
  position: string | null;
  games: number;
  ppg: number;
  rpg: number;
  apg: number;
  threes_made: number;
  ft_pct: number | null;
}> {
  if (!list.seasons?.includes(IBBA.seasonId)) return [];
  const data = list.data;
  if (!data || Array.isArray(data)) return [];
  const rows: ReturnType<typeof parseListPlayers> = [];
  for (const [pid, raw] of Object.entries(data)) {
    if (pid === "0" || typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const name = String(r.name ?? "").trim();
    if (!name) continue;
    rows.push({
      playerId: Number(pid),
      teamId,
      name: decodeHtml(name),
      number: r.number != null ? String(r.number) : null,
      position: r.position != null ? String(r.position) : null,
      games: num(r.g),
      ppg: num(r.ptspg),
      rpg: num(r.rebpg),
      apg: num(r.astpg),
      threes_made: num(r.threepm),
      ft_pct: r.ftpercent != null ? num(r.ftpercent) : null,
    });
  }
  return rows;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}
