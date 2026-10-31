"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/common/empty-state";
import { ScoreBoard } from "@/components/common/scoreboard";
import { SectionHeader } from "@/components/common/section-header";
import { he } from "@/config/strings";
import type { Game, GameEvent, Player, StatLine, Team } from "@/types/domain";
import { BoxScoreTable } from "./box-score-table";
import { LiveGameSubscriber } from "./live-game-subscriber";
import { PlayByPlay } from "./play-by-play";
import { TeamTotals } from "./team-totals";

export type LiveGamePayload = {
  game: Game;
  lines: StatLine[];
  events: GameEvent[];
  players: Player[];
};

/**
 * Client island for in-progress games: owns score / box / PBP state and pulls a slim JSON
 * update on Realtime signals instead of remounting the full RSC page.
 *
 * Header chrome (kind / date / actions) is passed as React nodes from the server — not as a
 * render function, which cannot cross the RSC → client boundary.
 */
export function LiveGamePanel({
  gameId,
  team,
  initial,
  kindLabel,
  metaRow,
  actionRow,
  afterPlayByPlay,
}: {
  gameId: number;
  team: Team;
  initial: LiveGamePayload;
  kindLabel: ReactNode;
  metaRow: ReactNode;
  actionRow: ReactNode;
  /** e.g. player-of-the-game card between PBP and box score */
  afterPlayByPlay?: ReactNode;
}) {
  const router = useRouter();
  const [game, setGame] = useState(initial.game);
  const [lines, setLines] = useState(initial.lines);
  const [events, setEvents] = useState(initial.events);
  const [players, setPlayers] = useState(initial.players);

  const onRefresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}/live`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as LiveGamePayload;
      // Final whistle: remount once so photos / roast / final layout appear.
      if (data.game.status === "final") {
        router.refresh();
        return;
      }
      setGame(data.game);
      setLines(data.lines);
      setEvents(data.events);
      setPlayers(data.players);
    } catch {
      // Keep last good snapshot; poll / next Realtime event will retry.
    }
  }, [gameId, router]);

  return (
    <>
      <header className="card court-bg overflow-hidden p-5 md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          {kindLabel}
          <LiveGameSubscriber gameId={gameId} onRefresh={onRefresh} />
        </div>
        <ScoreBoard game={game} team={team} size="lg" />
        {metaRow}
        {actionRow}
      </header>
      <section>
        <SectionHeader title={he.live.playByPlay} icon={<span aria-hidden>🔴</span>} />
        <PlayByPlay events={events} players={players} />
      </section>
      {afterPlayByPlay}
      <section>
        <SectionHeader title={he.games.boxScore} />
        {lines.length ? (
          <BoxScoreTable lines={lines} players={players} potgId={game.playerOfGameId} events={events} />
        ) : (
          <EmptyState emoji="📋" title={he.empty.boxScore.title} text={he.empty.boxScore.text} />
        )}
      </section>
      {lines.length ? (
        <section>
          <SectionHeader title={he.games.teamTotals} />
          <TeamTotals lines={lines} />
        </section>
      ) : null}
    </>
  );
}
