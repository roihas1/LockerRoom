import { he } from "@/config/strings";
import { cn } from "@/lib/utils/cn";

/** Pulsing “שידור חי” chip — same language as the live game page status. */
export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 rounded-full bg-loss/15 px-3 py-1 text-xs font-bold text-loss", className)}
      role="status"
    >
      <span className="relative flex size-2.5" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-loss opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-loss" />
      </span>
      {he.live.badge}
    </span>
  );
}
