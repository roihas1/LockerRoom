/** Pure IBBA diff/match logic (no Deno APIs). Used by the edge function and Vitest. */

export const OUR_TEAM_ID = 1498342;
export const TIME_ZONE = "Asia/Jerusalem";

export type ChangeKind = "time" | "venue" | "homeAway" | "opponent" | "score";

export interface IbbaChange {
  kind: ChangeKind;
  before: string;
  after: string;
}

export interface IbbaSnapshot {
  dateIso: string;
  venueId: number | null;
  venueName: string | null;
  homeTeamId: number;
  awayTeamId: number;
  opponentName: string;
  homePoints: number;
  awayPoints: number;
}

export interface LocalGame {
  id: number;
  opponent: string;
  tipoffAt: string;
  location: string | null;
  homeAway: "home" | "away" | "neutral";
  status: string;
  teamScore: number | null;
  opponentScore: number | null;
  ibbaEventId: number | null;
  ibbaSnapshot: IbbaSnapshot | null;
}

export interface IbbaEvent {
  id: number;
  date: string;
  status: string;
  teams: [number, number];
  venues: number[];
  venueName?: string | null;
  teamNames: Record<number, string>;
  homePoints: number;
  awayPoints: number;
}

export function normalizeOpponent(name: string): string {
  return name.replace(/["'״׳]/g, "").replace(/\s+/g, " ").trim();
}

export function localDateKey(iso: string, timeZone: string = TIME_ZONE): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function opponentFromEvent(event: IbbaEvent, ourTeamId: number = OUR_TEAM_ID): string {
  const [a, b] = event.teams;
  const other = a === ourTeamId ? b : b === ourTeamId ? a : b;
  return decodeHtml(event.teamNames[other] ?? String(other));
}

export function homeAwayFromEvent(event: IbbaEvent, ourTeamId: number = OUR_TEAM_ID): "home" | "away" {
  const [homeId] = event.teams;
  return homeId === ourTeamId ? "home" : "away";
}

export function decodeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "–");
}

export function snapshotFromEvent(event: IbbaEvent, ourTeamId: number = OUR_TEAM_ID): IbbaSnapshot {
  const [homeId, awayId] = event.teams;
  const homePts = event.homePoints;
  const awayPts = event.awayPoints;
  return {
    dateIso: event.date,
    venueId: event.venues[0] ?? null,
    venueName: event.venueName ?? null,
    homeTeamId: homeId,
    awayTeamId: awayId,
    opponentName: opponentFromEvent(event, ourTeamId),
    homePoints: homePts,
    awayPoints: awayPts,
  };
}

/** Match local games to IBBA events by opponent + date; date-only fallback when one game that day. */
export function matchEvents(
  games: LocalGame[],
  events: IbbaEvent[],
  ourTeamId: number = OUR_TEAM_ID,
): Map<number, IbbaEvent> {
  const byDate = new Map<string, IbbaEvent[]>();
  for (const e of events) {
    const key = localDateKey(e.date);
    const list = byDate.get(key) ?? [];
    list.push(e);
    byDate.set(key, list);
  }

  const out = new Map<number, IbbaEvent>();
  for (const g of games) {
    const dateKey = localDateKey(g.tipoffAt);
    const candidates = byDate.get(dateKey) ?? [];
    if (!candidates.length) continue;

    const normOpp = normalizeOpponent(g.opponent);
    let match = candidates.find((e) => normalizeOpponent(opponentFromEvent(e, ourTeamId)) === normOpp);
    if (!match && candidates.length === 1) match = candidates[0];
    if (match) out.set(g.id, match);
  }
  return out;
}

export function diffEvent(snapshot: IbbaSnapshot | null, event: IbbaEvent, ourTeamId: number = OUR_TEAM_ID): IbbaChange[] {
  if (!snapshot) return [];
  const next = snapshotFromEvent(event, ourTeamId);
  const changes: IbbaChange[] = [];

  if (snapshot.dateIso !== next.dateIso) {
    changes.push({ kind: "time", before: snapshot.dateIso, after: next.dateIso });
  }
  const snapVenue = snapshot.venueName ?? (snapshot.venueId != null ? String(snapshot.venueId) : "");
  const nextVenue = next.venueName ?? (next.venueId != null ? String(next.venueId) : "");
  if (snapVenue !== nextVenue) {
    changes.push({ kind: "venue", before: snapVenue, after: nextVenue });
  }
  if (normalizeOpponent(snapshot.opponentName) !== normalizeOpponent(next.opponentName)) {
    changes.push({ kind: "opponent", before: snapshot.opponentName, after: next.opponentName });
  }

  const weHome = snapshot.homeTeamId === ourTeamId;
  const wasHome = weHome;
  const nowHome = next.homeTeamId === ourTeamId;
  if (wasHome !== nowHome) {
    changes.push({ kind: "homeAway", before: wasHome ? "home" : "away", after: nowHome ? "home" : "away" });
  }

  const ourPtsBefore = weHome ? snapshot.homePoints : snapshot.awayPoints;
  const oppPtsBefore = weHome ? snapshot.awayPoints : snapshot.homePoints;
  const ourPtsAfter = nowHome ? next.homePoints : next.awayPoints;
  const oppPtsAfter = nowHome ? next.awayPoints : next.homePoints;
  if (ourPtsBefore !== ourPtsAfter || oppPtsBefore !== oppPtsAfter) {
    changes.push({
      kind: "score",
      before: `${ourPtsBefore}:${oppPtsBefore}`,
      after: `${ourPtsAfter}:${oppPtsAfter}`,
    });
  }

  return changes;
}

export interface ApplyResult {
  tipoffAt?: string;
  location?: string | null;
  homeAway?: "home" | "away" | "neutral";
  opponent?: string;
  teamScore?: number | null;
  opponentScore?: number | null;
  status?: string;
  fillScoreOnly: boolean;
}

/** Apply IBBA deltas to local game fields; preserves intentional tipoff offset via delta on IBBA times. */
export function applyChanges(
  game: LocalGame,
  changes: IbbaChange[],
  event: IbbaEvent,
  ourTeamId: number = OUR_TEAM_ID,
): ApplyResult {
  const result: ApplyResult = { fillScoreOnly: false };
  if (!changes.length) return result;

  const snapshot = game.ibbaSnapshot ?? snapshotFromEvent(event, ourTeamId);
  const next = snapshotFromEvent(event, ourTeamId);

  for (const c of changes) {
    if (c.kind === "time") {
      const oldMs = new Date(snapshot.dateIso).getTime();
      const newMs = new Date(next.dateIso).getTime();
      const delta = newMs - oldMs;
      result.tipoffAt = new Date(new Date(game.tipoffAt).getTime() + delta).toISOString();
    }
    if (c.kind === "venue" && next.venueName) {
      result.location = next.venueName;
    }
    if (c.kind === "homeAway") {
      result.homeAway = homeAwayFromEvent(event, ourTeamId);
    }
    if (c.kind === "opponent") {
      result.opponent = next.opponentName;
    }
    if (c.kind === "score") {
      const home = next.homeTeamId === ourTeamId;
      const ourPts = home ? next.homePoints : next.awayPoints;
      const oppPts = home ? next.awayPoints : next.homePoints;
      const played = ourPts > 0 || oppPts > 0 || event.status === "publish";
      if (game.teamScore == null && game.opponentScore == null && played && (ourPts > 0 || oppPts > 0)) {
        result.teamScore = ourPts;
        result.opponentScore = oppPts;
        result.status = "final";
        result.fillScoreOnly = true;
      }
    }
  }
  return result;
}

export function formatLocalTime(iso: string, timeZone: string = TIME_ZONE): string {
  return new Intl.DateTimeFormat("he-IL", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );
}

export function pushBodyForChanges(opponent: string, changes: IbbaChange[]): string {
  const parts = changes.map((c) => {
    if (c.kind === "time") return `שעה ${formatLocalTime(c.before)} ← ${formatLocalTime(c.after)}`;
    if (c.kind === "venue") return `מיקום: ${c.after}`;
    if (c.kind === "opponent") return `יריב: ${c.after}`;
    if (c.kind === "homeAway") return c.after === "home" ? "משחק בית" : "משחק חוץ";
    if (c.kind === "score") return `תוצאה ${c.after}`;
    return "";
  });
  return `שינוי במשחק מול ${opponent}: ${parts.filter(Boolean).join(" · ")}`;
}
