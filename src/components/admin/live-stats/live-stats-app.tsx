"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { finishLiveGameAction, startLiveGameAction } from "@/app/admin/games/live-actions";
import { gameStatusLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { LiveStatsOpponent } from "@/components/admin/live-stats/live-stats-opponent";
import { LiveStatsPlayerPanel } from "@/components/admin/live-stats/live-stats-player-panel";
import { LiveStatsRoster } from "@/components/admin/live-stats/live-stats-roster";
import { LiveStatsStickyScores } from "@/components/admin/live-stats/live-stats-sticky-scores";
import { useLiveStatsAutosave } from "@/components/admin/live-stats/use-live-stats-autosave";
import { Button } from "@/components/ui/button";
import { sumPlayedPoints } from "@/lib/live-stats/form-data";
import { clientStateFromSnapshot } from "@/lib/live-stats/initial-state";
import type { LiveGameSnapshot } from "@/lib/live-stats/types";
import type { Game, Player } from "@/types/domain";

export function LiveStatsApp({
  game,
  players,
  initialSnapshot,
  demo,
}: {
  game: Game;
  players: Player[];
  initialSnapshot: LiveGameSnapshot;
  demo: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(game.status);
  const isLive = status === "live";
  const isFinal = status === "final";
  const readOnly = isFinal;
  const autosaveEnabled = isLive && !readOnly;

  const {
    state,
    setState,
    initState,
    undoLast,
    canUndo,
    saveStatus,
    saveStatusLabel,
  } = useLiveStatsAutosave({
    gameId: game.id,
    demo,
    autosaveEnabled,
  });

  const [startPending, startTransition] = useTransition();
  const [finishPending, finishTransition] = useTransition();

  useEffect(() => {
    initState(clientStateFromSnapshot(initialSnapshot));
    // Re-init when navigating to another game or after server refresh.
  }, [game.id, initialSnapshot, initState]);

  const pointsSum = sumPlayedPoints(state);
  const sumWarning =
    isLive && pointsSum !== state.teamScore ? he.admin.liveStats.sumMismatch(pointsSum, state.teamScore) : null;

  const onStart = () => {
    if (demo) {
      toast.error(he.admin.liveStats.demoBlocked);
      return;
    }
    if (state.playedPlayerIds.length === 0) {
      toast.error(he.admin.statsEntry.whoPlayedHint);
      return;
    }
    startTransition(async () => {
      const result = await startLiveGameAction(game.id, state.playedPlayerIds);
      if (result.ok) {
        toast.success(result.message);
        setStatus("live");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const onFinish = () => {
    if (demo) {
      toast.error(he.admin.liveStats.demoBlocked);
      return;
    }
    finishTransition(async () => {
      const result = await finishLiveGameAction(game.id);
      if (result.ok) {
        toast.success(result.message);
        if (result.redirectTo) router.push(result.redirectTo);
        else router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const scoringDisabled = demo || readOnly || !isLive;

  return (
    <div className="space-y-6 pb-24">
      <Link href={`/admin/games/${game.id}?step=details`} className="text-sm text-muted hover:text-text">
        {he.actions.back}
      </Link>

      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">{he.admin.liveStats.title}</h1>
        <p className="text-sm text-muted" data-user-content>
          {he.result.vs} {game.opponent} · {gameStatusLabels[status]}
        </p>
      </header>

      {demo ? <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm">{he.admin.liveStats.demoBlocked}</p> : null}

      <LiveStatsStickyScores teamScore={state.teamScore} opponentScore={state.opponentScore} opponentName={game.opponent} />

      {!isLive && !isFinal ? (
        <>
          <LiveStatsRoster
            players={players}
            state={state}
            disabled={startPending}
            onChange={(next) => setState(next, { skipSave: true })}
          />
          <Button type="button" size="lg" className="w-full sm:w-auto" disabled={demo || startPending} onClick={onStart}>
            {he.admin.liveStats.startGame}
          </Button>
        </>
      ) : null}

      {isLive || isFinal ? (
        <>
          {isLive ? (
            <LiveStatsRoster players={players} state={state} disabled={scoringDisabled} onChange={(next) => setState(next)} />
          ) : null}

          <LiveStatsPlayerPanel players={players} state={state} disabled={scoringDisabled} onChange={(next) => setState(next)} />

          <LiveStatsOpponent state={state} disabled={scoringDisabled} onChange={(next) => setState(next)} />

          {sumWarning ? <p className="text-sm text-warning">{sumWarning}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={!canUndo || scoringDisabled} onClick={undoLast}>
              {he.admin.liveStats.undoLast}
            </Button>
            {isLive ? (
              <Button type="button" variant="danger" disabled={demo || finishPending} onClick={onFinish}>
                {he.admin.liveStats.finishGame}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-2 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          <span className="num text-sm font-semibold">
            {state.teamScore}:{state.opponentScore}
          </span>
          <span
            className="text-sm text-muted"
            aria-live="polite"
            data-save-status={saveStatus}
          >
            {demo ? he.admin.liveStats.demoBlocked : (saveStatusLabel ?? "\u00a0")}
          </span>
        </div>
      </footer>
    </div>
  );
}
