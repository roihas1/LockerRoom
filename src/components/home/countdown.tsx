"use client";

import { useEffect, useState } from "react";
import { he } from "@/config/strings";

function parts(target: number, now: number) {
  const diff = Math.max(0, target - now);
  return {
    done: diff === 0,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
  };
}

export function Countdown({ to }: { to: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return <div className="h-14" aria-hidden />;
  const p = parts(target, now);
  if (p.done) return <p className="text-center font-display font-bold text-team">{he.home.countdown.started}</p>;
  if (p.days > 30) return null;

  const cells = [
    { v: p.days, l: he.home.countdown.days },
    { v: p.hours, l: he.home.countdown.hours },
    { v: p.minutes, l: he.home.countdown.minutes },
  ];
  return (
    <div dir="ltr" className="flex justify-center gap-2" role="timer" aria-live="off">
      {cells.map((c) => (
        <div key={c.l} className="min-w-16 rounded-xl border border-border bg-black/30 px-3 py-2 text-center">
          <span className="num block text-2xl font-black text-team">{String(c.v).padStart(2, "0")}</span>
          <span className="text-[11px] text-muted">{c.l}</span>
        </div>
      ))}
    </div>
  );
}
