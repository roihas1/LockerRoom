"use client";

import { useEffect, useState } from "react";
import { he } from "@/config/strings";

const QUIP_INTERVAL_MS = 1800;

export function DribblingBall() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % he.fun.loading.length), QUIP_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 py-8" role="status">
      <div className="flex h-20 flex-col items-center justify-end">
        <span className="text-5xl leading-none motion-safe:animate-dribble" aria-hidden>
          🏀
        </span>
        <span className="mt-1 h-1.5 w-10 rounded-full bg-black/70 motion-safe:animate-dribble-shadow" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-muted">{he.fun.loading[index]}</p>
    </div>
  );
}
