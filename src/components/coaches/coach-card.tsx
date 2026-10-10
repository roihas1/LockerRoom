import Link from "next/link";
import { MediaImage } from "@/components/common/media-image";
import { PlayerTag } from "@/components/players/player-tag";
import { he } from "@/config/strings";
import type { Coach } from "@/types/domain";

/** Wide clipboard-style tile, so the staff reads differently from the player trading cards. */
export function CoachCard({ coach }: { coach: Coach }) {
  return (
    <Link
      href={`/coaches/${coach.id}`}
      className="group card relative flex overflow-hidden transition-transform hover:border-team/50 motion-safe:hover:-translate-y-1 motion-safe:hover:rotate-1"
    >
      <div className="relative w-28 shrink-0 bg-surface-2 sm:w-36">
        <MediaImage
          media={coach.photo}
          fallback="/placeholders/player.svg"
          alt={he.media.playerPhoto(coach.name)}
          sizes="144px"
          className="transition-transform duration-500 motion-safe:group-hover:scale-105"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
        <span className="text-xs font-bold text-team">
          <span aria-hidden>📋 </span>
          <span data-user-content>{coach.role ?? he.roster.coach}</span>
        </span>
        <p data-user-content className="font-display text-xl leading-tight font-extrabold">
          {coach.name}
        </p>
        {coach.nickname || coach.hashtag ? (
          <p className="flex flex-wrap items-center gap-x-2 text-xs">
            {coach.nickname ? <span data-user-content className="text-team-2">״{coach.nickname}״</span> : null}
            <PlayerTag player={coach} />
          </p>
        ) : null}
        {coach.quote ? (
          <p className="mt-1 rounded-xl rounded-ss-none bg-surface-2 px-3 py-2 text-xs font-semibold">
            <span aria-hidden>💬 </span>
            <span data-user-content>{coach.quote}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
