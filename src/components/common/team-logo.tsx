import Image from "next/image";
import type { Team } from "@/types/domain";
import { opponentLogo } from "@/config/opponents";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";
import { MediaImage } from "./media-image";

export function TeamLogo({ team, className, priority }: { team: Pick<Team, "logo">; className?: string; priority?: boolean }) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-full", className)}>
      <MediaImage media={team.logo} fallback="/placeholders/logo.svg" alt={he.media.teamLogo} sizes="96px" priority={priority} />
    </span>
  );
}

/** League logo when the opponent is known, otherwise a neutral initial badge. */
export function OpponentBadge({ name, className }: { name: string; className?: string }) {
  const logo = opponentLogo(name);
  if (logo) {
    return (
      <span aria-hidden className={cn("relative block shrink-0 overflow-hidden rounded-full bg-white", className)}>
        <Image src={logo} alt="" fill sizes="96px" quality={70} className="object-contain p-[12%]" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-3 font-display font-black text-muted",
        className,
      )}
    >
      {name.trim().charAt(0)}
    </span>
  );
}
