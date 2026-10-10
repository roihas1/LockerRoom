import Link from "next/link";
import { MediaImage } from "@/components/common/media-image";
import { SectionHeader } from "@/components/common/section-header";
import { PlayerTag } from "@/components/players/player-tag";
import { he } from "@/config/strings";
import { shameEmoji, type ShameAward, type ShameCategory } from "@/lib/stats/shame";
import { cn } from "@/lib/utils/cn";
import { formatAverage, formatInt, formatPercent } from "@/lib/utils/numbers";
import type { Player } from "@/types/domain";

const shameFormat: Record<ShameCategory, (v: number) => string> = {
  bricks: formatPercent,
  santa: formatAverage,
  trigger: (v) => formatInt(v),
  fouls: formatAverage,
  freeThrows: formatPercent,
  blackHole: formatAverage,
  airball: formatPercent,
  ghost: formatAverage,
  fouledOut: (v) => formatInt(v),
};

const tilts = ["motion-safe:-rotate-1", "motion-safe:rotate-1"];

export function ShameAwards({ awards, playersById }: { awards: ShameAward[]; playersById: Map<number, Player> }) {
  if (!awards.length) return null;
  return (
    <section>
      <SectionHeader title={he.fun.shameTitle} icon={<span aria-hidden>🏆</span>} />
      <p className="-mt-2 mb-3 text-xs text-muted">{he.fun.shameSubtitle}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {awards.map((a, i) => {
          const player = playersById.get(a.playerId);
          const copy = he.fun.shame[a.category];
          return (
            <Link
              key={a.category}
              href={`/players/${a.playerId}`}
              className={cn(
                "card flex items-center gap-3 border-dashed p-4 transition-transform hover:border-warning/60 motion-safe:hover:scale-[1.02] motion-safe:hover:rotate-0",
                tilts[i % tilts.length],
              )}
            >
              <span className="text-4xl motion-safe:animate-wiggle" aria-hidden>
                {shameEmoji[a.category]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display font-extrabold text-warning">{copy.label}</p>
                <p className="flex items-baseline gap-2">
                  <span data-user-content className="truncate font-semibold">
                    {player?.name}
                  </span>
                  <PlayerTag player={player} />
                </p>
                <p className="text-[11px] text-muted">{copy.hint}</p>
              </div>
              <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-surface-3 ring-2 ring-warning/50">
                <MediaImage media={player?.photo} fallback="/placeholders/player.svg" alt={player ? he.media.playerPhoto(player.name) : ""} sizes="48px" />
              </div>
              <bdi dir="ltr" className="num text-xl font-black">
                {shameFormat[a.category](a.value)}
              </bdi>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
