import "server-only";
import { normalizeOpponentName } from "@/config/opponents";
import { createSessionClient } from "@/lib/supabase/server";
import { getLeagueTable, type StandingRow } from "@/lib/league/table";
import type { GameStatus } from "@/types/domain";

export type ScoutingPlayer = {
  playerId: number;
  name: string;
  number: string | null;
  position: string | null;
  games: number;
  ppg: number;
  rpg: number;
  apg: number;
};

export type LeagueResult = {
  playedAt: string;
  homeTeamId: number;
  awayTeamId: number;
  homePoints: number;
  awayPoints: number;
  homeName: string;
  awayName: string;
};

export type HeadToHeadGame = {
  id: number;
  tipoffAt: string;
  homeAway: string;
  teamScore: number | null;
  opponentScore: number | null;
  status: GameStatus;
};

export type OpponentScoutingNotes = {
  opponentName: string;
  notes: string | null;
  keyPlayers: { name: string; number?: string; position?: string; note?: string }[];
};

export type ScoutingBundle = {
  opponent: string;
  standing: StandingRow | null;
  recentResults: LeagueResult[];
  avgScored: number | null;
  avgAllowed: number | null;
  headToHead: HeadToHeadGame[];
  ibbaPlayers: ScoutingPlayer[];
  coachNotes: OpponentScoutingNotes | null;
  teamNames: Map<number, string>;
};

async function resolveIbbaTeamId(opponent: string): Promise<number | null> {
  const client = await createSessionClient();
  const norm = normalizeOpponentName(opponent);
  const { data } = await client.from("ibba_teams").select("id, name");
  if (!data?.length) return null;
  const hit = data.find((t) => normalizeOpponentName(t.name) === norm);
  return hit?.id ?? null;
}

export async function listSeasonOpponents(): Promise<string[]> {
  const client = await createSessionClient();
  const { data: season } = await client.from("seasons").select("id").eq("is_active", true).maybeSingle();
  if (!season) return [];
  const { data: games } = await client.from("games").select("opponent").eq("season_id", season.id).order("tipoff_at");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of games ?? []) {
    if (!seen.has(g.opponent)) {
      seen.add(g.opponent);
      out.push(g.opponent);
    }
  }
  return out;
}

export async function getScoutingBundle(opponent: string): Promise<ScoutingBundle> {
  const client = await createSessionClient();
  const teamId = await resolveIbbaTeamId(opponent);
  const table = await getLeagueTable();
  const standing =
    table?.rows.find((r) => normalizeOpponentName(r.name) === normalizeOpponentName(opponent)) ?? null;

  const { data: teams } = await client.from("ibba_teams").select("id, name");
  const teamNames = new Map((teams ?? []).map((t) => [t.id, t.name]));

  let recentResults: LeagueResult[] = [];
  let avgScored: number | null = null;
  let avgAllowed: number | null = null;
  let ibbaPlayers: ScoutingPlayer[] = [];

  if (teamId) {
    const { data: leagueGames } = await client
      .from("ibba_league_games")
      .select("played_at, home_team_id, away_team_id, home_points, away_points, played")
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .eq("played", true)
      .order("played_at", { ascending: false })
      .limit(5);

    recentResults = (leagueGames ?? []).map((g) => ({
      playedAt: g.played_at,
      homeTeamId: g.home_team_id,
      awayTeamId: g.away_team_id,
      homePoints: g.home_points,
      awayPoints: g.away_points,
      homeName: teamNames.get(g.home_team_id) ?? String(g.home_team_id),
      awayName: teamNames.get(g.away_team_id) ?? String(g.away_team_id),
    }));

    const playedAll = await client
      .from("ibba_league_games")
      .select("home_team_id, away_team_id, home_points, away_points")
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .eq("played", true);
    const rows = playedAll.data ?? [];
    if (rows.length) {
      let scored = 0;
      let allowed = 0;
      for (const r of rows) {
        if (r.home_team_id === teamId) {
          scored += r.home_points;
          allowed += r.away_points;
        } else {
          scored += r.away_points;
          allowed += r.home_points;
        }
      }
      avgScored = scored / rows.length;
      avgAllowed = allowed / rows.length;
    }

    const { data: players } = await client
      .from("ibba_players")
      .select("player_id, name, number, position, games, ppg, rpg, apg")
      .eq("team_id", teamId)
      .order("ppg", { ascending: false })
      .limit(8);
    ibbaPlayers = (players ?? []).map((p) => ({
      playerId: p.player_id,
      name: p.name,
      number: p.number,
      position: p.position,
      games: p.games,
      ppg: Number(p.ppg),
      rpg: Number(p.rpg),
      apg: Number(p.apg),
    }));
  }

  const norm = normalizeOpponentName(opponent);
  const { data: h2h } = await client
    .from("games")
    .select("id, tipoff_at, home_away, team_score, opponent_score, status, opponent")
    .eq("status", "final")
    .order("tipoff_at", { ascending: false })
    .limit(50);
  const headToHead = (h2h ?? [])
    .filter((g) => normalizeOpponentName(g.opponent) === norm)
    .slice(0, 6)
    .map((g) => ({
      id: g.id,
      tipoffAt: g.tipoff_at,
      homeAway: g.home_away,
      teamScore: g.team_score,
      opponentScore: g.opponent_score,
      status: g.status as GameStatus,
    }));

  const { data: notesRow } = await client
    .from("opponent_scouting")
    .select("opponent_name, notes, key_players")
    .eq("opponent_name", opponent)
    .maybeSingle();

  const coachNotes: OpponentScoutingNotes | null = notesRow
    ? {
        opponentName: notesRow.opponent_name,
        notes: notesRow.notes,
        keyPlayers: (notesRow.key_players as OpponentScoutingNotes["keyPlayers"]) ?? [],
      }
    : null;

  return {
    opponent,
    standing,
    recentResults,
    avgScored,
    avgAllowed,
    headToHead,
    ibbaPlayers,
    coachNotes,
    teamNames,
  };
}

export async function defaultScoutingOpponent(): Promise<string | null> {
  const client = await createSessionClient();
  const { data: season } = await client.from("seasons").select("id").eq("is_active", true).maybeSingle();
  if (!season) return null;
  const now = new Date().toISOString();
  const { data: next } = await client
    .from("games")
    .select("opponent")
    .eq("season_id", season.id)
    .gte("tipoff_at", now)
    .neq("status", "final")
    .order("tipoff_at")
    .limit(1)
    .maybeSingle();
  return next?.opponent ?? null;
}
