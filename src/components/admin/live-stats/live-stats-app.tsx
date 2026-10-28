"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { finishLiveGameAction, reopenLiveGameAction, startLiveGameAction } from "@/app/admin/games/live-actions";
import { gameStatusLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { LiveStatsOpponent } from "@/components/admin/live-stats/live-stats-opponent";
import { LiveStatsPlayByPlay } from "@/components/admin/live-stats/live-stats-play-by-play";
import { LiveStatsPlayerGrid } from "@/components/admin/live-stats/live-stats-player-grid";
import { LiveStatsPlayerPanel } from "@/components/admin/live-stats/live-stats-player-panel";
import { LiveStatsRoster } from "@/components/admin/live-stats/live-stats-roster";
import { LiveStatsSaveIndicator } from "@/components/admin/live-stats/live-stats-save-indicator";
import { LiveStatsStickyScores } from "@/components/admin/live-stats/live-stats-sticky-scores";
import { useLiveStatsAutosave } from "@/components/admin/live-stats/use-live-stats-autosave";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { emptyLiveLine, sumPlayedPoints } from "@/lib/live-stats/form-data";
import { clientStateFromSnapshot } from "@/lib/live-stats/initial-state";
import type { LiveGameSnapshot } from "@/lib/live-stats/types";
import { haptic } from "@/lib/utils/haptics";
import type { Game, Player } from "@/types/domain";

export function LiveStatsApp({
  game,
  players,
  initialSnapshot,
  teamName,
  suggestedPlayerIds,
  notice,
  demo,
}: {
  game: Game;
  players: Player[];
  initialSnapshot: LiveGameSnapshot;
  teamName: string;
  /** Page-level banner (e.g. "hidden from fans"), shown right under the scoreboard so the scoreboard stays on top. */
  notice?: ReactNode;
  /** Who most likely plays (last game's roster); only used to pre-fill the lineup before the game starts. */
  suggestedPlayerIds: number[];
  demo: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(game.status);
  const isLive = status === "live";
  const isFinal = status === "final";
  const preGame = !isLive && !isFinal;
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
  const [reopenPending, reopenTransition] = useTransition();
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [confirmReopenOpen, setConfirmReopenOpen] = useState(false);

  // A game that has no saved lines yet starts from the suggested lineup, so kicking off is one tap, not twelve.
  const prefillLineup = game.status !== "live" && game.status !== "final" && Object.keys(initialSnapshot.lines).length === 0 && suggestedPlayerIds.length > 0;

  const initedGameRef = useRef<number | null>(null);
  useEffect(() => {
    // Load server state once per game. Autosave no longer re-renders this page, but a router refresh (after
    // start or reopen) still hands this component a fresh snapshot prop; re-initialising on those would reset
    // undo history, the "saved" status and any taps made since. The local state is the source of truth while scoring.
    if (initedGameRef.current === game.id) return;
    initedGameRef.current = game.id;
    const loaded = clientStateFromSnapshot(initialSnapshot);
    initState(
      prefillLineup
        ? {
            ...loaded,
            playedPlayerIds: [...suggestedPlayerIds],
            lines: Object.fromEntries(suggestedPlayerIds.map((id) => [id, emptyLiveLine(id)])),
          }
        : loaded,
    );
  }, [game.id, initialSnapshot, initState, prefillLineup, suggestedPlayerIds]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const playedPlayers = players.filter((p) => state.playedPlayerIds.includes(p.id));
  const selectedPlayer = playedPlayers.find((p) => p.id === selectedId) ?? playedPlayers[0] ?? null;

  const pointsSum = sumPlayedPoints(state);
  const sumWarning =
    isLive && pointsSum !== state.teamScore ? he.admin.liveStats.sumMismatch(pointsSum, state.teamScore) : null;
  const tied = state.teamScore === state.opponentScore;

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
        // This screen is out of date (the game already started or ended elsewhere). Its local roster and totals
        // must not be autosaved over the real ones, so reload from the server instead of carrying on.
        if (result.code === "not_startable") window.setTimeout(() => window.location.reload(), 1500);
      }
    });
  };

  const runFinish = () => {
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

  const onFinish = () => {
    if (demo) {
      toast.error(he.admin.liveStats.demoBlocked);
      return;
    }
    // Always confirm with the final score in front of the scorer: finishing triggers the roast, milestones and push.
    setConfirmFinishOpen(true);
  };

  const onReopen = () => {
    if (demo) {
      toast.error(he.admin.liveStats.demoBlocked);
      return;
    }
    reopenTransition(async () => {
      const result = await reopenLiveGameAction(game.id);
      if (result.ok) {
        toast.success(result.message);
        setStatus("live");
        router.refresh();
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
    <div className="space-y-3">
      {/* The title stays for screen readers; sighted users get the opponent and status in the scoreboard bar. */}
      <h1 className="sr-only">
        {he.admin.liveStats.title} · {he.result.vs} {game.opponent} · {gameStatusLabels[status]}
      </h1>

      <LiveStatsStickyScores
        teamScore={state.teamScore}
        opponentScore={state.opponentScore}
        teamName={teamName || he.admin.liveStats.teamFallback}
        opponentName={game.opponent}
        status={status}
        backHref={`/admin/games/${game.id}?step=details`}
        backLabel={`${he.result.vs} ${game.opponent}`}
        disabled={scoringDisabled}
        onTeamScore={(teamScore) => setState({ ...state, teamScore })}
        onOpponentScore={(opponentScore) => setState({ ...state, opponentScore })}
      />

      {notice}

      {demo ? <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm">{he.admin.liveStats.demoBlocked}</p> : null}

      {isFinal ? (
        <section className="space-y-3 rounded-(--radius-card) border border-border bg-surface-2 p-4">
          <div>
            <h2 className="font-display text-lg font-bold">{he.admin.liveStats.finalCardTitle}</h2>
            <p className="text-sm text-muted">{he.admin.liveStats.finalCardBody}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/admin/games/${game.id}?step=highlights`}>{he.admin.liveStats.goToSummary}</Link>
            </Button>
            <Button type="button" variant="outline" disabled={demo || reopenPending} onClick={() => setConfirmReopenOpen(true)}>
              {he.admin.liveStats.reopenGame}
            </Button>
          </div>
        </section>
      ) : null}

      {preGame ? (
        <>
          {prefillLineup ? <p className="text-sm text-muted">{he.admin.liveStats.lineupPrefilled}</p> : null}
          <LiveStatsRoster
            players={players}
            state={state}
            disabled={startPending}
            onChange={(next) => setState(next, { skipSave: true })}
          />
        </>
      ) : null}

      {isLive || isFinal ? (
        <>
          <LiveStatsPlayerGrid players={players} state={state} selectedId={selectedPlayer?.id ?? null} onSelect={setSelectedId} />

          <LiveStatsPlayerPanel player={selectedPlayer} state={state} disabled={scoringDisabled} onChange={recordChange} />

          {/* Ours first, then a clearly separate opponent block so the two are never mixed up mid-game. */}
          {isLive ? <LiveStatsOpponent state={state} disabled={scoringDisabled} onChange={recordChange} /> : null}

          {sumWarning ? (
            <p role="status" className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              {sumWarning}
            </p>
          ) : null}

          {isLive ? (
            <>
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

              {/* Kept well away from Undo (which lives in the bottom bar) so a thumb slip can't end the game. */}
              <section className="mt-8 space-y-2 rounded-(--radius-card) border border-loss/30 bg-loss/5 p-4">
                <p className="text-sm text-muted">{he.admin.liveStats.finishSectionHint}</p>
                <Button type="button" variant="danger" size="lg" className="w-full" disabled={demo || finishPending} onClick={onFinish}>
                  {he.admin.liveStats.finishGame}
                </Button>
              </section>
            </>
          ) : null}
        </>
      ) : null}

      <Dialog open={confirmFinishOpen} onOpenChange={setConfirmFinishOpen}>
        <DialogContent
          title={he.admin.liveStats.finishConfirmTitle}
          description={he.admin.liveStats.finishConfirmScore(state.teamScore, state.opponentScore, game.opponent)}
          data-user-content
        >
          {sumWarning ? <p className="mb-3 text-sm text-warning">{sumWarning}</p> : null}
          {tied ? <p className="mb-3 text-sm text-loss">{he.admin.liveStats.finishTied}</p> : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                {he.admin.liveStats.cancel}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="danger"
              disabled={finishPending || tied}
              onClick={() => {
                setConfirmFinishOpen(false);
                runFinish();
              }}
            >
              {sumWarning ? he.admin.liveStats.finishAnyway : he.admin.liveStats.finishGame}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReopenOpen} onOpenChange={setConfirmReopenOpen}>
        <DialogContent title={he.admin.liveStats.reopenConfirmTitle} description={he.admin.liveStats.reopenConfirmBody}>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                {he.admin.liveStats.cancel}
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={reopenPending}
              onClick={() => {
                setConfirmReopenOpen(false);
                onReopen();
              }}
            >
              {he.admin.liveStats.reopenGame}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!isFinal ? (
        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
            {preGame ? (
              <>
                <span className="text-sm font-semibold">{he.admin.liveStats.selectedCount(state.playedPlayerIds.length)}</span>
                <Button type="button" size="lg" disabled={demo || startPending || state.playedPlayerIds.length === 0} onClick={onStart}>
                  {he.admin.liveStats.startGame}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canUndo || scoringDisabled}
                  onClick={() => {
                    haptic([15, 30, 15]);
                    undoLast();
                  }}
                >
                  <Undo2 aria-hidden />
                  {he.admin.liveStats.undoLast}
                </Button>
                <LiveStatsPlayByPlay gameId={game.id} players={players} saveStatus={saveStatus} />
                {demo ? (
                  <span className="text-sm text-muted">{he.admin.liveStats.demoBlocked}</span>
                ) : (
                  <LiveStatsSaveIndicator status={saveStatus} label={saveStatusLabel} onRetry={() => void flushSave()} />
                )}
              </>
            )}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
