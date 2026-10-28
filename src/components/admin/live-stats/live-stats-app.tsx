"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { finishLiveGameAction, startLiveGameAction } from "@/app/admin/games/live-actions";
import { gameStatusLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { BackLink } from "@/components/common/back-link";
import { LiveStatsOpponent } from "@/components/admin/live-stats/live-stats-opponent";
import { LiveStatsPlayerGrid } from "@/components/admin/live-stats/live-stats-player-grid";
import { LiveStatsPlayerPanel } from "@/components/admin/live-stats/live-stats-player-panel";
import { LiveStatsRoster } from "@/components/admin/live-stats/live-stats-roster";
import { LiveStatsStickyScores } from "@/components/admin/live-stats/live-stats-sticky-scores";
import { useLiveStatsAutosave } from "@/components/admin/live-stats/use-live-stats-autosave";
import { Button } from "@/components/ui/button";
import { sumPlayedPoints } from "@/lib/live-stats/form-data";
import { clientStateFromSnapshot } from "@/lib/live-stats/initial-state";
import type { LiveGameSnapshot } from "@/lib/live-stats/types";
import { haptic } from "@/lib/utils/haptics";
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
    flushSave,
    pendingSave,
  } = useLiveStatsAutosave({
    gameId: game.id,
    demo,
    autosaveEnabled,
  });

  const [startPending, startTransition] = useTransition();
  const [finishPending, finishTransition] = useTransition();

  const initedGameRef = useRef<number | null>(null);
  useEffect(() => {
    // Load server state once per game. Every autosave calls revalidatePath, which hands this component a
    // fresh snapshot prop each time; re-initialising on those would reset undo history, the "saved" status
    // and any taps made since the save started. The local state is the source of truth while scoring.
    if (initedGameRef.current === game.id) return;
    initedGameRef.current = game.id;
    initState(clientStateFromSnapshot(initialSnapshot));
  }, [game.id, initialSnapshot, initState]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const playedPlayers = players.filter((p) => state.playedPlayerIds.includes(p.id));
  const selectedPlayer = playedPlayers.find((p) => p.id === selectedId) ?? playedPlayers[0] ?? null;

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
      // Make sure the last taps are on the server before the game is finalized.
      if (pendingSave.current) await flushSave();
      if (pendingSave.current) {
        toast.error(he.admin.liveStats.error);
        return;
      }
      const result = await finishLiveGameAction(game.id);
      if (result.ok) {
        setStatus("final");
        toast.success(result.message);
        if (result.redirectTo) router.push(result.redirectTo);
        else router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const scoringDisabled = demo || readOnly || !isLive;

  const recordChange = (next: typeof state) => {
    haptic();
    setState(next);
  };

  return (
    <div className="space-y-6 pb-24">
      <BackLink href={`/admin/games/${game.id}?step=details`} label={`${he.result.vs} ${game.opponent}`} userContent />

      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">{he.admin.liveStats.title}</h1>
        <p className="text-sm text-muted" data-user-content>
          {he.result.vs} {game.opponent} · {gameStatusLabels[status]}
        </p>
      </header>

      {demo ? <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm">{he.admin.liveStats.demoBlocked}</p> : null}

      <LiveStatsStickyScores
        teamScore={state.teamScore}
        opponentScore={state.opponentScore}
        opponentName={game.opponent}
        disabled={scoringDisabled}
        onTeamScore={(teamScore) => setState({ ...state, teamScore })}
        onOpponentScore={(opponentScore) => setState({ ...state, opponentScore })}
      />

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
          <LiveStatsPlayerGrid players={players} state={state} selectedId={selectedPlayer?.id ?? null} onSelect={setSelectedId} />

          <LiveStatsPlayerPanel player={selectedPlayer} state={state} disabled={scoringDisabled} onChange={recordChange} />

          <LiveStatsOpponent state={state} disabled={scoringDisabled} onChange={recordChange} />

          {sumWarning ? <p className="text-sm text-warning">{sumWarning}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!canUndo || scoringDisabled}
              onClick={() => {
                haptic([15, 30, 15]);
                undoLast();
              }}
            >
              {he.admin.liveStats.undoLast}
            </Button>
            {isLive ? (
              <Button type="button" variant="danger" disabled={demo || finishPending} onClick={onFinish}>
                {he.admin.liveStats.finishGame}
              </Button>
            ) : null}
          </div>

          {isLive ? (
            <details className="group rounded-(--radius-card) border border-border bg-surface-2">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold">
                {he.admin.liveStats.manageRoster} ({state.playedPlayerIds.length})
              </summary>
              <div className="border-t border-border p-4">
                <LiveStatsRoster
                  players={players}
                  state={state}
                  disabled={scoringDisabled}
                  onChange={(next) => setState(next)}
                  allowClearAll={false}
                />
              </div>
            </details>
          ) : null}
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
