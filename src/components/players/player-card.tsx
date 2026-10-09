import Link from "next/link";
import { MediaImage } from "@/components/common/media-image";
import { positionLabels } from "@/config/labels";
import { he } from "@/config/strings";
import type { Player } from "@/types/domain";

/** Trading-card style roster tile. */
export function PlayerCard({ player, priority }: { player: Player; priority?: boolean }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="group card relative block overflow-hidden transition-transform motion-safe:hover:-translate-y-1 hover:border-team/50"
    >
      <div className="relative aspect-4/5 bg-surface-2">
        <MediaImage
          media={player.photo}
          fallback="/placeholders/player.svg"
          alt={he.media.playerPhoto(player.name)}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          className="transition-transform duration-500 motion-safe:group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/10 to-transparent" />
        {player.jerseyNumber !== null ? (
          <span className="num pointer-events-none absolute end-3 top-1 text-6xl font-black text-white/15">{player.jerseyNumber}</span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-center gap-2">
            {player.jerseyNumber !== null ? (
              <span className="num rounded-md bg-team px-1.5 py-0.5 text-sm font-black text-black">#{player.jerseyNumber}</span>
            ) : null}
            {player.position ? <span className="text-xs font-semibold text-white/80">{positionLabels[player.position]}</span> : null}
          </div>
          <p data-user-content className="mt-1 font-display text-lg leading-tight font-extrabold">
            {player.name}
          </p>
          {player.nickname ? (
            <p data-user-content className="text-xs text-team-2">
              ״{player.nickname}״
            </p>
          ) : null}
        </div>
      </div>
      {player.description ? (
        <p data-user-content className="line-clamp-2 p-3 text-xs text-muted">
          {player.description}
        </p>
      ) : null}
    </Link>
  );
}
