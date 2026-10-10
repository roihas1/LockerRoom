"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";
import { haptic } from "@/lib/utils/haptics";

type Outcome = "swish" | "rim" | "air";

const SWEET = { from: 68, to: 82 };
const NEAR = 8;
/** Full sweep of the meter (0 → 100 → 0) in ms; speeds up with the streak. */
const BASE_PERIOD_MS = 1600;

function judge(power: number): Outcome {
  if (power >= SWEET.from && power <= SWEET.to) return "swish";
  if (power >= SWEET.from - NEAR && power <= SWEET.to + NEAR) return "rim";
  return "air";
}

/** Timing mini game for the 404 page: stop the power meter in the green zone. */
export function HoopGame() {
  const [power, setPower] = useState(0);
  const [shots, setShots] = useState(0);
  const [made, setMade] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [last, setLast] = useState<Outcome | null>(null);
  const powerRef = useRef(0);
  const periodRef = useRef(BASE_PERIOD_MS);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    function tick(now: number) {
      const phase = ((now - start) % periodRef.current) / periodRef.current;
      const value = Math.round((phase < 0.5 ? phase * 2 : 2 - phase * 2) * 100);
      powerRef.current = value;
      setPower(value);
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  function shoot() {
    const outcome = judge(powerRef.current);
    setShots((s) => s + 1);
    setLast(outcome);
    if (outcome === "swish") {
      haptic([10, 40, 20]);
      setMade((m) => m + 1);
      const next = streak + 1;
      setStreak(next);
      setBest((b) => Math.max(b, next));
      periodRef.current = Math.max(700, BASE_PERIOD_MS - next * 120);
    } else {
      haptic(outcome === "rim" ? 30 : 8);
      setStreak(0);
      periodRef.current = BASE_PERIOD_MS;
    }
  }

  return (
    <section className="card mt-6 space-y-4 p-5 text-center" aria-labelledby="hoop-title">
      <h2 id="hoop-title" className="font-display text-lg font-extrabold">
        <span aria-hidden>🏀 </span>
        {he.fun.hoop.title}
      </h2>
      <p className="text-xs text-muted">{he.fun.hoop.hint}</p>

      <div className="relative mx-auto h-28 w-24">
        <div className="absolute inset-x-2 top-2 h-1.5 rounded-full bg-loss" aria-hidden />
        <div className="absolute inset-x-4 top-3.5 h-8 rounded-b-xl border-2 border-t-0 border-dashed border-white/60" aria-hidden />
        <span
          key={shots}
          aria-hidden
          className={cn(
            "absolute inset-x-0 bottom-0 mx-auto block text-4xl",
            last === "swish" && "motion-safe:animate-[swish_0.7s_ease-out]",
            last === "rim" && "motion-safe:animate-[rim_0.7s_ease-out]",
            last === "air" && "motion-safe:animate-[air_0.7s_ease-out]",
          )}
        >
          🏀
        </span>
      </div>

      <div
        role="meter"
        aria-label={he.fun.hoop.meter}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={power}
        className="relative h-3 overflow-hidden rounded-full bg-surface-3"
      >
        <span className="absolute inset-y-0 bg-win/40" style={{ insetInlineStart: `${SWEET.from}%`, width: `${SWEET.to - SWEET.from}%` }} />
        <span className="absolute inset-y-0 w-1 rounded-full bg-team" style={{ insetInlineStart: `calc(${power}% - 2px)` }} />
      </div>

      <Button type="button" onClick={shoot} className="w-full">
        {he.fun.hoop.shoot}
      </Button>

      <p aria-live="polite" className="min-h-6 font-display font-bold">
        {last ? he.fun.hoop[last] : null}
      </p>
      <p className="num flex justify-center gap-4 text-sm text-muted">
        <span>{he.fun.hoop.score(made, shots)}</span>
        <span>{he.fun.hoop.best(best)}</span>
      </p>
    </section>
  );
}
