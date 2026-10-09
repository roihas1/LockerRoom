import { Badge } from "@/components/ui/badge";
import { gameStatusLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { gameResult } from "@/lib/stats/games";
import type { Game } from "@/types/domain";

export function ResultBadge({ game }: { game: Pick<Game, "status" | "teamScore" | "opponentScore"> }) {
  const result = gameResult(game);
  if (result === "win") return <Badge tone="win">{he.result.win}</Badge>;
  if (result === "loss") return <Badge tone="loss">{he.result.loss}</Badge>;
  if (game.status === "live") return <Badge tone="team">{gameStatusLabels.live}</Badge>;
  if (game.status === "postponed" || game.status === "cancelled") return <Badge tone="warning">{gameStatusLabels[game.status]}</Badge>;
  return <Badge>{gameStatusLabels[game.status]}</Badge>;
}
