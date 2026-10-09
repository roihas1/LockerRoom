import Link from "next/link";
import { Play } from "lucide-react";
import { MediaImage } from "@/components/common/media-image";
import type { Exercise } from "@/types/domain";

export function PlayGrid({ plays }: { plays: Exercise[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {plays.map((play) => (
        <li key={play.id}>
          <Link
            href={`/plays/${play.id}`}
            className="group card flex h-full flex-col overflow-hidden transition-colors hover:border-team/50"
          >
            <div className="relative aspect-square bg-surface-2">
              <MediaImage
                media={play.thumbnail ?? play.image}
                fallback="/placeholders/exercise.svg"
                alt=""
                sizes="(min-width: 1024px) 16vw, 33vw"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
              {play.video ? (
                <Play className="absolute end-2.5 top-2.5 size-5 fill-white text-white drop-shadow" aria-hidden />
              ) : null}
              <p data-user-content className="absolute inset-x-0 bottom-0 p-2.5 font-display text-sm leading-tight font-extrabold text-white">
                {play.title}
              </p>
            </div>
            {play.description ? (
              <p data-user-content className="line-clamp-3 flex-1 p-2.5 text-xs leading-relaxed text-muted group-hover:text-text">
                {play.description}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
