"use client";

import { Minus, Plus } from "lucide-react";
import { he } from "@/config/strings";
import { LiveStatsEditableNumber } from "@/components/admin/live-stats/live-stats-editable-number";
import { useLastTap } from "@/components/admin/live-stats/use-last-tap";
import { Button } from "@/components/ui/button";
import {
  appendEvents,
  emptyLiveLine,
  type LiveStatsClientState,
} from "@/lib/live-stats/form-data";
import { eventsForCountingBump, eventsForPointsEdit, eventsForPointsTap } from "@/lib/live-stats/event-log";
import { cn } from "@/lib/utils/cn";
import type { Player } from "@/types/domain";

/** One stat as a column: a big + on top (the frequent tap), the value, and a smaller − underneath. */
function StatColumn({
  label,
  longLabel,
  value,
  onDec,
  onInc,
  disabled,
  flashInc,
  flashDec,
  flashNonce,
}: {
  label: string;
  longLabel: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  disabled: boolean;
  flashInc: boolean;
  flashDec: boolean;
  flashNonce: number;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled}
        aria-label={`${he.admin.statsEntry.increment} ${longLabel}`}
        onClick={onInc}
        className={cn(
          "h-12 w-full px-0",
          flashInc && "motion-safe:animate-tap-pop bg-team/25 ring-2 ring-team/50",
        )}
        key={flashInc ? `inc-${flashNonce}` : "inc"}
      >
        <Plus aria-hidden className="size-5" />
      </Button>
      <span
        key={flashInc || flashDec ? `val-${flashNonce}` : "val"}
        className={cn("num py-0.5 text-xl leading-none font-bold", (flashInc || flashDec) && "motion-safe:animate-tap-tick text-team")}
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || value <= 0}
        aria-label={`${he.admin.statsEntry.decrement} ${longLabel}`}
        onClick={onDec}
        className={cn(
          "w-full border border-border px-0 text-muted",
          flashDec && "motion-safe:animate-tap-pop bg-loss/20 ring-2 ring-loss/40 text-loss",
        )}
        key={flashDec ? `dec-${flashNonce}` : "dec"}
      >
        <Minus aria-hidden />
      </Button>
    </div>
  );
}

export function LiveStatsPlayerPanel({
  player,
  state,
  onChange,
  disabled,
}: {
  player: Player | null;
  state: LiveStatsClientState;
  onChange: (next: LiveStatsClientState) => void;
  disabled: boolean;
}) {
  const { label, flashNonce, announce, isFlashing } = useLastTap();

  if (!player) {
    return <p className="text-sm text-muted">{he.admin.statsEntry.whoPlayedHint}</p>;
  }

  const line = state.lines[player.id] ?? emptyLiveLine(player.id);

  const patchLine = (patch: Partial<typeof line>, events: ReturnType<typeof eventsForPointsTap>, teamDelta = 0) => {
    onChange(
      appendEvents(
        {
          ...state,
          teamScore: Math.max(0, state.teamScore + teamDelta),
          lines: { ...state.lines, [player.id]: { ...line, ...patch } },
        },
        events,
      ),
    );
  };

  const bump = (key: "rebounds" | "assists" | "turnovers" | "steals" | "blocks", delta: number) => {
    const next = Math.max(0, line[key] + delta);
    const applied = next - line[key];
    if (applied === 0) return;
    announce(key, applied, `${key}:${applied > 0 ? "inc" : "dec"}`);
    patchLine({ [key]: next }, eventsForCountingBump(player.id, key, applied));
  };

  /** Player points and team score move together so the sum check stays meaningful. */
  const setPoints = (next: number, source: "tap" | "edit") => {
    const points = Math.max(0, next);
    const delta = points - line.points;
    if (delta === 0) return;
    const events = source === "tap" ? eventsForPointsTap(player.id, delta) : eventsForPointsEdit(player.id, delta);
    announce("points", delta, `points:${delta}`);
    patchLine({ points }, events, delta);
  };

  const stats = [
    { key: "rebounds", label: he.stats.rebounds, longLabel: he.stats.reboundsLong },
    { key: "assists", label: he.stats.assists, longLabel: he.stats.assistsLong },
    { key: "steals", label: he.stats.steals, longLabel: he.stats.stealsLong },
    { key: "blocks", label: he.stats.blocks, longLabel: he.stats.blocksLong },
    { key: "turnovers", label: he.stats.turnovers, longLabel: he.stats.turnoversLong },
  ] as const;

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="flex min-w-0 items-center gap-2 font-display text-base font-bold">
            {player.jerseyNumber != null ? <span className="num text-team">#{player.jerseyNumber}</span> : null}
            <span className="truncate" data-user-content>
              {player.name}
            </span>
          </h2>
          <p
            key={label ? `${label}-${flashNonce}` : "idle"}
            role="status"
            aria-live="polite"
            className={cn(
              "mt-0.5 min-h-5 text-sm font-bold",
              label ? "text-team motion-safe:animate-fade-up" : "text-transparent",
            )}
          >
            {label ?? he.admin.liveStats.lastTap}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs text-muted">{he.stats.points}</span>
          <LiveStatsEditableNumber
            value={line.points}
            label={he.admin.liveStats.editPlayerPoints}
            disabled={disabled}
            onCommit={(n) => setPoints(n, "edit")}
            className={cn(
              "text-2xl leading-none font-black",
              isFlashing("points:1") || isFlashing("points:2") || isFlashing("points:3") || isFlashing("points:-1")
                ? "motion-safe:animate-tap-tick text-team"
                : null,
            )}
          />
        </div>
      </div>
      <div className="mb-3 grid grid-cols-4 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || line.points <= 0}
          onClick={() => setPoints(line.points - 1, "tap")}
          key={isFlashing("points:-1") ? `pts-m1-${flashNonce}` : "pts-m1"}
          className={cn("num", isFlashing("points:-1") && "motion-safe:animate-tap-pop bg-loss/20 ring-2 ring-loss/40")}
        >
          {he.admin.liveStats.subtract1}
        </Button>
        {([1, 2, 3] as const).map((n) => (
          <Button
            key={isFlashing(`points:${n}`) ? `pts-${n}-${flashNonce}` : `pts-${n}`}
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => setPoints(line.points + n, "tap")}
            className={cn(isFlashing(`points:${n}`) && "motion-safe:animate-tap-pop bg-win/25 ring-2 ring-win/50")}
          >
            {he.admin.statsEntry[`add${n}`]}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {stats.map((s) => (
          <StatColumn
            key={s.key}
            label={s.label}
            longLabel={s.longLabel}
            value={line[s.key]}
            disabled={disabled}
            flashInc={isFlashing(`${s.key}:inc`)}
            flashDec={isFlashing(`${s.key}:dec`)}
            flashNonce={flashNonce}
            onDec={() => bump(s.key, -1)}
            onInc={() => bump(s.key, 1)}
          />
        ))}
      </div>
    </section>
  );
}
