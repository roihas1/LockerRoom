import type { GameStatus } from "@/types/domain";

export type LiveStatField = "points" | "rebounds" | "assists" | "turnovers" | "steals";

export type LivePlayerTotals = {
  playerId: number;
  points: number;
  rebounds: number;
  assists: number;
  turnovers: number;
  steals: number;
};

/** Read model for loading the live scoring screen (fixture or Supabase). */
export type LiveGameSnapshot = {
  gameId: number;
  status: GameStatus;
  teamScore: number | null;
  opponentScore: number | null;
  /** Totals keyed by player id. */
  lines: Record<number, LivePlayerTotals>;
};

/** Full snapshot sent to the server on auto-save (Phase 2). */
export type ApplyLiveStatsInput = {
  gameId: number;
  playedPlayerIds: number[];
  lines: LivePlayerTotals[];
  teamScore: number;
  opponentScore: number;
};

/** Alias: client queue items are full snapshots, not deltas. */
export type LivePatch = ApplyLiveStatsInput;

export type LiveSaveStatus = "idle" | "saving" | "saved" | "error" | "offline";
