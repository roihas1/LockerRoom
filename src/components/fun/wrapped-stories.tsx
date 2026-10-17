"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pause, Play, X } from "lucide-react";
import { he } from "@/config/strings";
import type { WrappedSlide } from "@/lib/fun/wrapped";
import { shameEmoji } from "@/lib/stats/shame";
import { cn } from "@/lib/utils/cn";
import { haptic } from "@/lib/utils/haptics";
import { formatInt, formatPercent } from "@/lib/utils/numbers";

const SLIDE_MS = 5500;

const backgrounds: Record<WrappedSlide["kind"], string> = {
  intro: "from-team/40 via-surface to-bg",
  points: "from-amber-500/40 via-surface to-bg",
  bestGame: "from-win/40 via-surface to-bg",
  record: "from-sky-500/40 via-surface to-bg",
  signature: "from-fuchsia-500/40 via-surface to-bg",
  shame: "from-warning/40 via-surface to-bg",
  outro: "from-team/40 via-surface to-bg",
};

export function WrappedStories({
  slides,
  playerName,
  hashtag,
  backHref,
  photo,
}: {
  slides: WrappedSlide[];
  playerName: string;
  hashtag: string | null;
  backHref: string;
  photo: ReactNode;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const last = slides.length - 1;
  const slide = slides[index]!;

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(last, Math.max(0, i + delta)));
      haptic(6);
    },
    [last],
  );

  useEffect(() => {
    if (paused || index >= last) return;
    const t = setTimeout(() => setIndex((i) => Math.min(last, i + 1)), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, paused, last]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(1);
      else if (e.key === "ArrowRight") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === "Escape") router.push(backHref);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, router, backHref]);

  return (
    <div
      className={cn(
        "relative mx-auto flex aspect-9/16 max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-border bg-linear-to-b shadow-2xl transition-colors duration-500",
        backgrounds[slide.kind],
      )}
    >
      <div className="relative z-20 flex gap-1 p-3" aria-hidden>
        {slides.map((s, i) => (
          <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            <span
              key={i === index ? `active-${index}` : undefined}
              className={cn(
                "block h-full rounded-full bg-white",
                i < index && "w-full",
                i > index && "w-0",
                i === index && (index === last ? "w-full" : "w-0 motion-safe:animate-story-progress motion-reduce:w-full"),
              )}
              style={i === index ? { animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? "paused" : "running" } : undefined}
            />
          </span>
        ))}
      </div>

      <div className="relative z-20 flex items-center justify-between px-3">
        <p className="text-sm font-bold">
          <span data-user-content>{he.fun.wrapped.title(playerName)}</span>
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="flex size-9 items-center justify-center rounded-full hover:bg-white/10"
            aria-label={paused ? he.fun.wrapped.play : he.fun.wrapped.pause}
          >
            {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
          </button>
          <Link href={backHref} className="flex size-9 items-center justify-center rounded-full hover:bg-white/10" aria-label={he.fun.wrapped.close}>
            <X className="size-5" aria-hidden />
          </Link>
        </div>
      </div>

      <div
        key={index}
        aria-live="polite"
        className="pointer-events-none relative z-10 flex flex-1 flex-col justify-center gap-4 p-6 text-center motion-safe:animate-fade-up"
      >
        <p className="sr-only">{he.fun.wrapped.slide(index + 1, slides.length)}</p>
        <SlideBody slide={slide} photo={photo} hashtag={hashtag} />
      </div>

      {/* Visual left/right story taps (match ArrowLeft=next / ArrowRight=prev) */}
      <button type="button" onClick={() => go(1)} disabled={index === last} className="absolute inset-y-0 left-0 z-[15] w-2/3" aria-label={he.fun.wrapped.next} /* rtl-ignore */ />
      <button type="button" onClick={() => go(-1)} disabled={index === 0} className="absolute inset-y-0 right-0 z-[15] w-1/3" aria-label={he.fun.wrapped.prev} /* rtl-ignore */ />
    </div>
  );
}

function Big({ children }: { children: ReactNode }) {
  return <p className="num font-display text-7xl leading-none font-black text-team motion-safe:animate-wiggle">{children}</p>;
}

function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-sm font-bold tracking-wide text-muted">{children}</p>;
}

function SlideBody({ slide, photo, hashtag }: { slide: WrappedSlide; photo: ReactNode; hashtag: string | null }) {
  const w = he.fun.wrapped;
  switch (slide.kind) {
    case "intro":
      return (
        <>
          <div className="relative mx-auto size-40 overflow-hidden rounded-full ring-4 ring-team">{photo}</div>
          <Kicker>{w.introKicker}</Kicker>
          <p className="font-display text-2xl leading-snug font-extrabold">{w.intro(slide.gp)}</p>
        </>
      );
    case "points":
      return (
        <>
          <Kicker>{w.pointsKicker}</Kicker>
          <Big>{formatInt(slide.total)}</Big>
          <p className="font-display text-xl font-bold">{w.pointsRank(slide.rank, slide.teamSize)}</p>
        </>
      );
    case "bestGame":
      return (
        <>
          <Kicker>{w.bestGameKicker}</Kicker>
          <Big>{slide.points}</Big>
          <p className="num text-lg font-bold">{w.statsLine(slide.points, slide.rebounds, slide.assists)}</p>
          <p className="font-display text-xl font-bold">
            <span data-user-content>{w.bestGame(slide.opponent)}</span>
          </p>
        </>
      );
    case "record":
      return (
        <>
          <Kicker>{w.recordKicker}</Kicker>
          <p className="num font-display text-6xl font-black">
            <span className="text-win">{slide.wins}</span>
            <span className="text-muted">-</span>
            <span className="text-loss">{slide.losses}</span>
          </p>
          <p className="text-lg font-bold">{w.record(slide.wins, slide.losses)}</p>
          <p className="font-display text-xl font-bold">{slide.wins >= slide.losses ? w.recordGood : w.recordBad}</p>
        </>
      );
    case "signature":
      return (
        <>
          <Kicker>{w.signatureKicker}</Kicker>
          <Big>
            <bdi dir="ltr">{formatPercent(slide.share)}</bdi>
          </Big>
          <p className="font-display text-xl font-bold">{w.signature[slide.stat]}</p>
        </>
      );
    case "shame":
      return (
        <>
          <Kicker>{w.shameKicker}</Kicker>
          <ul className="space-y-3">
            {slide.categories.map((c) => (
              <li key={c} className="flex items-center justify-center gap-3 font-display text-xl font-extrabold text-warning">
                <span aria-hidden className="text-4xl">
                  {shameEmoji[c]}
                </span>
                {he.fun.shame[c].label}
              </li>
            ))}
          </ul>
        </>
      );
    case "outro":
      return (
        <>
          <div className="relative mx-auto size-32 overflow-hidden rounded-full ring-4 ring-team">{photo}</div>
          <Kicker>{w.outroKicker}</Kicker>
          {hashtag ? (
            <p className="font-display text-3xl font-black text-team">
              <bdi data-user-content>#{hashtag}</bdi>
            </p>
          ) : null}
          <p className="font-display text-xl font-bold">{w.outro}</p>
        </>
      );
  }
}
