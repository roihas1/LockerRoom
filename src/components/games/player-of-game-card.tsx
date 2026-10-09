import Link from "next/link";
import { MediaImage } from "@/components/common/media-image";
import { positionLabels } from "@/config/labels";
import { he } from "@/config/strings";
import type { Player, StatLine } from "@/types/domain";

export function PlayerOfGameCard({ player, line, note }: { player: Player; line: StatLine | undefined; note: string | null }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="card group relative flex overflow-hidden shadow-glow transition-transform motion-safe:hover:-translate-y-0.5"
    >
      <div className="relative w-32 shrink-0 bg-surface-2 sm:w-40">
        <MediaImage media={player.photo} fallback="/placeholders/player.svg" alt={he.media.playerPhoto(player.name)} sizes="160px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4">
        <span className="text-xs font-bold tracking-wide text-team">⭐ {he.games.playerOfGame}</span>
        <p className="flex items-baseline gap-2">
          <span className="num text-2xl font-black text-team/80">#{player.jerseyNumber}</span>
          <span data-user-content className="truncate font-display text-xl font-extrabold">
            {player.name}
          </span>
        </p>
        {player.position ? <span className="text-xs text-muted">{positionLabels[player.position]}</span> : null}
        {line ? (
          <p className="num flex flex-wrap gap-x-3 text-sm font-bold">
            <span>
              {line.points} {he.stats.points}
            </span>
            <span>
              {line.rebounds} {he.stats.rebounds}
            </span>
            <span>
              {line.assists} {he.stats.assists}
            </span>
            {line.blocks ? (
              <span>
                {line.blocks} {he.stats.blocks}
              </span>
            ) : null}
          </p>
        ) : null}
        {note ? (
          <p data-user-content className="text-sm text-muted">
            {note}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
