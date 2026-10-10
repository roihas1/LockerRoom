import { positionLabels } from "@/config/labels";
import { he } from "@/config/strings";
import { getData } from "@/lib/data";
import { getSeasonContext } from "@/lib/data/season";
import { OG_SIZE, loadImage, renderShareCard } from "@/lib/og/card";
import { aggregateLines } from "@/lib/stats/aggregate";
import { getMediaUrl } from "@/lib/storage/urls";
import { formatAverage } from "@/lib/utils/numbers";
import { parseId } from "@/lib/utils/params";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = he.roster.title;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  const [player, ctx, team] = await Promise.all([id ? getData().getPlayer(id) : null, getSeasonContext(), getData().getTeam()]);
  if (!player) return renderShareCard({ title: team.name, subtitle: he.meta.defaultDescription });

  const agg = aggregateLines(player.id, ctx.lines.filter((l) => l.playerId === player.id));
  const averages =
    agg.gp > 0
      ? `${formatAverage(agg.ppg)} ${he.stats.points} · ${formatAverage(agg.rpg)} ${he.stats.rebounds} · ${formatAverage(agg.apg)} ${he.stats.assists} ${he.stats.perGame}`
      : null;

  return renderShareCard({
    eyebrow: [player.jerseyNumber !== null ? `#${player.jerseyNumber}` : null, player.position ? positionLabels[player.position] : null]
      .filter(Boolean)
      .join(" · "),
    title: player.nickname ? `${player.name} ״${player.nickname}״` : player.name,
    subtitle: averages ?? (player.hashtag ? `#${player.hashtag}` : undefined),
    image: await loadImage(getMediaUrl(player.photo)),
  });
}
