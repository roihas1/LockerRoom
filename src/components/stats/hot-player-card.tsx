import Link from "next/link";
import { MediaImage } from "@/components/common/media-image";
import { PlayerTag } from "@/components/players/player-tag";
import { he } from "@/config/strings";
import type { HotPlayerResult } from "@/lib/stats/trends";
import { formatAverage } from "@/lib/utils/numbers";
import type { Player } from "@/types/domain";

export function HotPlayerCard({
  hot,
  player,
  compact = false,
}: {
  hot: HotPlayerResult;
  player: Player | undefined;
  compact?: boolean;
}) {
  if (!player) return null;

  return (
    <section className="card overflow-hidden border-team/40 bg-linear-to-l from-team/15 via-transparent to-transparent">
      <header className="border-b border-border/60 px-4 py-3">
        <p className="text-sm text-muted">{he.statsPage.hotPlayer.subtitle}</p>
      </header>
      <Link href={`/players/${player.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-2/60">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-surface-3 ring-2 ring-team/70">
          <MediaImage
            media={player.photo}
            fallback="/placeholders/player.svg"
            alt={he.media.playerPhoto(player.name)}
            sizes="64px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p data-user-content className="truncate font-display text-xl font-extrabold">
            {player.name}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            {player.jerseyNumber !== null ? <span className="num">#{player.jerseyNumber}</span> : null}
            <PlayerTag player={player} className="truncate" />
            <span>{he.statsPage.hotPlayer.windowHint(hot.gamesPlayed, hot.windowGames)}</span>
          </p>
          {!compact ? (
            <p className="mt-1 text-sm font-semibold text-team">{he.statsPage.hotPlayer.toPlayer}</p>
          ) : null}
        </div>
        <p className="text-end">
          <bdi dir="ltr" className="num block text-3xl leading-none font-black text-team">
            {formatAverage(hot.avgPir)}
          </bdi>
          <span className="text-[11px] text-muted">{he.stats.pir}</span>
        </p>
      </Link>
      <dl className="grid grid-cols-3 gap-px border-t border-border bg-border/40 text-center text-sm">
        <div className="bg-surface px-2 py-3">
          <dt className="text-[11px] text-muted">{he.stats.pointsLong}</dt>
          <dd className="num font-bold">{formatAverage(hot.avgPoints)}</dd>
        </div>
        <div className="bg-surface px-2 py-3">
          <dt className="text-[11px] text-muted">{he.stats.reboundsLong}</dt>
          <dd className="num font-bold">{formatAverage(hot.avgRebounds)}</dd>
        </div>
        <div className="bg-surface px-2 py-3">
          <dt className="text-[11px] text-muted">{he.stats.assistsLong}</dt>
          <dd className="num font-bold">{formatAverage(hot.avgAssists)}</dd>
        </div>
      </dl>
    </section>
  );
}
