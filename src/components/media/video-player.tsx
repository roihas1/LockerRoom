"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useState } from "react";
import { he } from "@/config/strings";
import { getMediaUrl, getPosterUrl, isSvg } from "@/lib/storage/urls";
import { cn } from "@/lib/utils/cn";
import type { Media } from "@/types/domain";

/** Poster first; the video element is created only after the user presses play, so no bytes load up front. */
export function VideoPlayer({ media, className, sizes = "(min-width: 768px) 50vw, 100vw" }: { media: Media; className?: string; sizes?: string }) {
  const [playing, setPlaying] = useState(false);
  const src = getMediaUrl(media);
  const poster = getPosterUrl(media);

  if (playing && src) {
    return (
      <video
        className={cn("aspect-video w-full rounded-xl bg-black", className)}
        src={src}
        poster={isSvg(poster) ? undefined : poster}
        controls
        autoPlay
        playsInline
        preload="none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => src && setPlaying(true)}
      className={cn("group relative block aspect-video w-full overflow-hidden rounded-xl bg-surface-2", className)}
      aria-label={src ? he.media.play : he.media.videoPlaceholder}
    >
      <Image src={poster} alt="" fill sizes={sizes} unoptimized={isSvg(poster)} className="object-cover opacity-80 transition-opacity group-hover:opacity-100" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-team text-black shadow-glow transition-transform motion-safe:group-hover:scale-105">
          <Play className="size-7 translate-x-px fill-current" aria-hidden />
        </span>
      </span>
      {!src ? (
        <span className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-center text-xs text-muted">{he.media.videoPlaceholder}</span>
      ) : null}
    </button>
  );
}
