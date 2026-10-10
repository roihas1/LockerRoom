import Link from "next/link";
import { MediaImage } from "@/components/common/media-image";
import { PlayerTag } from "@/components/players/player-tag";
import { he } from "@/config/strings";
import { todayInIsrael } from "@/lib/utils/dates";
import type { Coach, Player } from "@/types/domain";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Rotates daily through players and coaches who have a catchphrase. */
export function QuoteOfDay({ players, coaches }: { players: Player[]; coaches: Coach[] }) {
  const candidates = [
    ...coaches.map((c) => ({ person: c, href: `/coaches/${c.id}` })),
    ...[...players].sort((a, b) => a.id - b.id).map((p) => ({ person: p, href: `/players/${p.id}` })),
  ].filter(({ person }) => person.isActive && person.quote);
  if (!candidates.length) return null;
  const { person, href } = candidates[Math.floor(Date.parse(todayInIsrael()) / DAY_MS) % candidates.length]!;

  return (
    <section aria-label={he.fun.quoteOfDay}>
      <Link href={href} className="group flex items-end gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-surface-3 ring-2 ring-team/60 transition-transform motion-safe:group-hover:-rotate-6">
          <MediaImage media={person.photo} fallback="/placeholders/player.svg" alt={he.media.playerPhoto(person.name)} sizes="64px" />
        </div>
        <div className="card relative flex-1 rounded-es-none p-4 transition-colors group-hover:border-team/50">
          <p className="mb-1 text-xs font-bold text-team">
            <span aria-hidden>💬 </span>
            {he.fun.quoteOfDay}
          </p>
          <p data-user-content className="font-display text-lg leading-snug font-extrabold md:text-xl">
            {person.quote}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
            <span data-user-content>— {person.nickname ?? person.name}</span>
            <PlayerTag player={person} />
          </p>
        </div>
      </Link>
    </section>
  );
}
