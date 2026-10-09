import Image from "next/image";
import type { Media } from "@/types/domain";
import { getPosterUrl, isSvg } from "@/lib/storage/urls";
import { cn } from "@/lib/utils/cn";

interface Props {
  media: Media | null | undefined;
  alt: string;
  fallback?: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  /** Fill the positioned parent instead of using intrinsic dimensions. */
  fill?: boolean;
}

/** next/image wrapper that resolves storage keys, video posters, and local SVG placeholders. */
export function MediaImage({ media, alt, fallback = "/placeholders/action-1.svg", sizes, className, priority, fill = true }: Props) {
  const src = media ? getPosterUrl(media) : fallback;
  return (
    <Image
      src={src}
      alt={alt}
      sizes={sizes}
      fill={fill}
      width={fill ? undefined : (media?.width ?? 1600)}
      height={fill ? undefined : (media?.height ?? 1000)}
      priority={priority}
      quality={70}
      unoptimized={isSvg(src)}
      className={cn("object-cover", className)}
    />
  );
}
