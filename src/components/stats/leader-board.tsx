import Link from "next/link";
import { MediaImage } from "@/components/common/media-image";
import { PlayerTag } from "@/components/players/player-tag";
import { he } from "@/config/strings";
import { leaderMeta } from "@/lib/stats/categories";
import type { LeaderBoard as Board } from "@/lib/stats/leaders";
import { cn } from "@/lib/utils/cn";
import type { Player } from "@/types/domain";

export function LeaderCard({ board, playersById, compact = false }: { board: Board; playersById: Map<number, Player>; compact?: boolean }) {
  const meta = leaderMeta[board.category];
  const [top, ...rest] = board.entries;
  if (!top) return null;
  const leader = playersById.get(top.playerId);
  return (
    <section className="card overflow-hidden">
      <h3 className="flex items-center gap-2 border-b border-border px-4 py-3 font-display font-bold">
        <span aria-hidden>{meta.emoji}</span>
        {meta.label}
      </h3>
      <Link href={`/players/${top.playerId}`} className="flex items-center gap-3 p-4 hover:bg-surface-2">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-surface-3 ring-2 ring-team/60">
          <MediaImage media={leader?.photo} fallback="/placeholders/player.svg" alt={leader ? he.media.playerPhoto(leader.name) : ""} sizes="56px" />
        </div>
        <div className="min-w-0 flex-1">
          <p data-user-content className="truncate font-display text-lg font-extrabold">
            {leader?.name}
          </p>
          <p className="flex items-center gap-2 text-xs text-muted">
            <span className="num">#{leader?.jerseyNumber}</span>
            <PlayerTag player={leader} className="truncate" />
          </p>
        </div>
        <p className="text-end">
          <bdi dir="ltr" className="num block text-3xl leading-none font-black text-team">
            {meta.format(top.value)}
          </bdi>
          <span className="text-[11px] text-muted">{board.category === "threes" ? he.stats.total : he.stats.perGame}</span>
        </p>
      </Link>
      {!compact && rest.length ? (
        <ol className="border-t border-border">
          {rest.map((e, i) => {
            const p = playersById.get(e.playerId);
            return (
              <li key={e.playerId} className={cn("border-border", i > 0 && "border-t")}>
                <Link href={`/players/${e.playerId}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-2">
                  <span className="num w-4 text-muted">{i + 2}</span>
                  <span data-user-content className="flex-1 truncate font-semibold">
                    {p?.name}
                  </span>
                  <bdi dir="ltr" className="num font-bold">
                    {meta.format(e.value)}
                  </bdi>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
