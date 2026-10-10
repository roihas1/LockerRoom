"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SmilePlus } from "lucide-react";
import { toast } from "sonner";
import type { ToggleReactionResult } from "@/app/api/reactions/route";
import { he } from "@/config/strings";
import { primaryReactionKinds, reactionEmoji, reactionKinds } from "@/lib/reactions";
import { haptic } from "@/lib/utils/haptics";
import { cn } from "@/lib/utils/cn";
import type { ReactionCounts, ReactionKind } from "@/types/domain";

const DEVICE_KEY = "lr:device";
const PICKS_KEY = "lr:reactions";
const PICKS_EVENT = "lr:reactions-change";

function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function readPicks(): Record<string, ReactionKind[]> {
  try {
    return JSON.parse(localStorage.getItem(PICKS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writePicks(postId: number, kinds: ReactionKind[]) {
  const picks = readPicks();
  if (kinds.length) picks[postId] = kinds;
  else delete picks[postId];
  localStorage.setItem(PICKS_KEY, JSON.stringify(picks));
  window.dispatchEvent(new Event(PICKS_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(PICKS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PICKS_EVENT, onChange);
  };
}

async function sendToggle(postId: number, kind: ReactionKind): Promise<ToggleReactionResult> {
  try {
    const res = await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, deviceId: deviceId(), kind }),
    });
    return (await res.json()) as ToggleReactionResult;
  } catch {
    return { ok: false, reason: "failed" };
  }
}

/**
 * One of each reaction per device. Picks live in localStorage; counts come back from the server.
 * Uses a plain fetch (no server action or transition) so reacting never re-renders the page.
 */
export function ReactionBar({ postId, initial }: { postId: number; initial: ReactionCounts }) {
  const picksRaw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(PICKS_KEY) ?? "",
    () => "",
  );
  const mine = new Set<ReactionKind>(picksRaw ? (readPicks()[postId] ?? []) : []);
  const [counts, setCounts] = useState(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setPickerOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  async function toggle(kind: ReactionKind) {
    const had = mine.has(kind);
    const nextMine = new Set(mine);
    if (had) nextMine.delete(kind);
    else nextMine.add(kind);
    const before = counts;
    haptic(had ? 5 : [8, 30, 8]);
    setCounts({ ...counts, [kind]: Math.max(0, counts[kind] + (had ? -1 : 1)) });
    writePicks(postId, [...nextMine]);
    setPickerOpen(false);

    const result = await sendToggle(postId, kind);
    if (result.ok) {
      setCounts(result.counts);
    } else if (result.reason !== "demo") {
      setCounts(before);
      writePicks(postId, [...mine]);
      toast.error(result.reason === "rate_limited" ? he.fun.reactions.rateLimited : he.fun.reactions.failed);
    }
  }

  const visible = reactionKinds.filter((k) => primaryReactionKinds.includes(k) || counts[k] > 0 || mine.has(k));

  return (
    <div ref={rootRef} role="group" aria-label={he.fun.reactions.group} className="relative flex flex-wrap gap-1.5">
      {visible.map((kind) => {
        const active = mine.has(kind);
        const label = he.fun.reactions[kind];
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={active}
            aria-label={he.fun.reactions.count(label, counts[kind])}
            title={label}
            onClick={() => toggle(kind)}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-sm tabular-nums transition-all motion-safe:active:scale-90",
              active ? "border-team bg-team/15 text-text" : "border-border bg-surface-2 text-muted hover:text-text",
            )}
          >
            <span aria-hidden className={cn(active && "motion-safe:animate-wiggle")}>
              {reactionEmoji[kind]}
            </span>
            {counts[kind] > 0 ? <span aria-hidden>{counts[kind]}</span> : null}
          </button>
        );
      })}

      <button
        type="button"
        aria-label={he.fun.reactions.more}
        aria-expanded={pickerOpen}
        title={he.fun.reactions.more}
        onClick={() => setPickerOpen((o) => !o)}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full border border-dashed border-border text-muted transition-colors hover:text-text",
          pickerOpen && "border-team text-text",
        )}
      >
        <SmilePlus className="size-4" aria-hidden />
      </button>

      {pickerOpen ? (
        <div
          role="menu"
          aria-label={he.fun.reactions.more}
          className="absolute bottom-full start-0 z-30 mb-2 flex flex-wrap gap-1 rounded-2xl border border-border bg-surface-2 p-1.5 shadow-xl motion-safe:animate-fade-up"
        >
          {reactionKinds.map((kind) => (
            <button
              key={kind}
              type="button"
              role="menuitemcheckbox"
              aria-checked={mine.has(kind)}
              aria-label={he.fun.reactions[kind]}
              title={he.fun.reactions[kind]}
              onClick={() => toggle(kind)}
              className={cn(
                "flex size-10 items-center justify-center rounded-xl text-xl transition-transform motion-safe:hover:scale-125 motion-safe:active:scale-90",
                mine.has(kind) && "bg-team/20",
              )}
            >
              <span aria-hidden>{reactionEmoji[kind]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
