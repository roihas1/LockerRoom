"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlayCourt, type BallFlight } from "@/components/practice/play-court";
import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";
import { clonePositions } from "@/lib/play-diagram/defaults";
import { easeInOut, lerpPoint } from "@/lib/play-diagram/court-math";
import { gradeStep, type GradeReason } from "@/lib/play-diagram/grade";
import { haptic } from "@/lib/utils/haptics";
import { cn } from "@/lib/utils/cn";
import type { CourtPoint, PlayDiagram, PlayDiagramAction, PlayDiagramStep, PlayPlayerId } from "@/types/play-diagram";
import { PLAY_PLAYER_IDS } from "@/types/play-diagram";

type Mode = "watch" | "challenge";

/** 0 none → 1 text → 2 ghosts → 3 solution placed */
type HintLevel = 0 | 1 | 2 | 3;

const MOVE_MS = 700;
const ACTION_MS = 550;

function reasonMessage(reason: GradeReason): string | null {
  switch (reason) {
    case "positions":
      return he.training.practice.wrongPositions;
    case "pass":
      return he.training.practice.wrongPass;
    case "shoot":
      return he.training.practice.wrongShoot;
    case "action_missing":
      return he.training.practice.wrongAction;
    case "ball":
      return he.training.practice.wrongBall;
    default:
      return null;
  }
}

function actionHintText(step: PlayDiagramStep): string {
  if (step.action?.type === "pass") return he.training.practice.hintActionPass(step.action.from, step.action.to);
  if (step.action?.type === "shoot") return he.training.practice.hintActionShoot(step.action.shooter);
  return he.training.practice.hintActionMove;
}

/** Numbers in LTR so RTL Hebrew doesn’t reverse “3/5”. */
function Ratio({ current, total, className }: { current: number; total: number; className?: string }) {
  return (
    <bdi dir="ltr" className={cn("num", className)}>
      {current}/{total}
    </bdi>
  );
}

function finishBlurb(correct: number, total: number) {
  if (total > 0 && correct >= total) return he.training.practice.finishPerfect;
  if (total > 0 && correct >= Math.ceil(total * 0.6)) return he.training.practice.finishGreat;
  return he.training.practice.finishOk;
}

export function PracticeSession({ diagram, title }: { diagram: PlayDiagram; title: string }) {
  const [mode, setMode] = useState<Mode>("challenge");
  const [stepIndex, setStepIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(() => (diagram.steps.length > 1 ? 1 : 0));
  const [positions, setPositions] = useState(() => clonePositions(diagram.steps[0]!.positions));
  const [ballHolder, setBallHolder] = useState<PlayPlayerId>(diagram.steps[0]!.ballHolder);
  const [ballFlight, setBallFlight] = useState<BallFlight>(null);
  const [busy, setBusy] = useState(false);
  const [passMode, setPassMode] = useState(false);
  const [lastAction, setLastAction] = useState<PlayDiagramAction | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; lines: string[]; usedHint?: boolean } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  /** Target indices already counted as correct — prevents double-scoring the same step. */
  const [solvedTargets, setSolvedTargets] = useState<number[]>([]);
  const [challengeDone, setChallengeDone] = useState(false);
  const [hintLevel, setHintLevel] = useState<HintLevel>(0);
  const [failCount, setFailCount] = useState(0);
  const [usedHintThisStep, setUsedHintThisStep] = useState(false);
  const animRef = useRef<number | null>(null);

  const watchStep = diagram.steps[stepIndex]!;
  const challengeTarget = diagram.steps[Math.min(targetIndex, diagram.steps.length - 1)]!;
  const isLastWatch = stepIndex >= diagram.steps.length - 1;
  const challengeStepsTotal = diagram.steps.length > 1 ? diagram.steps.length - 1 : 1;
  const isLastChallenge = targetIndex >= diagram.steps.length - 1;

  const cancelAnim = () => {
    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  };

  useEffect(() => () => cancelAnim(), []);

  const resetStepHelp = () => {
    setHintLevel(0);
    setFailCount(0);
    setUsedHintThisStep(false);
  };

  const animateMove = useCallback((from: Record<PlayPlayerId, CourtPoint>, to: Record<PlayPlayerId, CourtPoint>, ms: number) => {
    return new Promise<void>((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = easeInOut(Math.min(1, (now - start) / ms));
        const next = PLAY_PLAYER_IDS.reduce(
          (acc, id) => {
            acc[id] = lerpPoint(from[id], to[id], t);
            return acc;
          },
          {} as Record<PlayPlayerId, CourtPoint>,
        );
        setPositions(next);
        if (t < 1) animRef.current = requestAnimationFrame(tick);
        else {
          animRef.current = null;
          resolve();
        }
      };
      animRef.current = requestAnimationFrame(tick);
    });
  }, []);

  const animateFlight = useCallback((flight: Exclude<BallFlight, null>, ms: number) => {
    return new Promise<void>((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = easeInOut(Math.min(1, (now - start) / ms));
        setBallFlight({ ...flight, t });
        if (t < 1) animRef.current = requestAnimationFrame(tick);
        else {
          animRef.current = null;
          setBallFlight(null);
          resolve();
        }
      };
      animRef.current = requestAnimationFrame(tick);
    });
  }, []);

  const goToWatchStep = async (index: number) => {
    if (busy || index < 0 || index >= diagram.steps.length) return;
    const target = diagram.steps[index]!;
    const forward = index > stepIndex;
    setBusy(true);
    setPassMode(false);
    setFeedback(null);
    const fromPos = clonePositions(positions);
    await animateMove(fromPos, target.positions, MOVE_MS);
    if (forward && target.action?.type === "pass") {
      await animateFlight(
        { kind: "pass", from: target.positions[target.action.from], to: target.positions[target.action.to], t: 0 },
        ACTION_MS,
      );
      haptic(12);
    } else if (forward && target.action?.type === "shoot") {
      await animateFlight({ kind: "shoot", from: target.positions[target.action.shooter], t: 0 }, ACTION_MS);
      haptic([10, 40, 20]);
    }
    setBallHolder(target.ballHolder);
    setPositions(clonePositions(target.positions));
    setStepIndex(index);
    setBusy(false);
  };

  const startChallenge = () => {
    cancelAnim();
    setBusy(false);
    setBallFlight(null);
    setMode("challenge");
    setStepIndex(0);
    setTargetIndex(diagram.steps.length > 1 ? 1 : 0);
    setPositions(clonePositions(diagram.steps[0]!.positions));
    setBallHolder(diagram.steps[0]!.ballHolder);
    setPassMode(false);
    setLastAction(null);
    setFeedback(null);
    setCorrectCount(0);
    setSolvedTargets([]);
    setChallengeDone(false);
    resetStepHelp();
  };

  const startWatch = () => {
    cancelAnim();
    setBusy(false);
    setBallFlight(null);
    setMode("watch");
    setStepIndex(0);
    setPositions(clonePositions(diagram.steps[0]!.positions));
    setBallHolder(diagram.steps[0]!.ballHolder);
    setPassMode(false);
    setLastAction(null);
    setFeedback(null);
    setChallengeDone(false);
    resetStepHelp();
  };

  const applyHintLevel = (level: HintLevel) => {
    if (feedback?.ok) return;
    setHintLevel(level);
    setUsedHintThisStep(true);
    setFeedback(null);
    if (level >= 3) {
      setPositions(clonePositions(challengeTarget.positions));
      setBallHolder(challengeTarget.ballHolder);
      if (challengeTarget.action) setLastAction(challengeTarget.action);
      else setLastAction(null);
      setPassMode(false);
      setFeedback({ ok: false, lines: [he.training.practice.hintSolution] });
    }
  };

  const requestHint = () => {
    if (mode !== "challenge" || busy || challengeDone || feedback?.ok) return;
    const next = Math.min(3, hintLevel + 1) as HintLevel;
    applyHintLevel(next);
    haptic(12);
  };

  const beginPass = () => {
    if (mode !== "challenge" || busy || challengeDone || feedback?.ok) return;
    setPassMode(true);
    setFeedback(null);
  };

  const cancelPass = () => {
    setPassMode(false);
  };

  const onTapPlayer = async (id: PlayPlayerId) => {
    if (mode !== "challenge" || busy || challengeDone || feedback?.ok) return;
    if (!passMode) return;
    if (id === ballHolder) {
      setPassMode(false);
      return;
    }
    const fromId = ballHolder;
    const from = positions[fromId];
    const to = positions[id];
    setBusy(true);
    setPassMode(false);
    await animateFlight({ kind: "pass", from, to, t: 0 }, ACTION_MS);
    setBallHolder(id);
    setLastAction({ type: "pass", from: fromId, to: id });
    setBusy(false);
    haptic(12);
  };

  const shoot = async () => {
    if (mode !== "challenge" || busy || challengeDone || feedback?.ok) return;
    setBusy(true);
    setPassMode(false);
    setFeedback(null);
    const shooter = ballHolder;
    await animateFlight({ kind: "shoot", from: positions[shooter], t: 0 }, ACTION_MS);
    setLastAction({ type: "shoot", shooter });
    setBusy(false);
    haptic([10, 40, 20]);
  };

  const checkAnswer = () => {
    if (mode !== "challenge" || busy || challengeDone || feedback?.ok) return;
    if (solvedTargets.includes(targetIndex)) return;
    const result = gradeStep(challengeTarget, positions, ballHolder, lastAction);
    if (result.ok) {
      haptic([10, 40, 20]);
      setSolvedTargets((prev) => (prev.includes(targetIndex) ? prev : [...prev, targetIndex]));
      setCorrectCount((c) => Math.min(challengeStepsTotal, c + 1));
      setFeedback({
        ok: true,
        lines: [],
        usedHint: usedHintThisStep,
      });
      setLastAction(null);
      setPassMode(false);
      setPositions(clonePositions(challengeTarget.positions));
      setBallHolder(challengeTarget.ballHolder);
      if (isLastChallenge) setChallengeDone(true);
    } else {
      haptic(20);
      const nextFails = failCount + 1;
      setFailCount(nextFails);
      // Auto-raise help after each miss (text → ghosts).
      const autoLevel = Math.min(2, Math.max(hintLevel, nextFails)) as HintLevel;
      if (autoLevel > hintLevel) {
        setHintLevel(autoLevel);
        setUsedHintThisStep(true);
      }
      const lines = result.reasons.map(reasonMessage).filter((m): m is string => Boolean(m));
      lines.push(actionHintText(challengeTarget));
      if (autoLevel >= 2) lines.push(he.training.practice.hintGhosts);
      setFeedback({ ok: false, lines: lines.length ? lines : [he.training.practice.wrong] });
    }
  };

  const advanceChallenge = () => {
    if (!feedback?.ok || challengeDone || isLastChallenge) return;
    setTargetIndex((i) => i + 1);
    setFeedback(null);
    setLastAction(null);
    setPassMode(false);
    resetStepHelp();
  };

  const skipStep = () => {
    if (mode !== "challenge" || busy || challengeDone) return;
    setPositions(clonePositions(challengeTarget.positions));
    setBallHolder(challengeTarget.ballHolder);
    setLastAction(null);
    setPassMode(false);
    setFeedback(null);
    if (isLastChallenge) {
      setChallengeDone(true);
      return;
    }
    setTargetIndex((i) => i + 1);
    resetStepHelp();
  };

  const goalCaption = challengeTarget.caption || he.training.practice.noCaption;
  const showGhosts = mode === "challenge" && !challengeDone && hintLevel >= 2;
  const hintTextVisible = mode === "challenge" && !challengeDone && hintLevel >= 1;
  const challengeProgress = diagram.steps.length > 1 ? targetIndex : 1;

  if (mode === "challenge" && challengeDone) {
    return (
      <div className="motion-safe:animate-fade-up space-y-4">
        <div className="card relative overflow-hidden border-win/40 bg-win/10 p-6 text-center sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in oklab, var(--color-win) 45%, transparent), transparent 70%)",
            }}
            aria-hidden
          />
          <p className="relative text-4xl" aria-hidden>
            🏀
          </p>
          <h2 className="relative mt-3 font-display text-3xl font-black text-win md:text-4xl">
            {he.training.practice.finishTitle}
          </h2>
          <p className="relative mt-2 text-lg font-semibold">
            {finishBlurb(Math.min(correctCount, challengeStepsTotal), challengeStepsTotal)}
          </p>
          <p data-user-content className="relative mt-1 text-muted">
            {title}
          </p>
          <p className="relative mt-5 text-sm text-muted">
            {he.training.practice.scoreLabel}{" "}
            <Ratio
              current={Math.min(correctCount, challengeStepsTotal)}
              total={challengeStepsTotal}
              className="text-2xl font-black text-text"
            />
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={startChallenge}>
              {he.training.practice.playAgain}
            </Button>
            <Button type="button" variant="secondary" onClick={startWatch}>
              {he.training.practice.watchPlay}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {mode === "watch" ? (
            <>
              {he.training.practice.stepLabel} <Ratio current={stepIndex + 1} total={diagram.steps.length} />
            </>
          ) : (
            <>
              {he.training.practice.stepLabel} <Ratio current={challengeProgress} total={challengeStepsTotal} />
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={startChallenge} disabled={busy}>
            {he.training.practice.restart}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "challenge" ? "primary" : "outline"}
            onClick={startChallenge}
            disabled={busy}
          >
            {he.training.practice.challenge}
          </Button>
          <Button type="button" size="sm" variant={mode === "watch" ? "primary" : "outline"} onClick={startWatch} disabled={busy}>
            {he.training.practice.watch}
          </Button>
        </div>
      </div>

      {mode === "challenge" ? (
        <div className="card space-y-1 border-team/40 bg-team/5 p-4">
          <p className="text-xs font-bold text-team">{he.training.practice.goalLabel}</p>
          <p data-user-content className="leading-relaxed">
            {goalCaption}
          </p>
          <p className="text-xs text-muted">{he.training.practice.challengeHint}</p>
          {hintTextVisible ? (
            <p className="pt-1 text-sm font-semibold text-team" role="status">
              {actionHintText(challengeTarget)}
            </p>
          ) : null}
          {showGhosts ? <p className="text-xs text-muted">{he.training.practice.hintGhosts}</p> : null}
        </div>
      ) : null}

      <PlayCourt
        positions={positions}
        ballHolder={ballHolder}
        ballFlight={ballFlight}
        ghostPositions={showGhosts ? challengeTarget.positions : null}
        interactive={mode === "challenge" && !busy}
        selectedId={passMode ? ballHolder : null}
        onDragPlayer={
          mode === "challenge"
            ? (id, point) => {
                setPositions((prev) => ({ ...prev, [id]: point }));
                if (feedback && !feedback.ok) setFeedback(null);
              }
            : undefined
        }
        onTapPlayer={mode === "challenge" ? onTapPlayer : undefined}
      />

      <div className="card space-y-3 p-4">
        <h2 className="font-display text-lg font-extrabold" data-user-content>
          {title}
        </h2>
        {mode === "watch" ? (
          <p data-user-content className="leading-relaxed">
            {watchStep.caption || he.training.practice.noCaption}
          </p>
        ) : (
          <p className="text-sm text-muted">
            {he.training.practice.scoreLabel}{" "}
            <Ratio
              current={Math.min(correctCount, challengeStepsTotal)}
              total={challengeStepsTotal}
              className="font-semibold text-text"
            />
          </p>
        )}
        {passMode ? <p className="text-sm font-semibold text-team">{he.training.practice.pickPassTarget}</p> : null}
        {feedback ? (
          <div
            className={cn(
              "rounded-xl border px-3 py-2 text-sm",
              feedback.ok ? "border-win/40 bg-win/10 text-win" : "border-warning/40 bg-warning/10 text-warning",
            )}
            role="status"
          >
            <p className="font-bold">
              {feedback.ok
                ? feedback.usedHint
                  ? he.training.practice.correctWithHint
                  : he.training.practice.correct
                : he.training.practice.wrong}
            </p>
            {!feedback.ok
              ? feedback.lines.map((line) => (
                  <p key={line} className="mt-1 opacity-90">
                    {line}
                  </p>
                ))
              : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {mode === "watch" ? (
          <>
            <Button type="button" variant="secondary" disabled={busy || stepIndex === 0} onClick={() => goToWatchStep(stepIndex - 1)}>
              {he.actions.previous}
            </Button>
            <Button type="button" disabled={busy || isLastWatch} onClick={() => goToWatchStep(stepIndex + 1)}>
              {isLastWatch ? he.training.practice.done : he.actions.next}
            </Button>
          </>
        ) : (
          <>
            {passMode ? (
              <Button type="button" variant="secondary" onClick={cancelPass} disabled={busy || Boolean(feedback?.ok)}>
                {he.training.practice.cancelPass}
              </Button>
            ) : (
              <Button type="button" variant="secondary" onClick={beginPass} disabled={busy || Boolean(feedback?.ok)}>
                {he.training.practice.pass}
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={shoot} disabled={busy || Boolean(feedback?.ok)}>
              {he.training.practice.shoot}
            </Button>
            <Button type="button" variant="outline" onClick={requestHint} disabled={busy || hintLevel >= 3 || Boolean(feedback?.ok)}>
              {hintLevel === 0 ? he.training.practice.hint : hintLevel >= 2 ? he.training.practice.showSolution : he.training.practice.hintMore}
            </Button>
            {failCount >= 2 && !feedback?.ok ? (
              <Button type="button" variant="ghost" onClick={skipStep} disabled={busy}>
                {he.training.practice.skipStep}
              </Button>
            ) : null}
            {feedback?.ok ? (
              <Button type="button" onClick={advanceChallenge}>
                {he.training.practice.nextChallenge}
              </Button>
            ) : (
              <Button type="button" onClick={checkAnswer} disabled={busy || solvedTargets.includes(targetIndex)}>
                {he.training.practice.check}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
