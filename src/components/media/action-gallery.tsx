"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { he } from "@/config/strings";
import { getMediaUrl, getPosterUrl, isSvg } from "@/lib/storage/urls";
import { cn } from "@/lib/utils/cn";
import type { Media } from "@/types/domain";
import { VideoPlayer } from "./video-player";

/** Lazy-loaded thumbnail grid of action photos and videos with a swipe-friendly lightbox. */
export function ActionGallery({ media, className, columns = 3 }: { media: Media[]; className?: string; columns?: 2 | 3 | 4 }) {
  const [index, setIndex] = useState<number | null>(null);
  const current = index === null ? null : media[index];

  const go = useCallback(
    (delta: number) => setIndex((i) => (i === null ? i : (i + delta + media.length) % media.length)),
    [media.length],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      // In RTL, ArrowLeft moves forward.
      if (e.key === "ArrowLeft") go(1);
      if (e.key === "ArrowRight") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  return (
    <>
      <ul
        className={cn(
          "grid gap-2",
          media.length === 1 && "grid-cols-1",
          media.length > 1 && columns === 2 && "grid-cols-2",
          media.length > 1 && columns === 3 && "grid-cols-2 sm:grid-cols-3",
          media.length > 1 && columns === 4 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
          className,
        )}
      >
        {media.map((m, i) => {
          const thumb = getPosterUrl(m);
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                className="group relative block aspect-4/3 w-full overflow-hidden rounded-xl bg-surface-2"
                aria-label={m.caption ?? (m.kind === "video" ? he.media.play : he.media.openImage)}
              >
                <Image
                  src={thumb}
                  alt={m.caption ?? ""}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  loading="lazy"
                  quality={70}
                  unoptimized={isSvg(thumb)}
                  className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
                />
                {m.kind === "video" ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <span className="flex size-11 items-center justify-center rounded-full bg-team text-black">
                      <Play className="size-5 fill-current" aria-hidden />
                    </span>
                  </span>
                ) : null}
                {m.caption ? (
                  <span
                    data-user-content
                    className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/80 to-transparent px-2 pt-6 pb-1.5 text-start text-xs font-medium"
                  >
                    {m.caption}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={current !== null && current !== undefined} onOpenChange={(open) => !open && setIndex(null)}>
        {current ? (
          <DialogContent
            title={current.caption ?? he.media.imageOf((index ?? 0) + 1, media.length)}
            description={current.caption ? he.media.imageOf((index ?? 0) + 1, media.length) : undefined}
            className="max-w-[min(96vw,1100px)] p-3 sm:p-4"
          >
            <div className="relative">
              {current.kind === "video" ? (
                <VideoPlayer key={current.id} media={current} />
              ) : (
                <div className="relative h-[min(80dvh,calc(100dvh-8rem))] w-full overflow-hidden rounded-xl bg-black">
                  <Image
                    src={getMediaUrl(current) ?? getPosterUrl(current)}
                    alt={current.caption ?? ""}
                    fill
                    sizes="(min-width: 1024px) 1100px, 96vw"
                    quality={85}
                    unoptimized={isSvg(getPosterUrl(current))}
                    className="object-contain"
                  />
                </div>
              )}
              {media.length > 1 ? (
                <div className="mt-3 flex justify-between">
                  <button type="button" onClick={() => go(-1)} className="rounded-full bg-surface-2 p-2.5 hover:bg-surface-3" aria-label={he.media.prevImage}>
                    <ChevronRight className="size-5" aria-hidden />
                  </button>
                  <button type="button" onClick={() => go(1)} className="rounded-full bg-surface-2 p-2.5 hover:bg-surface-3" aria-label={he.media.nextImage}>
                    <ChevronLeft className="size-5" aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
