import { cn } from "@/lib/utils/cn";
import type { Player } from "@/types/domain";

export function PlayerTag({ player, className }: { player: Pick<Player, "hashtag"> | null | undefined; className?: string }) {
  if (!player?.hashtag) return null;
  return (
    <bdi data-user-content className={cn("text-xs font-bold whitespace-nowrap text-team", className)}>
      #{player.hashtag}
    </bdi>
  );
}
