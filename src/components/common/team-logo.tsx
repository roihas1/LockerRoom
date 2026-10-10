import Image from "next/image";
import mark from "@/assets/brand/mark.svg";
import { opponentLogo } from "@/config/opponents";
import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";

/** The app's own mark on a team-color tile; deliberately not the uploaded club crest. */
export function AppMark({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full bg-radial-[at_50%_25%] from-team via-team/60 to-[#081633]",
        className,
      )}
    >
      <Image src={mark} alt={he.media.teamLogo} fill sizes="96px" priority={priority} className="translate-y-[2%] scale-90 object-contain" />
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
