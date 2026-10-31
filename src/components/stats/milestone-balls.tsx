import Link from "next/link";
import { he } from "@/config/strings";
import {
  milestoneStatOrder,
  milestoneTracksForAggregate,
  totalMilestoneBallsAvailable,
  type MilestoneBallLeader,
  type MilestoneTrack,
} from "@/lib/stats/explore-prompts";
import type { PlayerAggregate } from "@/lib/stats/aggregate";
import { seasonTotalThresholds, type MilestoneStat } from "@/lib/stats/milestones";
import { cn } from "@/lib/utils/cn";
import { formatInt } from "@/lib/utils/numbers";
import type { Player } from "@/types/domain";

const statLabel: Record<MilestoneStat, string> = {
  points: he.milestones.stats.points,
  rebounds: he.milestones.stats.rebounds,
  assists: he.milestones.stats.assists,
  steals: he.milestones.stats.steals,
  blocks: he.milestones.stats.blocks,
  threes: he.milestones.stats.threes,
};

function BallDot({ filled, label }: { filled: boolean; label: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-block size-2.5 rounded-full",
        filled ? "bg-team" : "bg-surface-3 ring-1 ring-border",
      )}
    />
  );
}

/** Compact catalog: which thresholds exist (no player data). */
export function MilestoneCatalog({ className }: { className?: string }) {
  return (
    <details className={cn("rounded-xl border border-border bg-surface px-3 py-2 text-sm", className)}>
      <summary className="cursor-pointer font-semibold text-muted marker:text-team">
        {he.statsPage.milestoneBalls.catalogTitle}
      </summary>
      <p className="mt-1 text-xs text-muted">{he.statsPage.milestoneBalls.catalogHint}</p>
      <ul className="mt-2 space-y-1.5">
        {milestoneStatOrder.map((stat) => (
          <li key={stat} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="w-20 shrink-0 text-xs font-semibold">{statLabel[stat]}</span>
            <span className="num text-xs text-muted">{seasonTotalThresholds[stat].map(formatInt).join(" · ")}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Player profile: lean per-stat dots (filled = ball earned) + next target.
 * Intentionally quiet — no cards grid explosion.
 */
export function PlayerMilestoneBalls({ aggregate }: { aggregate: PlayerAggregate }) {
  const tracks = milestoneTracksForAggregate(aggregate);
  const earned = tracks.reduce((n, t) => n + t.earned.length, 0);
  const total = totalMilestoneBallsAvailable();
  const copy = he.statsPage.milestoneBalls;
  const hasAny = earned > 0 || tracks.some((t) => t.current > 0);

  if (!hasAny) {
    return (
      <section>
        <header className="mb-2">
          <h2 className="font-display text-xl font-extrabold md:text-2xl">{copy.playerTitle}</h2>
          <p className="text-xs text-muted">{copy.playerSubtitle}</p>
        </header>
        <p className="text-sm text-muted">{copy.empty}</p>
        <MilestoneCatalog className="mt-3" />
      </section>
    );
  }

  return (
    <section>
      <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-extrabold md:text-2xl">{copy.playerTitle}</h2>
          <p className="text-xs text-muted">{copy.playerSubtitle}</p>
        </div>
        <p className="num text-sm font-bold text-team">{copy.ofTotal(earned, total)}</p>
      </header>

      <ul className="space-y-2.5">
        {tracks.map((track) => (
          <TrackRow key={track.stat} track={track} />
        ))}
      </ul>

      <MilestoneCatalog className="mt-4" />
    </section>
  );
}

function TrackRow({ track }: { track: MilestoneTrack }) {
  const copy = he.statsPage.milestoneBalls;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="w-20 shrink-0 text-xs font-semibold">{statLabel[track.stat]}</span>
      <span className="flex flex-wrap items-center gap-1" aria-label={copy.balls(track.earned.length)}>
        {track.thresholds.map((t) => (
          <BallDot key={t} filled={track.current >= t} label={`${formatInt(t)} ${statLabel[track.stat]}`} />
        ))}
      </span>
      <span className="num ms-auto text-[11px] text-muted">
        {track.next
          ? copy.progressOf(formatInt(track.current), formatInt(track.next))
          : track.earned.length
            ? formatInt(track.current)
            : null}
      </span>
    </li>
  );
}

/** Lean season race for /stats — rank + ball count + next hint. */
export function MilestoneBallsRace({
  leaders,
  playersById,
}: {
  leaders: MilestoneBallLeader[];
  playersById: Map<number, Player>;
}) {
  const copy = he.statsPage.milestoneBalls;
  if (!leaders.length) return null;

  return (
    <section>
      <header className="mb-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold md:text-2xl">
          <span aria-hidden>🏀</span>
          {copy.title}
        </h2>
        <p className="text-xs text-muted">{copy.subtitle}</p>
      </header>

      <ol className="card divide-y divide-border overflow-hidden">
        {leaders.map((row, i) => {
          const player = playersById.get(row.playerId);
          if (!player) return null;
          const nextLabel =
            row.next && row.next.progress !== null
              ? `${formatInt(row.next.next)} ${statLabel[row.next.stat]}`
              : null;
          return (
            <li key={row.playerId}>
              <Link href={`/players/${player.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
                <span className="num w-5 text-xs text-muted">{i + 1}</span>
                <span data-user-content className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {player.name}
                </span>
                {nextLabel ? (
                  <span className="hidden text-[11px] text-muted sm:inline">{copy.next(nextLabel)}</span>
                ) : null}
                <span className="num shrink-0 text-sm font-black text-team" title={copy.balls(row.balls)}>
                  🏀 {copy.ballsShort(row.balls)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      <MilestoneCatalog className="mt-3" />
    </section>
  );
}

/** Tiny chip for the players table. */
export function BallCountChip({ balls }: { balls: number }) {
  if (balls <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-team">
      <span aria-hidden>🏀</span>
      <bdi dir="ltr" className="num">
        {he.statsPage.milestoneBalls.ballsShort(balls)}
      </bdi>
    </span>
  );
}
