import type { Team } from "@/types/domain";
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

/** Neutral badge for opponents, which have no stored logo. */
export function OpponentBadge({ name, className }: { name: string; className?: string }) {
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
