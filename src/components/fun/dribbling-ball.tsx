"use client";

import { useEffect, useState } from "react";
import { he } from "@/config/strings";

const QUIP_INTERVAL_MS = 1800;

/** Survives client navigations, so back-to-back loads never open with the same line. */
let lastFirstQuip = -1;

function shuffledQuips(): number[] {
  const order = he.fun.loading.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  if (order[0] === lastFirstQuip && order.length > 1) [order[0], order[1]] = [order[1]!, order[0]!];
  lastFirstQuip = order[0]!;
  return order;
}

export function DribblingBall() {
  const [order] = useState(shuffledQuips);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % order.length), QUIP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [order.length]);

  return (
    <div className="flex flex-col items-center gap-3 py-8" role="status">
      <div className="flex h-20 flex-col items-center justify-end">
        <span className="text-5xl leading-none motion-safe:animate-dribble" aria-hidden>
          🏀
        </span>
        <span className="mt-1 h-1.5 w-10 rounded-full bg-black/70 motion-safe:animate-dribble-shadow" aria-hidden />
      </div>
      {/* The first line is random, so the server-rendered one can differ from the client's. */}
      <p key={step} suppressHydrationWarning className="text-sm font-semibold text-muted motion-safe:animate-fade-up">
        {he.fun.loading[order[step]!]}
      </p>
    </div>
  );
}
